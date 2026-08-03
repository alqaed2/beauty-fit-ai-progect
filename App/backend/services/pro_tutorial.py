"""Pro tutorial generation service (fast path).

Strategy:
  1. Tutorial content (tools, step-by-step, pro tips) comes directly from the
     pre-parsed BeautyFit `.docx` style guides — no LLM needed for this.
  2. The LLM (DeepSeek-v3.2, cheap + fast) is used ONLY for a lightweight
     personalization layer: picking the best-fitting sub-style for this user
     and writing a short "why this suits you" paragraph.
  3. Color palette is a hard-coded lookup per sub-style.
  4. Automatic API Key Rotation + Multi-Model Fallback Cascade for Gemini image generation
     to bypass 429 quota limits smoothly while maintaining highest possible image quality.

This typically replies in ~3–10 seconds, versus 30–90s with the previous
"LLM generates everything" approach.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional

from PIL import Image

from schemas.aihub import ChatMessage, GenImgRequest, GenTxtRequest
from services.style_prompts import get_prompt as get_style_prompt
from schemas.pro_tutorial import (
    ProTutorialRequest,
    ProTutorialResponse,
    SubStyle,
    TutorialStep,
)
from services.aihub import AIHubService
from services.style_guide_parser import find_sub_style, get_style_entry
from services.style_palettes import (
    get_palette_for_style,
    get_palette_for_sub_style,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Gemini Key Manager & Multi-Model Fallback Cascade
# ---------------------------------------------------------------------------

class GeminiKeyManager:
    """Manages rotation of multiple Gemini API keys to handle rate limits and 429 errors seamlessly."""
    def __init__(self):
        raw_keys = os.getenv("GEMINI_API_KEYS", "")
        self.keys: List[str] = [k.strip() for k in raw_keys.split(",") if k.strip()]
        
        # Fallback to single legacy GEMINI_API_KEY if GEMINI_API_KEYS is not set
        if not self.keys:
            single_key = os.getenv("GEMINI_API_KEY")
            if single_key:
                self.keys.append(single_key.strip())
                
        self.current_index = 0
        logger.info("[GeminiKeyManager] Initialized with %d API key(s).", len(self.keys))

    def get_current_key(self) -> Optional[str]:
        if not self.keys:
            return None
        return self.keys[self.current_index]

    def rotate_key(self) -> Optional[str]:
        if len(self.keys) <= 1:
            logger.warning("[GeminiKeyManager] Rotation requested but only 1 or 0 keys configured.")
            return self.get_current_key()

        prev_index = self.current_index
        self.current_index = (self.current_index + 1) % len(self.keys)
        logger.info("[GeminiKeyManager] 429 Limit Hit! Rotated API Key: Index [%d] -> [%d]", prev_index, self.current_index)
        return self.get_current_key()

    def get_total_keys_count(self) -> int:
        return len(self.keys)


gemini_key_manager = GeminiKeyManager()

# Ordered list of models from highest quality/capability to lowest fallback
PREFERED_IMAGE_MODELS: List[str] = [
    "gemini-2.5-flash",       # Top tier: Highest quality & accuracy
    "gemini-3.5-flash",       # High tier: Excellent speed & quality
    "gemini-1.5-flash",       # Standard tier: High reliability backup
]


STYLE_DISPLAY = {
    "sweet": "Sweet",
    "natural": "Natural",
    "sexy": "Sexy",
    "androgynous": "Androgynous",
    "elegant": "Elegant",
    "mature": "Mature / Powerful",
    "powerful": "Mature / Powerful",
}


def _clean_image_url(raw_image: Optional[Any]) -> Optional[str]:
    """Helper to ensure image URLs or Base64 data strings are valid and non-empty.
    Prevents returning empty base64 strings or unparsed dict payloads.
    """
    if not raw_image:
        return None
        
    # Handle dict response formats if images are returned as dicts
    if isinstance(raw_image, dict):
        raw_image = raw_image.get("url") or raw_image.get("b64_json") or raw_image.get("data")
        
    if not isinstance(raw_image, str):
        return None
    
    cleaned = raw_image.strip()
    if not cleaned:
        return None
        
    # Check if base64 data URI has actual payload after header
    if cleaned.startswith("data:image/"):
        parts = cleaned.split(",", 1)
        if len(parts) < 2 or not parts[1].strip() or len(parts[1].strip()) < 100:
            logger.warning("[pro_tutorial] Discarded empty or malformed base64 image payload")
            return None
        return cleaned

    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned

    # Raw base64 string provided without prefix
    if len(cleaned) > 100:
        return f"data:image/jpeg;base64,{cleaned}"

    return None


# ---------------------------------------------------------------------------
# Lightweight personalization (LLM)
# ---------------------------------------------------------------------------

PERSONALIZATION_SYSTEM = (
    "You are a senior professional makeup artist. Given a user's facial profile "
    "and the candidate sub-styles within a target makeup style, pick the ONE "
    "sub-style that best fits the user, and write a short, warm personalized "
    "explanation. Always return STRICT JSON — no markdown, no prose outside JSON."
)


def _personalization_schema(sub_names: List[str]) -> str:
    options = " | ".join(f'"{n}"' for n in sub_names) if sub_names else '"..."'
    return (
        "Return a JSON object with EXACTLY these fields:\n"
        "{\n"
        '  "overview": "2-3 sentences describing the style for this user at a high level",\n'
        '  "personalized_analysis": "4-6 sentences connecting the user\'s face shape, '
        "eye tags, facial tags and key metrics to why this style works for them and "
        "which sub-style suits them best\",\n"
        f'  "recommended_sub_style": one of [{options}]\n'
        "}\n"
        "Do not include any other fields."
    )


def _build_personalization_prompt(
    req: ProTutorialRequest, sub_names: List[str]
) -> str:
    display = STYLE_DISPLAY.get(req.style.lower(), req.style.title())
    lines: List[str] = []
    lines.append(f"Target style: {display}")
    if req.score is not None:
        lines.append(f"User's match score for this style: {req.score}/100")
    if req.face_shape:
        lines.append(f"Face shape: {req.face_shape}")
    if req.eye_tags:
        lines.append(f"Eye traits: {', '.join(req.eye_tags)}")
    if req.facial_tags:
        lines.append(f"Facial traits: {', '.join(req.facial_tags)}")
    if req.metrics:
        short = {
            k: (round(v, 3) if isinstance(v, (int, float)) else v)
            for k, v in list(req.metrics.items())[:14]
        }
        lines.append(f"Key metrics: {json.dumps(short)}")

    candidates = "\n".join(f"- {n}" for n in sub_names) if sub_names else "(none)"

    return (
        f"USER FACIAL PROFILE:\n" + "\n".join(lines) + "\n\n"
        f"CANDIDATE SUB-STYLES WITHIN {display}:\n{candidates}\n\n"
        "TASK: Pick the single best-matching sub-style for this user and write "
        "the personalization text.\n\n"
        f"OUTPUT FORMAT:\n{_personalization_schema(sub_names)}"
    )


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.+?)\s*```", re.DOTALL)


def _extract_json(text: str) -> Dict[str, Any]:
    if not text:
        raise ValueError("Empty model response")
    candidate = text.strip()
    m = _JSON_FENCE_RE.search(candidate)
    if m:
        candidate = m.group(1).strip()
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = candidate[start : end + 1]
    return json.loads(candidate)


def _extract_content(raw: Any) -> str:
    try:
        if hasattr(raw, "content") and isinstance(getattr(raw, "content"), str):
            return str(raw.content)
        if hasattr(raw, "model_dump"):
            dumped = raw.model_dump()
            if isinstance(dumped, dict) and isinstance(dumped.get("content"), str):
                return dumped["content"]
            if isinstance(dumped, dict) and dumped.get("choices"):
                msg = (dumped["choices"][0] or {}).get("message") or {}
                if msg.get("content"):
                    return str(msg["content"])
        if isinstance(raw, dict):
            if isinstance(raw.get("content"), str):
                return raw["content"]
            choices = raw.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                if msg.get("content"):
                    return str(msg["content"])
        if hasattr(raw, "choices"):
            choices = raw.choices
            if choices:
                msg = getattr(choices[0], "message", None)
                if msg is not None:
                    return str(getattr(msg, "content", "") or "")
        if isinstance(raw, str):
            return raw
    except Exception as exc:
        logger.warning("Failed to extract LLM content: %s", exc)
    return ""


async def _personalize(
    req: ProTutorialRequest, sub_names: List[str]
) -> Dict[str, Any]:
    messages = [
        ChatMessage(role="system", content=PERSONALIZATION_SYSTEM),
        ChatMessage(
            role="user", content=_build_personalization_prompt(req, sub_names)
        ),
    ]
    gentxt_req = GenTxtRequest(
        messages=messages,
        model="deepseek-v3.2",
        stream=False,
    )
    service = AIHubService()
    try:
        raw = await asyncio.wait_for(service.gentxt(gentxt_req), timeout=30.0)
    except asyncio.TimeoutError:
        logger.warning("[pro_tutorial] personalization TIMEOUT after 30s")
        return {}
    except Exception as exc:
        logger.exception("[pro_tutorial] personalization gentxt failed: %s", exc)
        return {}

    content = _extract_content(raw)
    if not content:
        return {}

    try:
        return _extract_json(content)
    except Exception as exc:
        logger.warning("[pro_tutorial] personalization JSON parse failed: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------


def _default_personalization(req: ProTutorialRequest, sub_names: List[str]) -> Dict[str, Any]:
    display = STYLE_DISPLAY.get(req.style.lower(), req.style.title())
    recommended = sub_names[0] if sub_names else None
    return {
        "overview": (
            f"A polished {display} look designed to flatter your natural features "
            "and bring out your strengths."
        ),
        "personalized_analysis": (
            f"Based on your {req.face_shape or 'facial'} structure"
            + (
                f" and features like {', '.join((req.facial_tags or [])[:3])}"
                if req.facial_tags
                else ""
            )
            + f", a {display.lower()} approach works well. We recommend starting with "
            + (recommended or "the most classic sub-style")
            + " as a strong baseline you can adapt over time."
        ),
        "recommended_sub_style": recommended,
    }


def _sub_style_summary(sub: Dict[str, Any]) -> str:
    steps = sub.get("steps") or []
    if not steps:
        return ""
    first_body = str(steps[0].get("body", ""))
    first_sentence = re.split(r"(?<=[.!?])\s+", first_body, maxsplit=1)[0]
    return first_sentence[:200]


def _best_for_text(sub: Dict[str, Any]) -> str:
    tools = sub.get("tools") or []
    if not tools:
        return ""
    sample = tools[0]
    return f"Recommended toolkit: {sample[:120]}"


def _build_steps(sub: Dict[str, Any]) -> List[TutorialStep]:
    tools: List[str] = list(sub.get("tools") or [])
    steps_raw: List[Dict[str, str]] = list(sub.get("steps") or [])

    distributed: List[List[str]] = [[] for _ in steps_raw]
    if tools and steps_raw:
        for i, tool in enumerate(tools):
            distributed[i % len(steps_raw)].append(tool)

    out: List[TutorialStep] = []
    for idx, s in enumerate(steps_raw):
        title = str(s.get("title", f"Step {idx + 1}")).strip()
        body = str(s.get("body", "")).strip()
        parts = re.split(r"(?<=[.!?])\s+", body, maxsplit=1)
        description = parts[0] if parts else body
        technique = parts[1] if len(parts) > 1 else ""
        products = distributed[idx] if idx < len(distributed) else []
        out.append(
            TutorialStep(
                title=title,
                description=description,
                technique=technique,
                products=products[:4],
            )
        )
    return out


def _fallback_response(style: str) -> ProTutorialResponse:
    display = STYLE_DISPLAY.get(style.lower(), style.title())
    return ProTutorialResponse(
        style=style,
        overview=f"A polished {display} look tailored to your features.",
        personalized_analysis=(
            "We couldn't load the full guide this time, but here is a solid "
            f"{display} baseline you can follow."
        ),
        steps=[
            TutorialStep(
                title="Base & Skin",
                description="Even out the complexion with a finish suited to the style.",
                technique="Apply thin layers and build only where needed.",
                products=["Lightweight foundation", "Concealer"],
            ),
            TutorialStep(
                title="Eyes",
                description="Define the eyes in line with the style's signature shape.",
                technique="Blend transitions softly; focus intensity on the outer third.",
                products=["Neutral eyeshadow palette", "Mascara"],
            ),
            TutorialStep(
                title="Cheeks",
                description="Add dimension with blush and subtle contour.",
                technique="Apply blush on the apples and sweep contour under the cheekbone.",
                products=["Cream blush", "Cool-toned contour"],
            ),
            TutorialStep(
                title="Lips",
                description="Finish with a lip color that reinforces the mood.",
                technique="Line the lips first, then fill in and blot for longevity.",
                products=["Lip liner", "Lipstick"],
            ),
        ],
        sub_styles=[],
        recommended_sub_style=None,
        color_palette=get_palette_for_style(style),
        pro_tips=[
            "Set your base only where you tend to get oily.",
            "Warm cream products between your fingers before applying.",
            "Finish with a light mist of setting spray for a natural glow.",
        ],
        simulation_prompt=(
            "Close-up portrait photograph, soft natural studio light, polished "
            f"{display.lower()} makeup look, clean complexion, refined features, "
            "balanced colors, elegant mood."
        ),
        image=None,
        images={},
    )


async def generate_pro_tutorial(req: ProTutorialRequest) -> ProTutorialResponse:
    """Assemble a Pro tutorial from pre-parsed docx content + lightweight LLM + image generation."""
    t0 = time.monotonic()

    entry = get_style_entry(req.style)
    if not entry or not entry["sub_styles"]:
        logger.warning(
            "[pro_tutorial] no catalog entry for style=%s — using fallback", req.style
        )
        res = _fallback_response(req.style)
        if req.image:
            try:
                img_data = await stylize_user_photo(req.style, req.sub_style, req.image)
                valid_img = _clean_image_url(img_data)
                res.image = valid_img
                res.images = {"overall": valid_img} if valid_img else {}
            except Exception as exc:
                logger.warning("[pro_tutorial] fallback image gen failed: %s", exc)
        return res

    sub_styles_raw = entry["sub_styles"]
    sub_names: List[str] = [s["name"] for s in sub_styles_raw]

    logger.info(
        "[pro_tutorial] start style=%s sub_styles=%d", req.style, len(sub_names)
    )

    # 1. Ask the LLM ONLY for the personalization layer.
    personalization = await _personalize(req, sub_names)
    if not personalization:
        personalization = _default_personalization(req, sub_names)
        logger.info(
            "[pro_tutorial] using default personalization (LLM unavailable/failed)"
        )

    recommended_name: Optional[str] = personalization.get("recommended_sub_style")
    if not recommended_name or recommended_name not in sub_names:
        if sub_names:
            lower = (recommended_name or "").lower()
            match = next(
                (n for n in sub_names if n.lower().startswith(lower[:6])),
                sub_names[0],
            )
            recommended_name = match

    chosen = find_sub_style(req.style, recommended_name) if recommended_name else None
    if chosen is None:
        chosen = sub_styles_raw[0]
        recommended_name = chosen["name"]

    # 2. Build step-by-step content.
    steps = _build_steps(chosen)
    pro_tips = list(chosen.get("pro_tips") or [])

    # 3. Build sub-styles list.
    sub_styles: List[SubStyle] = []
    for sub in sub_styles_raw:
        sub_styles.append(
            SubStyle(
                name=sub["name"],
                summary=_sub_style_summary(sub),
                best_for=_best_for_text(sub),
            )
        )

    # 4. Hard-coded color palette.
    palette = get_palette_for_sub_style(recommended_name or "")

    # 5. Image Generation (Stylize embedded in tutorial)
    generated_image: Optional[str] = None
    if req.image:
        try:
            target_sub = req.sub_style or recommended_name
            raw_img = await stylize_user_photo(
                style=req.style,
                sub_style=target_sub,
                image=req.image,
            )
            generated_image = _clean_image_url(raw_img)
        except Exception as exc:
            logger.warning("[pro_tutorial] image stylize failed during tutorial generation: %s", exc)

    elapsed = time.monotonic() - t0
    logger.info(
        "[pro_tutorial] done style=%s chosen=%s elapsed=%.2fs",
        req.style,
        recommended_name,
        elapsed,
    )

    return ProTutorialResponse(
        style=req.style,
        overview=str(personalization.get("overview", "")).strip()
        or f"A tailored {STYLE_DISPLAY.get(req.style.lower(), req.style.title())} look for you.",
        personalized_analysis=str(
            personalization.get("personalized_analysis", "")
        ).strip()
        or _default_personalization(req, sub_names)["personalized_analysis"],
        steps=steps or _fallback_response(req.style).steps,
        sub_styles=sub_styles,
        recommended_sub_style=recommended_name,
        color_palette=palette,
        pro_tips=pro_tips[:6],
        simulation_prompt="",
        image=generated_image,
        images={"overall": generated_image} if generated_image else {},
    )

# ---------------------------------------------------------------------------
# Stylize: img2img makeup transformation for the Pro report.
# ---------------------------------------------------------------------------

_STYLIZE_MAX_EDGE = 1024
_STYLIZE_TIMEOUT_SECONDS = 180.0


def _downscale_data_uri(data_uri: str, max_edge: int = _STYLIZE_MAX_EDGE) -> str:
    try:
        if not data_uri.startswith("data:image/"):
            return data_uri
        header, _, b64 = data_uri.partition(",")
        if not b64:
            return data_uri
        raw = base64.b64decode(b64)
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            w, h = im.size
            long_edge = max(w, h)
            if long_edge <= max_edge:
                return data_uri
            scale = max_edge / float(long_edge)
            new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
            rgb = im.convert("RGB")
            rgb = rgb.resize(new_size, Image.LANCZOS)
            out_buf = io.BytesIO()
            rgb.save(out_buf, format="JPEG", quality=90, optimize=True)
            out_b64 = base64.b64encode(out_buf.getvalue()).decode("ascii")
            logger.info(
                "[stylize] downscaled input %dx%d (%.1fKB) -> %dx%d (%.1fKB)",
                w,
                h,
                len(raw) / 1024,
                new_size[0],
                new_size[1],
                len(out_buf.getvalue()) / 1024,
            )
            return f"data:image/jpeg;base64,{out_b64}"
    except Exception as exc:
        logger.warning("[stylize] downscale failed, using original: %s", exc)
        return data_uri


async def stylize_user_photo(
    style: str,
    sub_style: Optional[str],
    image: str,
) -> Optional[str]:
    """Generate a stylized version of the user's photo using a Multi-Model Cascade
    and Smart Key Rotation to guarantee high availability and image quality.
    """
    if not image or not isinstance(image, str):
        raise ValueError("image is required and must be a string.")
    image_stripped = image.strip()
    if not (
        image_stripped.startswith("data:image/")
        or image_stripped.startswith("http://")
        or image_stripped.startswith("https://")
    ):
        raise ValueError(
            "image must be a base64 data URI (data:image/...;base64,...) "
            "or an http(s) URL."
        )

    prompt = get_style_prompt(style, sub_style)
    if not prompt:
        raise ValueError(
            f"No stylize prompt found for style={style!r} sub_style={sub_style!r}."
        )

    t0 = time.monotonic()
    if image_stripped.startswith("data:image/"):
        image_stripped = _downscale_data_uri(image_stripped)

    service = AIHubService()
    total_keys = max(gemini_key_manager.get_total_keys_count(), 1)

    # Multi-Model Cascade: Try best models first, fall back to next if all keys fail
    for model_idx, target_model in enumerate(PREFERED_IMAGE_MODELS):
        logger.info(
            "[stylize] Attempting Model [%d/%d]: %s",
            model_idx + 1,
            len(PREFERED_IMAGE_MODELS),
            target_model,
        )

        req = GenImgRequest(
            prompt=prompt,
            image=image_stripped,
            model=target_model,
            size="1024x1024",
            n=1,
        )

        # Try all configured API keys for current model
        for attempt in range(total_keys):
            active_key = gemini_key_manager.get_current_key()
            
            try:
                # Compatibility check for AIHubService method signature
                if hasattr(service, "genimg_with_key"):
                    resp = await asyncio.wait_for(
                        service.genimg_with_key(req, api_key=active_key),
                        timeout=_STYLIZE_TIMEOUT_SECONDS
                    )
                else:
                    # Dynamically set active key into environment or service context if needed
                    if active_key:
                        os.environ["GEMINI_API_KEY"] = active_key
                    resp = await asyncio.wait_for(
                        service.genimg(req),
                        timeout=_STYLIZE_TIMEOUT_SECONDS
                    )

                if not resp or not getattr(resp, "images", None) or not resp.images:
                    raise RuntimeError(f"Model {target_model} returned no images.")

                raw_image_data = resp.images[0]
                cleaned_url = _clean_image_url(raw_image_data)
                
                if not cleaned_url:
                    raise RuntimeError("Returned image payload is invalid or empty.")

                elapsed = time.monotonic() - t0
                logger.info(
                    "[stylize] SUCCESS! model=%s style=%s elapsed=%.2fs (key_index=%d)",
                    target_model,
                    style,
                    elapsed,
                    gemini_key_manager.current_index,
                )
                return cleaned_url

            except asyncio.TimeoutError:
                logger.warning(
                    "[stylize] Timeout (%ss) with model=%s key_index=%d. Retrying...",
                    int(_STYLIZE_TIMEOUT_SECONDS),
                    target_model,
                    gemini_key_manager.current_index,
                )

            except Exception as exc:
                msg = str(exc).lower()
                is_rate_limit = (
                    "429" in msg 
                    or "resource_exhausted" in msg 
                    or "quota" in msg 
                    or "rate limit" in msg
                )

                if is_rate_limit:
                    logger.warning(
                        "[stylize] Quota 429 on model=%s key_index=%d. Rotating key...",
                        target_model,
                        gemini_key_manager.current_index,
                    )
                    gemini_key_manager.rotate_key()
                    await asyncio.sleep(0.3)
                    continue

                if "insufficient_ai_balance" in msg or "insufficient ai balance" in msg:
                    raise RuntimeError("AI credits balance exhausted.") from exc

                logger.warning(
                    "[stylize] Error on model=%s with key_index=%d: %s",
                    target_model,
                    gemini_key_manager.current_index,
                    exc,
                )

        logger.warning(
            "[stylize] All keys exhausted for Model [%s]. Falling back to next tier model...",
            target_model,
        )

    raise RuntimeError("All models and API keys have been exhausted without success.")
