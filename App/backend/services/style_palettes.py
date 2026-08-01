"""Hard-coded color palettes for every BeautyFit sub-style.

Each palette is 6 hex codes chosen to represent the dominant colors of the
finished makeup look (skin, blush, eye, lip, accent, background/mood).

These are baked in so the Pro tutorial never needs to call an LLM just to
produce color swatches — the palette is an instant lookup.
"""

from __future__ import annotations

from typing import Dict, List


# Keys must match the sub-style `name` values parsed from the docx guides
# (including any parenthetical CJK). Matching is done case-insensitively on
# the leading English portion, so the full name or just the English prefix
# both work.
SUB_STYLE_PALETTES: Dict[str, List[str]] = {
    # SWEET
    "japanese kawaii": ["#FCE4EC", "#F8A5B8", "#E8829A", "#C96380", "#FFF4E8", "#8B5A6B"],
    "korean dewy": ["#FDF3EF", "#F5CBC1", "#E8A8A0", "#D08A7E", "#F7E8D8", "#7A5A55"],
    "strawberry girl": ["#FFEDE7", "#F9B8AE", "#E87464", "#B83A30", "#FFE8CC", "#7E3B32"],
    "glazed donut": ["#FBF0E6", "#F3D9C2", "#E8C5A0", "#D4A574", "#FFFAEF", "#8A6A4E"],
    "romantic floral": ["#F7E6EA", "#E6B8C2", "#C98898", "#A35D70", "#F0E3D8", "#6E4552"],

    # NATURAL
    "clean girl": ["#F8EFE4", "#EBD5BE", "#D4A988", "#A8735A", "#FAF5EC", "#5C3F30"],
    "no-makeup makeup": ["#FBF4EC", "#ECD4C0", "#D1A58C", "#A8735A", "#F8EFE4", "#5E4538"],
    "sun-kissed / bronzed": ["#F5DCC2", "#D9A677", "#B87845", "#8A4E25", "#FFE8D0", "#3E2414"],
    "skinimalism": ["#FBF7F2", "#ECDFD2", "#C9B29C", "#9E836C", "#F4ECE0", "#5A4838"],
    "dewy flush": ["#FCE9E0", "#F2B8A8", "#E08A78", "#B05C4E", "#FAF0E4", "#6D3F35"],

    # SEXY
    "vamp / red lip glam": ["#FBE4DC", "#E07864", "#B8231F", "#6E0F11", "#F0D6B8", "#1A0A0E"],
    "cat eye glam": ["#F5E4D0", "#D4A478", "#9E6B3E", "#2D1A14", "#E8C8AA", "#120A08"],
    "smoky eye": ["#E8D8C8", "#9E8270", "#4A3830", "#1A120E", "#C8A890", "#0A0607"],
    "contour glam": ["#F8DFC8", "#D8A880", "#9A6B45", "#5A3820", "#E8C8A8", "#241412"],
    "mob wife / dark glam": ["#E8C8A8", "#A8703A", "#742018", "#2D0A0A", "#C89878", "#080405"],

    # ANDROGYNOUS
    "graphic liner": ["#F5EAE2", "#E0CBB8", "#2D2226", "#0A0608", "#C94F3A", "#7A4A4F"],
    "bleached brow look": ["#F4ECE0", "#E0D0BE", "#B89E84", "#8A7056", "#FFFFFF", "#2D2226"],
    "monochrome face": ["#F0D8C8", "#C88A70", "#A05638", "#62301E", "#E8B898", "#2A1410"],
    "smudged / undone": ["#EADBCF", "#A88878", "#58423A", "#221814", "#C8A894", "#0A0608"],
    "sculptural / avant-garde": ["#E8DFD2", "#D8C0B0", "#6E5848", "#1E1610", "#C98A5A", "#0A0808"],

    # ELEGANT
    "quiet luxury": ["#F2E8DC", "#DCC4AA", "#B89878", "#8A6E52", "#F8F0E4", "#3A2C22"],
    "french girl": ["#F4E8DC", "#E0B8A8", "#C87868", "#8A3830", "#F0D8C8", "#5A2E28"],
    "classic liner": ["#F0E4D4", "#D8B89A", "#A88460", "#2D1F18", "#C98A5A", "#0F0A08"],
    "soft neutral glam": ["#F5E4D2", "#E0BC9E", "#B88468", "#7E4E38", "#EACAAE", "#3A2418"],
    "chinese elegance (zhong shi you ya)": ["#F5E8D8", "#E0B8A2", "#BE6B68", "#8A2E2F", "#D8B874", "#3A1818"],

    # MATURE / POWERFUL
    "power red": ["#F5E0D4", "#E08478", "#C0241F", "#7A0F13", "#E8C8A8", "#1A0808"],
    "editorial bold": ["#F2DDCC", "#C96F6A", "#7B2F3A", "#2E1A28", "#D4A0A0", "#0A0610"],
    "corporate glam": ["#F2E4D4", "#D8B698", "#A87858", "#5A3A28", "#E8CAAE", "#241810"],
    "old hollywood": ["#F0DCCA", "#D8A088", "#B8362C", "#601416", "#C88C74", "#1A0806"],
    "defined brow sculpt": ["#F2E4D4", "#D8B098", "#A4724E", "#3E1E14", "#D88C7C", "#1E1008"],
}


def _normalize(name: str) -> str:
    return (name or "").strip().lower()


def get_palette_for_sub_style(sub_style_name: str) -> List[str]:
    """Return 6 hex codes for a sub-style. Falls back to a neutral palette."""
    key = _normalize(sub_style_name)
    if key in SUB_STYLE_PALETTES:
        return list(SUB_STYLE_PALETTES[key])

    # Try matching just the English portion (before any "(CJK)" part)
    english_prefix = key.split("(")[0].strip()
    if english_prefix in SUB_STYLE_PALETTES:
        return list(SUB_STYLE_PALETTES[english_prefix])

    # Try matching on first token
    for k in SUB_STYLE_PALETTES:
        if k.startswith(english_prefix) or english_prefix.startswith(k):
            return list(SUB_STYLE_PALETTES[k])

    # Neutral fallback palette
    return ["#F5E6DE", "#E8C9B0", "#C97A6B", "#8E7166", "#6B4B3E", "#2D2226"]


def get_palette_for_style(style_name: str) -> List[str]:
    """Return a default palette for a main style (used when no sub-style is picked)."""
    style = _normalize(style_name)
    defaults = {
        "sweet": SUB_STYLE_PALETTES["japanese kawaii"],
        "natural": SUB_STYLE_PALETTES["clean girl"],
        "sexy": SUB_STYLE_PALETTES["vamp / red lip glam"],
        "androgynous": SUB_STYLE_PALETTES["graphic liner"],
        "elegant": SUB_STYLE_PALETTES["quiet luxury"],
        "mature": SUB_STYLE_PALETTES["power red"],
        "powerful": SUB_STYLE_PALETTES["power red"],
    }
    return list(defaults.get(style, SUB_STYLE_PALETTES["quiet luxury"]))