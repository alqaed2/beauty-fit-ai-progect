"""Pro tutorial generation service (fast path).

Strategy:
  1. Tutorial content (tools, step-by-step, pro tips) comes directly from the
     pre-parsed BeautyFit `.docx` style guides — no LLM needed for this.
  2. The LLM (DeepSeek-v3.2, cheap + fast) is used ONLY for a lightweight
     personalization layer: picking the best-fitting sub-style for this user
     and writing a short "why this suits you" paragraph.
  3. Color palette is a hard-coded lookup per sub-style.

This typically replies in ~3–10 seconds, versus 30–90s with the previous
"LLM generates everything" approach.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
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


STYLE_DISPLAY = {
    "sweet": "Sweet",
    "natural": "Natural",
    "sexy": "Sexy",
    "androgynous": "Androgynous",
    "elegant": "Elegant",
    "mature": "Mature / Powerful",
    "powerful": "Mature / Powerful",
}


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
    """Extract the text content from any of the gentxt response shapes we've seen.

    Known shapes:
      - `GenTxtResponse` pydantic model with a plain `.content` attribute
        (this is what Atoms AIHubService returns).
      - OpenAI-style dict with `choices[0].message.content`.
      - OpenAI-style object with `.choices[0].message.content`.
      - Plain string.
    """
    try:
        # Atoms GenTxtResponse (pydantic)
        if hasattr(raw, "content") and isinstance(getattr(raw, "content"), str):
            return str(raw.content)
        # Pydantic models with model_dump
        if hasattr(raw, "model_dump"):
            dumped = raw.model_dump()
            if isinstance(dumped, dict) and isinstance(dumped.get("content"), str):
                return dumped["content"]
            if isinstance(dumped, dict) and dumped.get("choices"):
                msg = (dumped["choices"][0] or {}).get("message") or {}
                if msg.get("content"):
                    return str(msg["content"])
        # OpenAI-style dict
        if isinstance(raw, dict):
            if isinstance(raw.get("content"), str):
                return raw["content"]
            choices = raw.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                if msg.get("content"):
                    return str(msg["content"])
        # OpenAI-style object
        if hasattr(raw, "choices"):
            choices = raw.choices  # type: ignore[attr-defined]
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
    """Call DeepSeek for a lightweight personalization pass.

    Returns a dict with overview/personalized_analysis/recommended_sub_style or
    an empty dict on any failure (caller handles fallback).
    """
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
    """Short 1-2 sentence summary pulled from the first tutorial step, if any."""
    steps = sub.get("steps") or []
    if not steps:
        return ""
    first_body = str(steps[0].get("body", ""))
    # Keep first sentence, capped at 200 chars.
    first_sentence = re.split(r"(?<=[.!?])\s+", first_body, maxsplit=1)[0]
    return first_sentence[:200]


def _best_for_text(sub: Dict[str, Any]) -> str:
    """Pick a concise 'best for' blurb from the tools/steps text (fallback only)."""
    tools = sub.get("tools") or []
    if not tools:
        return ""
    # Most guides list defining items first; summarize in one short line.
    sample = tools[0]
    return f"Recommended toolkit: {sample[:120]}"


def _build_steps(sub: Dict[str, Any]) -> List[TutorialStep]:
    tools: List[str] = list(sub.get("tools") or [])
    steps_raw: List[Dict[str, str]] = list(sub.get("steps") or [])

    # Distribute tools across steps as "products" chips. We try to spread
    # evenly so every step has 2–3 product chips that feel contextual.
    distributed: List[List[str]] = [[] for _ in steps_raw]
    if tools and steps_raw:
        for i, tool in enumerate(tools):
            distributed[i % len(steps_raw)].append(tool)

    out: List[TutorialStep] = []
    for idx, s in enumerate(steps_raw):
        title = str(s.get("title", f"Step {idx + 1}")).strip()
        body = str(s.get("body", "")).strip()
        # Split body into description vs technique: first sentence = description,
        # rest = technique (falls back gracefully when there's only one sentence).
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
    )


async def generate_pro_tutorial(req: ProTutorialRequest) -> ProTutorialResponse:
    """Assemble a Pro tutorial from pre-parsed docx content + a lightweight LLM pass."""
    t0 = time.monotonic()

    entry = get_style_entry(req.style)
    if not entry or not entry["sub_styles"]:
        logger.warning(
            "[pro_tutorial] no catalog entry for style=%s — using fallback", req.style
        )
        return _fallback_response(req.style)

    sub_styles_raw = entry["sub_styles"]
    sub_names: List[str] = [s["name"] for s in sub_styles_raw]

    logger.info(
        "[pro_tutorial] start style=%s sub_styles=%d", req.style, len(sub_names)
    )

    # 1. Ask the LLM ONLY for the personalization layer (small prompt, fast).
    personalization = await _personalize(req, sub_names)
    if not personalization:
        personalization = _default_personalization(req, sub_names)
        logger.info(
            "[pro_tutorial] using default personalization (LLM unavailable/failed)"
        )

    recommended_name: Optional[str] = personalization.get("recommended_sub_style")
    if not recommended_name or recommended_name not in sub_names:
        # Coerce to closest match if the LLM returned something unexpected.
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

    # 2. Build step-by-step content from the pre-parsed docx for the chosen sub-style.
    steps = _build_steps(chosen)
    pro_tips = list(chosen.get("pro_tips") or [])

    # 3. Build the sub-styles list (all 5, for user exploration).
    sub_styles: List[SubStyle] = []
    for sub in sub_styles_raw:
        sub_styles.append(
            SubStyle(
                name=sub["name"],
                summary=_sub_style_summary(sub),
                best_for=_best_for_text(sub),
            )
        )

    # 4. Hard-coded color palette for the chosen sub-style.
    palette = get_palette_for_sub_style(recommended_name or "")

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
        steps=steps
        or _fallback_response(req.style).steps,
        sub_styles=sub_styles,
        recommended_sub_style=recommended_name,
        color_palette=palette,
        pro_tips=pro_tips[:6],
        simulation_prompt="",  # image generation not used in current report flow
    )

# ---------------------------------------------------------------------------
# Stylize: img2img makeup transformation for the Pro report.
# ---------------------------------------------------------------------------

# Default image-gen model for stylize (Gemini 3.1 Flash Image: supports img2img, cost effective).
_STYLIZE_MODEL = "gemini-3.1-flash-image-preview"

# Max edge length (pixels) for the image we hand to the img2img endpoint.
_STYLIZE_MAX_EDGE = 1024

# Per-request timeout for the upstream genimg call.
_STYLIZE_TIMEOUT_SECONDS = 180.0


def _downscale_data_uri(data_uri: str, max_edge: int = _STYLIZE_MAX_EDGE) -> str:
    """Downscale a base64 ``data:image/...;base64,...`` URI if it exceeds ``max_edge``."""
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
                return data_uri  # already small enough
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
    except Exception as exc:  # defensive: never break stylize on downscale
        logger.warning("[stylize] downscale failed, using original: %s", exc)
        return data_uri


async def stylize_user_photo(
    style: str,
    sub_style: Optional[str],
    image: str,
) -> str:
    """
    Generate a stylized version of the user's photo for the given (style, sub_style).
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
    logger.info(
        "[stylize] start style=%s sub_style=%s model=%s",
        style,
        sub_style or "overall",
        _STYLIZE_MODEL,
    )

    if image_stripped.startswith("data:image/"):
        image_stripped = _downscale_data_uri(image_stripped)

    service = AIHubService()
    req = GenImgRequest(
        prompt=prompt,
        image=image_stripped,
        model=_STYLIZE_MODEL,
        size="1024x1024",
        n=1,
    )
    try:
        resp = await asyncio.wait_for(
            service.genimg(req), timeout=_STYLIZE_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError as exc:
        logger.warning(
            "[stylize] timeout after %ss style=%s sub_style=%s model=%s",
            int(_STYLIZE_TIMEOUT_SECONDS),
            style,
            sub_style or "overall",
            _STYLIZE_MODEL,
        )
        raise RuntimeError(
            f"Image generation timed out after {int(_STYLIZE_TIMEOUT_SECONDS)}s. "
            "Please try again."
        ) from exc
    except Exception as exc:
        msg = str(exc).lower()
        if "insufficient_ai_balance" in msg or "insufficient ai balance" in msg:
            logger.warning(
                "[stylize] insufficient AI balance style=%s sub_style=%s",
                style,
                sub_style or "overall",
            )
            raise RuntimeError(
                "AI image generation is temporarily unavailable: the "
                "platform AI balance is exhausted. Please top up your "
                "Atoms AI credits (Settings → Billing) and try again."
            ) from exc
        raise

    if not resp or not getattr(resp, "images", None) or not resp.images:
        raise RuntimeError("Stylize generation returned no images.")

    raw_image_data = str(resp.images[0]).strip()

    elapsed = time.monotonic() - t0
    logger.info(
        "[stylize] done style=%s sub_style=%s elapsed=%.2fs",
        style,
        sub_style or "overall",
        elapsed,
    )

    # 🎯 الضمان المطلق لتنسيق الصورة الراجعة:
    # 1. إذا كانت تبدأ بالفعل ببادئة data:image/ أو رابط شبكي http(s):// يتم إرجاعها كالمعتاد.
    if (
        raw_image_data.startswith("data:image/")
        or raw_image_data.startswith("http://")
        or raw_image_data.startswith("https://")
    ):
        return raw_image_data

    # 2. إذا كانت سلسلة Base64 نقية مجردة، يُضاف إليها البادئة القياسية للتوافق مع وسم <img src="..." />
    return f"data:image/jpeg;base64,{raw_image_data}"
