"""Lipstick data API router.

Serves lipstick records from the enriched JSON dataset with filtering, pagination,
dupe search, semantic search, skin-tone recommendation, color universe, and
find-from-image endpoints.
"""

import json
import logging
import math
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/lipsticks", tags=["lipsticks"])

# ---------------------------------------------------------------------------
# Load data into memory on module import
# ---------------------------------------------------------------------------

_DATA_PATH = Path(__file__).parent.parent / "data" / "lipstick_enriched.json"
_LIPSTICKS: list[dict] = []
_LIPSTICK_MAP: dict[str, dict] = {}
_BRANDS: list[str] = []
_COLOR_FAMILIES: list[str] = []
_UNDERTONES: list[str] = []
_FINISHES: list[str] = []

try:
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        _LIPSTICKS = json.load(f)
    _LIPSTICK_MAP = {item["id"]: item for item in _LIPSTICKS if "id" in item}
    _BRANDS = sorted(set(item.get("brand", "") for item in _LIPSTICKS if item.get("brand")))
    _COLOR_FAMILIES = sorted(set(item.get("color_family", "") for item in _LIPSTICKS if item.get("color_family")))
    _UNDERTONES = sorted(set(item.get("undertone", "") for item in _LIPSTICKS if item.get("undertone")))
    _FINISHES = sorted(set(item.get("finish", "") for item in _LIPSTICKS if item.get("finish")))
    _COLOR_DEPTHS = sorted(set(item.get("color_depth", "") for item in _LIPSTICKS if item.get("color_depth")))
    _SEASONAL_PALETTES = sorted(set(item.get("seasonal_palette", "") for item in _LIPSTICKS if item.get("seasonal_palette")))
    logger.info(f"Loaded {len(_LIPSTICKS)} lipstick records from {_DATA_PATH}")
except Exception as e:
    logger.error(f"Failed to load lipstick data: {e}")


# ---------------------------------------------------------------------------
# DeltaE2000 implementation
# ---------------------------------------------------------------------------

def _delta_e_2000(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """Compute CIEDE2000 color difference between two LAB colors."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    # Mean L
    L_bar = (L1 + L2) / 2.0

    C1 = math.sqrt(a1 * a1 + b1 * b1)
    C2 = math.sqrt(a2 * a2 + b2 * b2)
    C_bar = (C1 + C2) / 2.0

    C_bar_7 = C_bar ** 7
    G = 0.5 * (1 - math.sqrt(C_bar_7 / (C_bar_7 + 25 ** 7)))

    a1_prime = a1 * (1 + G)
    a2_prime = a2 * (1 + G)

    C1_prime = math.sqrt(a1_prime * a1_prime + b1 * b1)
    C2_prime = math.sqrt(a2_prime * a2_prime + b2 * b2)
    C_bar_prime = (C1_prime + C2_prime) / 2.0

    h1_prime = math.degrees(math.atan2(b1, a1_prime)) % 360
    h2_prime = math.degrees(math.atan2(b2, a2_prime)) % 360

    if abs(h1_prime - h2_prime) <= 180:
        H_bar_prime = (h1_prime + h2_prime) / 2.0
    elif h1_prime + h2_prime < 360:
        H_bar_prime = (h1_prime + h2_prime + 360) / 2.0
    else:
        H_bar_prime = (h1_prime + h2_prime - 360) / 2.0

    T = (1
         - 0.17 * math.cos(math.radians(H_bar_prime - 30))
         + 0.24 * math.cos(math.radians(2 * H_bar_prime))
         + 0.32 * math.cos(math.radians(3 * H_bar_prime + 6))
         - 0.20 * math.cos(math.radians(4 * H_bar_prime - 63)))

    if abs(h2_prime - h1_prime) <= 180:
        delta_h_prime = h2_prime - h1_prime
    elif h2_prime - h1_prime > 180:
        delta_h_prime = h2_prime - h1_prime - 360
    else:
        delta_h_prime = h2_prime - h1_prime + 360

    delta_L_prime = L2 - L1
    delta_C_prime = C2_prime - C1_prime
    delta_H_prime = 2 * math.sqrt(C1_prime * C2_prime) * math.sin(math.radians(delta_h_prime / 2.0))

    S_L = 1 + 0.015 * (L_bar - 50) ** 2 / math.sqrt(20 + (L_bar - 50) ** 2)
    S_C = 1 + 0.045 * C_bar_prime
    S_H = 1 + 0.015 * C_bar_prime * T

    delta_theta = 30 * math.exp(-((H_bar_prime - 275) / 25) ** 2)
    C_bar_prime_7 = C_bar_prime ** 7
    R_C = 2 * math.sqrt(C_bar_prime_7 / (C_bar_prime_7 + 25 ** 7))
    R_T = -R_C * math.sin(math.radians(2 * delta_theta))

    dE = math.sqrt(
        (delta_L_prime / S_L) ** 2
        + (delta_C_prime / S_C) ** 2
        + (delta_H_prime / S_H) ** 2
        + R_T * (delta_C_prime / S_C) * (delta_H_prime / S_H)
    )
    return dE


def _get_lab(item: dict) -> tuple[float, float, float]:
    """Extract LAB values from a lipstick record."""
    return (
        item.get("color_lab_l", 50.0),
        item.get("color_lab_a", 0.0),
        item.get("color_lab_b", 0.0),
    )


def _slim_item(item: dict) -> dict:
    """Return a slim representation of a lipstick item."""
    return {
        "id": item.get("id"),
        "color_hex": item.get("color_hex"),
        "brand": item.get("brand"),
        "shade_name": item.get("shade_name"),
        "product_line": item.get("product_line"),
        "color_family": item.get("color_family"),
        "undertone": item.get("undertone"),
        "finish": item.get("finish"),
        "color_rgb": item.get("color_rgb"),
        "brightness": item.get("brightness"),
        "saturation": item.get("saturation"),
    }


# ---------------------------------------------------------------------------
# Semantic search parser (rule-based, Chinese + English)
# ---------------------------------------------------------------------------

_UNDERTONE_KEYWORDS = {
    "warm": ["warm", "暖", "暖调", "黄调", "暖色", "warm-toned"],
    "cool": ["cool", "冷", "冷调", "蓝调", "冷色", "cool-toned", "冷皮"],
    "neutral": ["neutral", "中性", "自然"],
}

_COLOR_FAMILY_KEYWORDS = {
    "nude": ["nude", "裸色", "裸", "肉色", "裸粉"],
    "rose": ["rose", "玫瑰", "玫红"],
    "mauve": ["mauve", "豆沙", "豆沙色"],
    "coral": ["coral", "珊瑚", "珊瑚色"],
    "peach": ["peach", "蜜桃", "桃色", "桃"],
    "terracotta": ["terracotta", "砖红", "陶土", "土色"],
    "brick": ["brick", "砖", "砖色"],
    "chili": ["chili", "辣椒", "辣椒红", "正红"],
    "berry": ["berry", "浆果", "莓果", "浆果色"],
    "wine": ["wine", "酒红", "红酒", "姨妈色", "姨妈"],
    "plum": ["plum", "梅子", "梅色"],
    "red": ["red", "红", "正红", "大红", "红色"],
    "pink": ["pink", "粉", "粉色", "粉红"],
    "brown": ["brown", "棕", "棕色", "巧克力"],
    "orange": ["orange", "橘", "橙", "橘色", "橙色"],
    "mlbb": ["mlbb", "my lips but better", "原生感"],
    "milk-tea": ["milk-tea", "milk tea", "奶茶", "奶茶色"],
    "dusty-rose": ["dusty-rose", "dusty rose", "灰粉", "脏粉", "烟粉"],
}

_FINISH_KEYWORDS = {
    "matte": ["matte", "哑光", "雾面", "丝绒哑光"],
    "velvet": ["velvet", "丝绒", "天鹅绒"],
    "satin": ["satin", "缎面", "缎光"],
    "glossy": ["glossy", "亮面", "水光", "镜面", "玻璃唇"],
    "watery": ["watery", "水润", "水感"],
    "sheer": ["sheer", "薄纱", "透明", "轻薄"],
    "cream": ["cream", "奶油", "膏体"],
}

_SKIN_KEYWORDS = {
    "yellow_skin": ["黄皮", "黄一白", "黄二白", "yellow skin", "warm skin"],
    "fair_skin": ["白皮", "冷白皮", "fair", "pale"],
    "dark_skin": ["黑皮", "深肤色", "dark skin", "deep skin"],
}

_STYLE_KEYWORDS = {
    "korean": ["韩", "韩系", "韩女", "korean", "k-beauty"],
    "western": ["欧美", "western", "bold"],
    "soft": ["温柔", "soft", "gentle", "日常", "daily"],
    "retro": ["复古", "retro", "vintage"],
}

_BRIGHTNESS_KEYWORDS = {
    "light": ["浅", "light", "淡", "提亮"],
    "dark": ["深", "dark", "暗", "深色"],
}


def _parse_semantic_query(query: str) -> dict:
    """Parse a natural language query into structured filters."""
    q = query.lower().strip()
    result = {}

    # Undertone
    for ut, keywords in _UNDERTONE_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["undertone"] = ut
            break

    # Color family
    for cf, keywords in _COLOR_FAMILY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["color_family"] = cf
            break

    # Finish
    for fin, keywords in _FINISH_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["finish"] = fin
            break

    # Skin type → maps to undertone recommendation
    for skin, keywords in _SKIN_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["skin_type"] = skin
            break

    # Style
    for style, keywords in _STYLE_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["style"] = style
            break

    # Brightness
    for bright, keywords in _BRIGHTNESS_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            result["brightness_pref"] = bright
            break

    return result


# ---------------------------------------------------------------------------
# RGB <-> LAB conversion helpers
# ---------------------------------------------------------------------------

def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to CIELAB."""
    # Normalize to [0,1]
    rn = r / 255.0
    gn = g / 255.0
    bn = b / 255.0

    # Linearize (sRGB gamma)
    def linearize(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    rl = linearize(rn)
    gl = linearize(gn)
    bl = linearize(bn)

    # Convert to XYZ (D65)
    x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
    y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
    z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041

    # Normalize by D65 white point
    x /= 0.95047
    y /= 1.00000
    z /= 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx = f(x)
    fy = f(y)
    fz = f(z)

    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b_val = 200 * (fy - fz)

    return (L, a, b_val)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
async def list_lipsticks(
    brand: Optional[str] = Query(None, description="Filter by brand (exact match, case-insensitive)"),
    color_family: Optional[str] = Query(None, description="Filter by color family"),
    undertone: Optional[str] = Query(None, description="Filter by undertone"),
    finish: Optional[str] = Query(None, description="Filter by finish type"),
    color_depth: Optional[str] = Query(None, description="Filter by color depth"),
    seasonal_palette: Optional[str] = Query(None, description="Filter by seasonal palette"),
    keyword: Optional[str] = Query(None, description="Keyword search - all space-separated terms must match across brand, shade_name, product_line, id, color_hex"),
    shade_name: Optional[str] = Query(None, description="Partial match on shade name"),
    search: Optional[str] = Query(None, description="General search across brand, shade, product line"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(40, ge=1, le=100, description="Items per page"),
):
    """List lipsticks with optional filters and pagination."""
    results = _LIPSTICKS

    if keyword:
        terms = [t.lower() for t in keyword.strip().split() if t]
        if terms:
            def _matches_all_terms(item: dict) -> bool:
                searchable = " ".join([
                    item.get("brand", ""),
                    item.get("shade_name", ""),
                    item.get("product_line", ""),
                    item.get("id", ""),
                    item.get("color_hex", ""),
                ]).lower()
                return all(term in searchable for term in terms)
            results = [r for r in results if _matches_all_terms(r)]

    if brand:
        brand_lower = brand.lower()
        results = [r for r in results if r.get("brand", "").lower() == brand_lower]

    if color_family:
        cf_lower = color_family.lower()
        results = [r for r in results if r.get("color_family", "").lower() == cf_lower]

    if undertone:
        ut_lower = undertone.lower()
        results = [r for r in results if r.get("undertone", "").lower() == ut_lower]

    if finish:
        fin_lower = finish.lower()
        results = [r for r in results if r.get("finish", "").lower() == fin_lower]

    if color_depth:
        cd_lower = color_depth.lower()
        results = [r for r in results if r.get("color_depth", "").lower() == cd_lower]

    if seasonal_palette:
        sp_lower = seasonal_palette.lower()
        results = [r for r in results if r.get("seasonal_palette", "").lower() == sp_lower]

    if shade_name:
        sn_lower = shade_name.lower()
        results = [r for r in results if sn_lower in r.get("shade_name", "").lower()]

    if search:
        search_lower = search.lower()
        results = [
            r for r in results
            if search_lower in r.get("brand", "").lower()
            or search_lower in r.get("shade_name", "").lower()
            or search_lower in r.get("product_line", "").lower()
        ]

    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = results[start:end]

    slim_items = [_slim_item(item) for item in page_items]

    return JSONResponse(content={
        "items": slim_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


@router.get("/filters")
async def get_filters():
    """Return available filter options for the lipstick browser."""
    return JSONResponse(content={
        "brands": _BRANDS,
        "color_families": _COLOR_FAMILIES,
        "undertones": _UNDERTONES,
        "finishes": _FINISHES,
        "color_depths": _COLOR_DEPTHS,
        "seasonal_palettes": _SEASONAL_PALETTES,
        "total_count": len(_LIPSTICKS),
    })


@router.get("/{lipstick_id}/dupes")
async def find_dupes(
    lipstick_id: str,
    limit: int = Query(10, ge=1, le=20, description="Number of dupes to return"),
):
    """Find top N dupe lipsticks using DeltaE2000 in CIELAB space."""
    source = _LIPSTICK_MAP.get(lipstick_id)
    if not source:
        return JSONResponse(status_code=404, content={"error": "Lipstick not found"})

    source_lab = _get_lab(source)
    source_brand = source.get("brand", "").lower()

    # Compute distances (exclude self, prefer cross-brand)
    scored = []
    for item in _LIPSTICKS:
        if item.get("id") == lipstick_id:
            continue
        item_lab = _get_lab(item)
        dist = _delta_e_2000(source_lab, item_lab)
        scored.append((dist, item))

    scored.sort(key=lambda x: x[0])
    top = scored[:limit]

    results = []
    for dist, item in top:
        slim = _slim_item(item)
        slim["distance"] = round(dist, 2)
        slim["same_brand"] = item.get("brand", "").lower() == source_brand
        results.append(slim)

    return JSONResponse(content={
        "source": _slim_item(source),
        "dupes": results,
    })


@router.get("/search-by-color")
async def search_by_color(
    hex: str = Query(..., description="Hex color code (e.g. #a52a2a)"),
    limit: int = Query(20, ge=1, le=50, description="Number of results"),
):
    """Find lipsticks closest to a given hex color using DeltaE2000."""
    # Parse hex
    hex_clean = hex.lstrip("#")
    if len(hex_clean) != 6:
        return JSONResponse(status_code=400, content={"error": "Invalid hex color"})
    try:
        r = int(hex_clean[0:2], 16)
        g = int(hex_clean[2:4], 16)
        b = int(hex_clean[4:6], 16)
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "Invalid hex color"})

    target_lab = _rgb_to_lab(r, g, b)

    scored = []
    for item in _LIPSTICKS:
        item_lab = _get_lab(item)
        dist = _delta_e_2000(target_lab, item_lab)
        scored.append((dist, item))

    scored.sort(key=lambda x: x[0])
    top = scored[:limit]

    results = []
    for dist, item in top:
        slim = _slim_item(item)
        results.append(slim)

    return JSONResponse(content={"items": results, "total": len(results)})


@router.get("/semantic-search")
async def semantic_search(
    q: str = Query(..., description="Natural language query (Chinese or English)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(40, ge=1, le=100),
):
    """Semantic beauty search using rule-based NLP parser."""
    parsed = _parse_semantic_query(q)

    results = _LIPSTICKS

    if "undertone" in parsed:
        ut = parsed["undertone"]
        results = [r for r in results if r.get("undertone", "").lower() == ut]

    if "color_family" in parsed:
        cf = parsed["color_family"]
        results = [r for r in results if r.get("color_family", "").lower() == cf]

    if "finish" in parsed:
        fin = parsed["finish"]
        results = [r for r in results if r.get("finish", "").lower() == fin]

    if "brightness_pref" in parsed:
        pref = parsed["brightness_pref"]
        if pref == "light":
            results = [r for r in results if r.get("brightness", 50) >= 55]
        else:
            results = [r for r in results if r.get("brightness", 50) <= 45]

    # Skin type → recommend matching undertone
    if "skin_type" in parsed and "undertone" not in parsed:
        skin = parsed["skin_type"]
        if skin == "yellow_skin":
            # Yellow skin → warm undertone lipsticks look best
            results = [r for r in results if r.get("undertone", "") in ("warm", "neutral")]
        elif skin == "fair_skin":
            # Fair/cool skin → cool undertone
            results = [r for r in results if r.get("undertone", "") in ("cool", "neutral")]

    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = results[start:end]

    return JSONResponse(content={
        "parsed_query": parsed,
        "items": [_slim_item(item) for item in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


class SkinToneInput(BaseModel):
    undertone: str  # warm, cool, neutral
    depth: str  # light, medium, deep


@router.post("/recommend-by-skin")
async def recommend_by_skin(
    skin: SkinToneInput = Body(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(40, ge=1, le=100),
):
    """Recommend lipsticks based on detected skin undertone and depth.

    Scoring: color_match 40%, undertone 20%, finish 15%, seasonal 15%, popularity(brightness) 10%
    """
    user_undertone = skin.undertone.lower()
    user_depth = skin.depth.lower()

    # Map depth to seasonal palette preference
    depth_seasonal_map = {
        "light": ["spring", "summer"],
        "medium": ["summer", "autumn"],
        "deep": ["autumn", "winter"],
    }
    preferred_seasons = depth_seasonal_map.get(user_depth, ["summer", "autumn"])

    # Preferred color families by skin type
    undertone_families = {
        "warm": ["coral", "peach", "terracotta", "nude", "brick", "chili", "orange", "milk-tea"],
        "cool": ["mauve", "rose", "berry", "wine", "plum", "dusty-rose", "pink", "mlbb"],
        "neutral": ["nude", "rose", "mauve", "mlbb", "dusty-rose", "milk-tea", "coral"],
    }
    preferred_families = undertone_families.get(user_undertone, [])

    scored = []
    for item in _LIPSTICKS:
        score = 0.0

        # Color family match (40%)
        cf = item.get("color_family", "").lower()
        if cf in preferred_families:
            idx = preferred_families.index(cf)
            score += 0.4 * (1.0 - idx * 0.08)  # Higher rank = higher score
        else:
            score += 0.05

        # Undertone match (20%)
        item_ut = item.get("undertone", "").lower()
        if item_ut == user_undertone:
            score += 0.2
        elif item_ut == "neutral":
            score += 0.12
        else:
            score += 0.04

        # Finish preference (15%) - matte/velvet generally more universally flattering
        item_finish = item.get("finish", "").lower()
        finish_scores = {"matte": 0.15, "velvet": 0.14, "satin": 0.12, "cream": 0.11, "glossy": 0.10, "sheer": 0.08, "watery": 0.07}
        score += finish_scores.get(item_finish, 0.08)

        # Seasonal palette (15%)
        item_season = item.get("seasonal_palette", "").lower()
        if item_season in preferred_seasons:
            score += 0.15
        else:
            score += 0.05

        # Popularity proxy via brightness balance (10%)
        brightness = item.get("brightness", 50)
        # Prefer mid-range brightness (most wearable)
        brightness_score = 1.0 - abs(brightness - 50) / 50
        score += 0.1 * brightness_score

        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)

    total = len(scored)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = scored[start:end]

    results = []
    for sc, item in page_items:
        slim = _slim_item(item)
        slim["match_score"] = round(sc * 100, 1)
        results.append(slim)

    return JSONResponse(content={
        "skin_analysis": {"undertone": user_undertone, "depth": user_depth},
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


@router.get("/color-universe/{family}")
async def color_universe(
    family: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(60, ge=1, le=100),
):
    """Get lipsticks for a specific color family (Color Universe page)."""
    family_lower = family.lower()

    # Map display names to data values
    family_map = {
        "nude": "nude",
        "mauve": "mauve",
        "milk-tea": "milk-tea",
        "milktea": "milk-tea",
        "rose": "rose",
        "berry": "berry",
        "terracotta": "terracotta",
        "chili": "chili",
        "dusty-rose": "dusty-rose",
        "coral": "coral",
        "wine": "wine",
        "plum": "plum",
        "red": "red",
        "pink": "pink",
        "brown": "brown",
        "orange": "orange",
        "mlbb": "mlbb",
        "brick": "brick",
    }
    mapped = family_map.get(family_lower, family_lower)

    results = [r for r in _LIPSTICKS if r.get("color_family", "").lower() == mapped]

    # Sort by brightness for visual gradient effect
    results.sort(key=lambda x: x.get("brightness", 50))

    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = results[start:end]

    return JSONResponse(content={
        "family": mapped,
        "items": [_slim_item(item) for item in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    })


class FindFromImageInput(BaseModel):
    r: int
    g: int
    b: int


@router.post("/find-from-image")
async def find_from_image(
    color: FindFromImageInput = Body(...),
    limit: int = Query(10, ge=1, le=20),
):
    """Find closest lipstick matches given an extracted lip color (RGB).

    The frontend extracts the lip region color via MediaPipe and sends RGB here.
    We convert to LAB and perform nearest-neighbor search.
    """
    target_lab = _rgb_to_lab(color.r, color.g, color.b)

    scored = []
    for item in _LIPSTICKS:
        item_lab = _get_lab(item)
        dist = _delta_e_2000(target_lab, item_lab)
        scored.append((dist, item))

    scored.sort(key=lambda x: x[0])
    top = scored[:limit]

    results = []
    for dist, item in top:
        slim = _slim_item(item)
        slim["distance"] = round(dist, 2)
        results.append(slim)

    return JSONResponse(content={
        "input_rgb": {"r": color.r, "g": color.g, "b": color.b},
        "input_lab": {"l": round(target_lab[0], 2), "a": round(target_lab[1], 2), "b": round(target_lab[2], 2)},
        "matches": results,
    })