"""
BeautyFit Face Analysis Service — MediaPipe 478-Point Edition (v2.1)

Implements face analysis directly from MediaPipe FaceMesh 478 normalised
3D landmarks. No dlib 68-pt mapping — all metrics, classifications, and
style scoring use the native 478-point indices per the v2.0 spec.

v2.1 FIX: All geometric calculations now convert normalised coordinates
to pixel space (x * img_w, y * img_h) before computing distances and
ratios. This corrects the aspect-ratio distortion that caused face_ratio
and other cross-axis metrics to be wrong on non-square images.

NOTE: This service works with plain dict landmarks {x, y, z} — no MediaPipe
or OpenCV imports required. All heavy detection runs in the browser via WASM.
"""

import math
import base64
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# Step 1 — MediaPipe 478-pt Key Point Index Constants
# ═══════════════════════════════════════════════════════════════════════

SILHOUETTE = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
]

FOREHEAD_TOP = 10
CHIN_BOTTOM = 152
CHEEK_R = 454
CHEEK_L = 234
JAW_R = 365
JAW_L = 172
# Jaw angle auxiliary points: ramus direction (toward ear), used as the
# second arm when measuring the gonial angle at the jaw vertex.
# Right: 288 is ~2 steps up the ramus from 365 in the silhouette sequence
#        (454→323→361→288→397→365→...), giving a stable arm direction.
# Left:  132 is ~2 steps up the ramus from 172 in the silhouette sequence
#        (...→172→58→132→93→234), giving a symmetric stable arm.
JAW_R_RAMUS = 288
JAW_L_RAMUS = 132
CHIN_R = 400
CHIN_L = 176

BROW_OUTER_R = 70
BROW_OUTER_L = 300
BROW_PEAK_R = 105
BROW_PEAK_L = 334

# Eyes — EAR 6-point groups
EYE_R_OUTER = 33
EYE_R_INNER = 133
EYE_R_TOP1 = 159
EYE_R_TOP2 = 158
EYE_R_BOT1 = 145
EYE_R_BOT2 = 153

EYE_L_OUTER = 263
EYE_L_INNER = 362
EYE_L_TOP1 = 386
EYE_L_TOP2 = 385
EYE_L_BOT1 = 374
EYE_L_BOT2 = 380

IRIS_R = 468
IRIS_L = 473

# Nose
NOSE_ROOT = 168
NOSE_MID = 6
NOSE_TIP = 1
ALAR_R = 358
ALAR_L = 129

# Lips
LIP_CORNER_L = 61
LIP_CORNER_R = 291
LIP_TOP_CTR = 0      # upper lip central (cupid valley)
LIP_PEAK_R = 37      # cupid bow right peak
LIP_PEAK_L = 267     # cupid bow left peak
LIP_BOT_CTR = 17     # lower lip lowest

# ── Visualization landmark groups (MediaPipe 478-pt) ──
# These are returned to the frontend for overlay rendering.

# Right eyebrow (inner → outer)
RIGHT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
# Left eyebrow (inner → outer)
LEFT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]

# Right eye full outline
RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
# Left eye full outline
LEFT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]

# Nose bridge + base
NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1]
NOSE_BASE = [129, 98, 97, 2, 326, 327, 358]

# Outer lip
OUTER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
             375, 321, 405, 314, 17, 84, 181, 91, 146]
# Inner lip
INNER_LIP = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308,
             324, 318, 402, 317, 14, 87, 178, 88, 95]

# Jawline subset of silhouette (right ear → chin → left ear)
JAWLINE = [454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
           152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234]

# Forehead contour (right temple → top → left temple)
FOREHEAD_CONTOUR = [251, 284, 332, 297, 338, 10, 109, 67, 103, 54, 21]


# ═══════════════════════════════════════════════════════════════════════
# Step 2 — Core Metric Computation (478-pt native, aspect-ratio corrected)
# ═══════════════════════════════════════════════════════════════════════

def _px(lm, i, img_w, img_h):
    """Return pixel-space (px_x, px_y) for landmark i."""
    return (lm[i]["x"] * img_w, lm[i]["y"] * img_h)


def _dist_px(lm, i, j, img_w, img_h):
    """Euclidean distance between two landmarks in pixel space."""
    ax, ay = _px(lm, i, img_w, img_h)
    bx, by = _px(lm, j, img_w, img_h)
    return math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)


def _angle_3pts_px(lm, a, vertex, b, img_w, img_h):
    """Angle at vertex formed by vectors vertex→a and vertex→b, in degrees (pixel space)."""
    vx, vy = _px(lm, vertex, img_w, img_h)
    ax, ay = _px(lm, a, img_w, img_h)
    bx, by = _px(lm, b, img_w, img_h)
    va = (ax - vx, ay - vy)
    vb = (bx - vx, by - vy)
    dot = va[0] * vb[0] + va[1] * vb[1]
    mag_a = math.sqrt(va[0] ** 2 + va[1] ** 2)
    mag_b = math.sqrt(vb[0] ** 2 + vb[1] ** 2)
    denom = mag_a * mag_b
    if denom < 1e-9:
        return 0.0
    cos_val = max(-1.0, min(1.0, dot / denom))
    return math.degrees(math.acos(cos_val))


def compute_metrics(lm: list, img_w: int = 1, img_h: int = 1) -> dict:
    """Compute all facial metrics from 478 normalised MediaPipe landmarks.

    Args:
        lm: list of 478 dicts with keys {x, y, z} (normalised 0-1).
        img_w: original image width in pixels.
        img_h: original image height in pixels.

    All geometric calculations are done in pixel space to avoid
    aspect-ratio distortion. Ratios are dimensionless.
    """
    W = float(img_w) if img_w > 0 else 1.0
    H = float(img_h) if img_h > 0 else 1.0

    # ── Face dimensions (pixel space) ──
    face_height = lm[CHIN_BOTTOM]["y"] * H - lm[FOREHEAD_TOP]["y"] * H
    if face_height <= 0:
        face_height = 1e-6

    sil_px_xs = [lm[i]["x"] * W for i in SILHOUETTE]
    cheekbone_width = max(sil_px_xs) - min(sil_px_xs)
    if cheekbone_width <= 0:
        cheekbone_width = 1e-6

    face_ratio = face_height / cheekbone_width

    # ── Forehead width (silhouette contour method, pixel space) ──
    # Uses the full FOREHEAD_CONTOUR silhouette points to find the widest
    # span of the upper face. This method gives forehead_ratio ≈ 0.95–1.0
    # for typical faces, which matches the HEART threshold (> 0.95).
    # The brow-outer endpoint method (pt 70/300) was too narrow (≈ 0.82)
    # and mismatched the classification thresholds.
    forehead_px_xs = [lm[i]["x"] * W for i in FOREHEAD_CONTOUR]
    forehead_width = max(forehead_px_xs) - min(forehead_px_xs)
    forehead_ratio = forehead_width / cheekbone_width

    # ── Jaw (pixel space) ──
    jaw_width = abs(lm[JAW_R]["x"] * W - lm[JAW_L]["x"] * W)
    jaw_ratio = cheekbone_width / max(jaw_width, 1e-6)

    # jaw_angle (gonial angle): measured at the jaw vertex (mandibular angle),
    # one arm toward chin (CHIN_BOTTOM), one arm up the ramus (toward ear).
    # Using points ~2 steps away in the silhouette for stable arm direction.
    jaw_angle_r = _angle_3pts_px(lm, CHIN_BOTTOM, JAW_R, JAW_R_RAMUS, W, H)
    jaw_angle_l = _angle_3pts_px(lm, CHIN_BOTTOM, JAW_L, JAW_L_RAMUS, W, H)
    jaw_angle = (jaw_angle_r + jaw_angle_l) / 2.0

    # ── Chin (pixel space) ──
    chin_width = abs(lm[CHIN_R]["x"] * W - lm[CHIN_L]["x"] * W)
    chin_ratio = chin_width / cheekbone_width

    # ── EAR (Eye Aspect Ratio — Soukupová & Čech 2016, pixel space) ──
    EAR_R = ((_dist_px(lm, EYE_R_TOP1, EYE_R_BOT1, W, H) +
              _dist_px(lm, EYE_R_TOP2, EYE_R_BOT2, W, H))
             / (2.0 * max(_dist_px(lm, EYE_R_OUTER, EYE_R_INNER, W, H), 1e-9)))
    EAR_L = ((_dist_px(lm, EYE_L_TOP1, EYE_L_BOT1, W, H) +
              _dist_px(lm, EYE_L_TOP2, EYE_L_BOT2, W, H))
             / (2.0 * max(_dist_px(lm, EYE_L_OUTER, EYE_L_INNER, W, H), 1e-9)))
    EAR = (EAR_R + EAR_L) / 2.0

    # ── Eye dimensions (pixel space) ──
    eye_height_R = (max(lm[EYE_R_BOT1]["y"], lm[EYE_R_BOT2]["y"]) -
                    min(lm[EYE_R_TOP1]["y"], lm[EYE_R_TOP2]["y"])) * H
    eye_height_L = (max(lm[EYE_L_BOT1]["y"], lm[EYE_L_BOT2]["y"]) -
                    min(lm[EYE_L_TOP1]["y"], lm[EYE_L_TOP2]["y"])) * H
    eye_height_R = max(eye_height_R, 1e-6)
    eye_height_L = max(eye_height_L, 1e-6)

    eye_width_R = _dist_px(lm, EYE_R_OUTER, EYE_R_INNER, W, H)
    eye_width_L = _dist_px(lm, EYE_L_OUTER, EYE_L_INNER, W, H)

    eye_aspect_ratio = ((eye_width_R / eye_height_R) + (eye_width_L / eye_height_L)) / 2.0

    # ── Eye tilt angle (pixel space) ──
    def _tilt_px(outer, inner):
        ox, oy = _px(lm, outer, W, H)
        ix, iy = _px(lm, inner, W, H)
        return math.degrees(math.atan2(oy - iy, ox - ix))

    tilt_r = _tilt_px(EYE_R_OUTER, EYE_R_INNER)
    # Left eye: measure inner→outer so dx is positive (consistent direction)
    tilt_l_ox, tilt_l_oy = _px(lm, EYE_L_OUTER, W, H)
    tilt_l_ix, tilt_l_iy = _px(lm, EYE_L_INNER, W, H)
    tilt_l = math.degrees(math.atan2(tilt_l_iy - tilt_l_oy, tilt_l_ix - tilt_l_ox))
    eye_tilt_angle = (tilt_r + tilt_l) / 2.0

    # ── Eye spacing (iris center distance / cheekbone_width, pixel space) ──
    # Spec §2: uses iris centers (468/473) for more precise measurement,
    # normalised by cheekbone_width (not eye width).
    iris_gap_px = abs(lm[IRIS_L]["x"] - lm[IRIS_R]["x"]) * W
    eye_spacing_ratio = iris_gap_px / max(cheekbone_width, 1e-9)

    # ── Lid visibility (pixel space) ──
    guard = face_height * 0.02
    brow_eye_gap_R = abs(lm[BROW_PEAK_R]["y"] * H - lm[EYE_R_TOP1]["y"] * H)
    brow_eye_gap_L = abs(lm[BROW_PEAK_L]["y"] * H - lm[EYE_L_TOP1]["y"] * H)
    lid_R = eye_height_R / max(brow_eye_gap_R, guard)
    lid_L = eye_height_L / max(brow_eye_gap_L, guard)
    lid_visibility = (lid_R + lid_L) / 2.0

    # ── Nose bridge height (3D z-depth) ──
    # MediaPipe z is normalised relative to face width (x-axis scale).
    # To get a consistent dimensionless ratio we convert z to pixel space
    # (z * img_w, since z uses x-axis scale) and normalise by face_height
    # in pixel space (y * img_h). This avoids cross-axis distortion.
    depth_diff_px = (lm[NOSE_ROOT]["z"] - lm[NOSE_MID]["z"]) * W
    nose_bridge_height = depth_diff_px / max(face_height, 1e-6)

    # ── Alar width (pixel space ratio) ──
    alar_width_ratio = _dist_px(lm, ALAR_L, ALAR_R, W, H) / cheekbone_width

    # ── Lip width (pixel space ratio) ──
    lip_width_ratio = _dist_px(lm, LIP_CORNER_L, LIP_CORNER_R, W, H) / cheekbone_width

    # ── Lip height (pixel space ratio) ──
    lip_height_raw = (lm[LIP_BOT_CTR]["y"] - lm[LIP_TOP_CTR]["y"]) * H
    lip_height_ratio = lip_height_raw / max(face_height, 1e-6)

    # ── Cupid's bow ratio (pixel space, positive = pronounced bow) ──
    peak_avg_y = (lm[LIP_PEAK_R]["y"] + lm[LIP_PEAK_L]["y"]) / 2.0
    cupid_bow_raw = (lm[LIP_TOP_CTR]["y"] - peak_avg_y) * H
    cupid_bow_ratio = cupid_bow_raw / max(lip_height_raw, 1e-6)

    return {
        "face_height": round(face_height, 4),
        "cheekbone_width": round(cheekbone_width, 4),
        "face_ratio": round(face_ratio, 3),
        "forehead_width": round(forehead_width, 4),
        "forehead_ratio": round(forehead_ratio, 3),
        "jaw_width": round(jaw_width, 4),
        "jaw_ratio": round(jaw_ratio, 3),
        "jaw_angle": round(jaw_angle, 1),
        "chin_width": round(chin_width, 4),
        "chin_ratio": round(chin_ratio, 3),
        "EAR": round(EAR, 4),
        "eye_width_R": round(eye_width_R, 5),
        "eye_width_L": round(eye_width_L, 5),
        "eye_height_R": round(eye_height_R, 5),
        "eye_height_L": round(eye_height_L, 5),
        "eye_aspect_ratio": round(eye_aspect_ratio, 3),
        "eye_tilt_angle": round(eye_tilt_angle, 2),
        "eye_spacing_ratio": round(eye_spacing_ratio, 3),
        "lid_visibility": round(lid_visibility, 3),
        "nose_bridge_height": round(nose_bridge_height, 4),
        "alar_width_ratio": round(alar_width_ratio, 3),
        "lip_width_ratio": round(lip_width_ratio, 3),
        "lip_height_ratio": round(lip_height_ratio, 4),
        "cupid_bow_ratio": round(cupid_bow_ratio, 3),
    }


# ═══════════════════════════════════════════════════════════════════════
# Step 3 — Classification Rules (v2.0)
# ═══════════════════════════════════════════════════════════════════════

def classify_face_shape(m: dict) -> str:
    """Classify face shape per v2.0 spec §3.1.

    Priority: OBLONG → HEART → DIAMOND → SQUARE → ROUND → OVAL (fallback).
    Thresholds aligned with spec v2.0 tables (pixel-space corrected metrics).
    """
    # OBLONG: very tall face, jaw not too narrow, rounded jaw angle
    if m["face_ratio"] > 1.55 and m["jaw_ratio"] >= 1.10 and m["jaw_angle"] > 118:
        return "OBLONG"
    # HEART: wide forehead relative to cheekbone, V-shaped jaw, narrow chin
    # Spec: forehead_ratio > 0.95 (lowered from 1.02 to fix dlib-era bug)
    # chin_ratio threshold relaxed from 0.17 to 0.30 — original spec value
    # was too strict for real-world faces (e.g. 0.281 clearly V-shaped but
    # failed the 0.17 cutoff).
    if m["forehead_ratio"] > 0.95 and m["jaw_ratio"] > 1.22 and m["chin_ratio"] < 0.30:
        return "HEART"
    # DIAMOND: narrow forehead AND narrow jaw, cheekbones widest
    # Spec: forehead_ratio < 0.88 (tightened from 0.92)
    if m["forehead_ratio"] < 0.88 and m["jaw_ratio"] < 0.92 and m["face_ratio"] >= 1.25:
        return "DIAMOND"
    # SQUARE: sharp jaw angle, jaw nearly as wide as cheekbones
    # Spec: jaw_angle < 118°, jaw_ratio >= 0.90 (cheek/jaw ≈ 1, meaning jaw is wide)
    #        jaw_ratio >= 0.90 means jaw_width >= cheekbone_width * (1/0.90) is NOT what
    #        the spec means — jaw_ratio = cheekbone/jaw, so >= 0.90 means jaw is at least
    #        ~90% as wide as cheekbone. We invert: jaw_ratio <= 1/0.90 ≈ 1.11
    if m["jaw_angle"] < 118 and m["jaw_ratio"] <= 1.11 and m["face_ratio"] < 1.40:
        return "SQUARE"
    # ROUND: short face, very rounded jaw, wide chin
    if m["face_ratio"] < 1.15 and m["jaw_angle"] > 128 and m["chin_ratio"] > 0.22:
        return "ROUND"
    return "OVAL"


def classify_eye_tags(m: dict) -> list:
    """Multi-label eye classification per v2.0 spec.

    MONOLID / HOODED / DOUBLE_LID: mutually exclusive (priority order).
    UPTURNED / ALMOND_EYE / DOWNTURNED: mutually exclusive (strict inequalities).
    ROUND_EYE: independent (can coexist with tilt group).
    WIDE_SET / CLOSE_SET: independent.
    """
    tags = []

    # ── Lid type (mutually exclusive) ──
    if m["EAR"] < 0.20 and m["lid_visibility"] < 0.30:
        tags.append("MONOLID")
    elif m["EAR"] >= 0.20 and m["lid_visibility"] < 0.32:
        tags.append("HOODED")
    elif m["lid_visibility"] >= 0.40:
        tags.append("DOUBLE_LID")
    # 0.32–0.40 dead zone: no lid tag (buffer)

    # ── Tilt direction (mutually exclusive, strict inequalities) ──
    if m["eye_tilt_angle"] < -4:
        tags.append("UPTURNED")
    elif m["eye_tilt_angle"] > 4:
        tags.append("DOWNTURNED")
    else:
        # Neutral tilt → almond if aspect ratio is moderate (open interval)
        if 2.2 < m["eye_aspect_ratio"] < 3.2:
            tags.append("ALMOND_EYE")

    # ── Round eye (independent) ──
    if m["EAR"] > 0.28 or m["eye_aspect_ratio"] < 2.2:
        tags.append("ROUND_EYE")

    # ── Spacing (independent, spec §3.2: iris_distance / cheekbone_width) ──
    if m["eye_spacing_ratio"] > 0.36:
        tags.append("WIDE_SET")
    elif m["eye_spacing_ratio"] < 0.28:
        tags.append("CLOSE_SET")

    return tags


def classify_facial_tags(m: dict) -> list:
    """Nose & lip multi-label classification per v2.0 spec §3.3.

    Uses 3D z-depth for nose bridge height.
    Cupid bow ratio uses corrected formula (positive = pronounced).
    All thresholds aligned with spec v2.0 tables.
    """
    tags = []

    # Nose bridge height (3D z-depth based, spec: <0.010 low, >0.025 high)
    if m["nose_bridge_height"] < 0.010:
        tags.append("LOW_NOSE_BRIDGE")
    elif m["nose_bridge_height"] > 0.025:
        tags.append("HIGH_NOSE_BRIDGE")

    # Alar width (spec: >0.360 wide, <0.280 narrow)
    if m["alar_width_ratio"] > 0.360:
        tags.append("WIDE_ALAR")
    elif m["alar_width_ratio"] < 0.280:
        tags.append("NARROW_ALAR")

    # Lip height (spec: <0.025 thin, >0.042 full)
    if m["lip_height_ratio"] < 0.025:
        tags.append("THIN_LIP")
    elif m["lip_height_ratio"] > 0.042:
        tags.append("FULL_LIP")

    # Cupid's bow (spec: >0.20 defined, <0.08 flat)
    if m["cupid_bow_ratio"] > 0.20:
        tags.append("DEFINED_BOW")
    elif m["cupid_bow_ratio"] < 0.08:
        tags.append("FLAT_BOW")

    # Lip width (spec: >0.40 wide, <0.30 small)
    if m["lip_width_ratio"] > 0.40:
        tags.append("WIDE_LIP")
    elif m["lip_width_ratio"] < 0.30:
        tags.append("SMALL_MOUTH")

    return tags


# ═══════════════════════════════════════════════════════════════════════
# Layer 1 Style Scoring (6 dimensions)
# ═══════════════════════════════════════════════════════════════════════
#
# NOTE: nose_bridge_height is now a z-depth ratio (typically 0.00–0.04),
# NOT a 2D y-distance ratio. All scoring thresholds are updated accordingly.

def _tier_coeff(value: float, best_range: tuple, ok_range: tuple, weak_range: tuple) -> float:
    def _check(rng, val):
        if rng is None:
            return False
        kind = rng[0]
        if kind == "lt":
            return val < rng[1]
        elif kind == "gt":
            return val > rng[1]
        elif kind == "gte":
            return val >= rng[1]
        elif kind == "lte":
            return val <= rng[1]
        elif kind == "between":
            return rng[1] <= val <= rng[2]
        elif kind == "any":
            return True
        return False

    if _check(best_range, value):
        return 1.0
    if _check(ok_range, value):
        return 0.6
    if _check(weak_range, value):
        return 0.2
    return 0.0


def _score_dimension(m: dict, params: list) -> float:
    """Generic dimension scorer. Returns 0-100."""
    total = 0.0
    for metric_key, weight, best, ok, weak in params:
        value = m.get(metric_key, 0)
        coeff = _tier_coeff(value, best, ok, weak)
        total += weight * coeff
    return round(total, 1)


def score_sweet(m: dict) -> float:
    params = [
        ("eye_aspect_ratio", 22, ("lt", 2.3), ("between", 2.3, 2.9), ("gte", 3.0)),
        ("eye_tilt_angle", 16, ("between", -2, 5), ("between", -6, -2), None),
        ("jaw_angle", 14, ("gt", 128), ("between", 120, 128), ("lt", 115)),
        ("face_ratio", 12, ("lt", 1.3), ("between", 1.3, 1.5), ("gt", 1.6)),
        ("cupid_bow_ratio", 11, ("gt", 0.18), ("between", 0.10, 0.18), ("lt", 0.08)),
        ("lip_height_ratio", 10, ("between", 0.025, 0.042), ("between", 0.020, 0.025), ("gt", 0.048)),
        ("lid_visibility", 9, ("gte", 0.40), ("lt", 0.30), None),
        ("nose_bridge_height", 6, ("between", 0.005, 0.020), ("lt", 0.005), ("gt", 0.030)),
    ]
    return _score_dimension(m, params)


def score_sexy(m: dict) -> float:
    params = [
        ("eye_tilt_angle", 22, ("lt", -5), ("between", -5, -2), ("gt", 4)),
        ("jaw_ratio", 18, ("gt", 1.25), ("between", 1.10, 1.25), ("lt", 1.05)),
        ("lip_height_ratio", 16, ("gt", 0.038), ("between", 0.026, 0.038), ("lt", 0.022)),
        ("nose_bridge_height", 12, ("gt", 0.020), ("between", 0.010, 0.020), ("lt", 0.005)),
        ("face_ratio", 12, ("between", 1.3, 1.6), ("between", 1.2, 1.3), ("lt", 1.15)),
        ("eye_aspect_ratio", 10, ("between", 2.5, 3.5), ("between", 2.2, 2.5), ("lt", 2.0)),
        ("lip_width_ratio", 10, ("gt", 0.38), ("between", 0.30, 0.38), ("lt", 0.26)),
    ]
    return _score_dimension(m, params)


def score_powerful(m: dict) -> float:
    params = [
        ("jaw_angle", 20, ("lt", 120), ("between", 120, 130), ("gt", 135)),
        ("eye_tilt_angle", 18, ("lt", -3), ("between", -3, 2), ("gt", 6)),
        ("nose_bridge_height", 16, ("gt", 0.020), ("between", 0.010, 0.020), ("lt", 0.005)),
        ("face_ratio", 14, ("between", 1.3, 1.6), ("between", 1.6, 1.75), ("lt", 1.15)),
        ("jaw_ratio", 14, ("gt", 1.2), ("between", 1.1, 1.2), ("lt", 1.05)),
        ("eye_aspect_ratio", 10, ("between", 2.5, 3.5), ("between", 2.2, 2.5), ("lt", 2.0)),
        ("lip_height_ratio", 8, ("between", 0.022, 0.036), ("between", 0.036, 0.045), ("gt", 0.048)),
    ]
    return _score_dimension(m, params)


def score_elegant(m: dict) -> float:
    params = [
        ("face_ratio", 18, ("between", 1.3, 1.6), ("between", 1.25, 1.35), ("lt", 1.15)),
        ("eye_aspect_ratio", 18, ("between", 2.4, 3.2), ("between", 2.2, 2.4), ("lt", 2.0)),
        ("nose_bridge_height", 16, ("gt", 0.018), ("between", 0.010, 0.018), ("lt", 0.005)),
        ("cupid_bow_ratio", 14, ("gt", 0.18), ("between", 0.10, 0.18), ("lt", 0.08)),
        ("eye_tilt_angle", 14, ("between", -8, -3), ("between", 0, 3), ("gt", 7)),
        ("jaw_angle", 10, ("between", 120, 132), ("between", 115, 120), None),
        ("alar_width_ratio", 10, ("between", 0.26, 0.34), ("between", 0.34, 0.40), ("gt", 0.42)),
    ]
    return _score_dimension(m, params)


def score_natural(m: dict) -> float:
    """Fixed: real ranges instead of ("any",) placeholders (Bug 1 fix)."""
    params = [
        ("lid_visibility", 20, ("between", 0.30, 0.55), ("between", 0.55, 0.70), ("lt", 0.25)),
        ("face_ratio", 20, ("between", 1.2, 1.5), ("between", 1.5, 1.65), ("lt", 1.10)),
        ("eye_tilt_angle", 20, ("between", -3, 3), ("between", -6, -3), ("gt", 7)),
        ("nose_bridge_height", 20, ("between", 0.005, 0.020), ("lt", 0.005), ("gt", 0.025)),
        ("lip_height_ratio", 20, ("between", 0.022, 0.045), ("gt", 0.045), None),
    ]
    return _score_dimension(m, params)


def score_androgynous(m: dict) -> float:
    params = [
        ("jaw_angle", 24, ("lt", 122), ("between", 122, 135), ("gt", 140)),
        ("face_ratio", 18, ("between", 1.25, 1.55), ("between", 1.55, 1.70), ("lt", 1.10)),
        ("nose_bridge_height", 16, ("gt", 0.018), ("between", 0.010, 0.018), ("lt", 0.005)),
        ("eye_tilt_angle", 16, ("between", -3, 3), ("between", -6, -3), ("gt", 7)),
        ("eye_aspect_ratio", 14, ("between", 2.3, 3.2), ("between", 2.0, 2.3), ("lt", 1.9)),
        ("lip_height_ratio", 12, ("between", 0.020, 0.035), ("between", 0.035, 0.045), ("gt", 0.048)),
    ]
    return _score_dimension(m, params)


# ═══════════════════════════════════════════════════════════════════════
# Style name mapping & recommendation builder
# ═══════════════════════════════════════════════════════════════════════

STYLE_MAP = {
    "sweet": {"name": "Sweet", "name_en": "Sweet"},
    "sexy": {"name": "Sexy", "name_en": "Sexy"},
    "powerful": {"name": "Powerful", "name_en": "Powerful"},
    "elegant": {"name": "Elegant", "name_en": "Elegant"},
    "natural": {"name": "Natural", "name_en": "Natural"},
    "androgynous": {"name": "Androgynous", "name_en": "Androgynous"},
}


def _match_level(score: float) -> str:
    if score >= 80:
        return "STRONG"
    elif score >= 60:
        return "MODERATE"
    elif score >= 40:
        return "MILD"
    else:
        return "LOW"


def build_recommendations(scores: dict) -> list:
    """Build sorted recommendation list from style scores."""
    recs = []
    for style_key, score in scores.items():
        recs.append({
            "style": style_key,
            "style_name": STYLE_MAP[style_key]["name_en"],
            "score": score,
            "match": _match_level(score),
        })
    recs.sort(key=lambda x: x["score"], reverse=True)
    return recs


# ═══════════════════════════════════════════════════════════════════════
# Landmark extraction for frontend visualization
# ═══════════════════════════════════════════════════════════════════════

def _extract_forehead_contour(raw_landmarks: list) -> list:
    """Extract extrapolated forehead contour points for full face outline.

    MediaPipe's forehead landmarks (FOREHEAD_CONTOUR) sit at roughly the
    upper-brow level, NOT at the actual hairline. To produce a more
    realistic face-outline visualisation we push each forehead point
    upward (lower y in image coords) by a fraction of the brow→chin
    distance, scaling more at the center (top of head) and less at the
    temples so the contour follows a natural rounded shape.

    This is purely cosmetic — metric calculations are unaffected.
    """
    lm = raw_landmarks
    if len(lm) < 478:
        return [{"x": round(lm[i]["x"], 5), "y": round(lm[i]["y"], 5)}
                for i in FOREHEAD_CONTOUR if i < len(lm)]

    # Reference heights: average brow y and chin y
    brow_avg_y = (lm[BROW_PEAK_R]["y"] + lm[BROW_PEAK_L]["y"]) / 2.0
    chin_y = lm[CHIN_BOTTOM]["y"]
    face_h = max(chin_y - brow_avg_y, 1e-6)

    # Face center x for weighting (center gets more lift)
    face_cx = (lm[CHEEK_R]["x"] + lm[CHEEK_L]["x"]) / 2.0
    face_half_w = max(abs(lm[CHEEK_R]["x"] - lm[CHEEK_L]["x"]) / 2.0, 1e-6)

    # Base upward shift: 30% of brow-to-chin distance
    base_lift = face_h * 0.30

    result = []
    n = len(FOREHEAD_CONTOUR)
    for idx, lm_idx in enumerate(FOREHEAD_CONTOUR):
        if lm_idx >= len(lm):
            continue
        px = lm[lm_idx]["x"]
        py = lm[lm_idx]["y"]

        # Lateral factor: 1.0 at center, ~0.35 at temples
        lateral = abs(px - face_cx) / face_half_w
        lateral = min(lateral, 1.0)
        center_weight = 1.0 - 0.65 * lateral

        # Parabolic boost at center of the contour array (index-based)
        t = idx / max(n - 1, 1)  # 0 → 1 across the contour
        parabola = 1.0 - (2.0 * t - 1.0) ** 2  # peaks at center

        lift = base_lift * center_weight * (0.5 + 0.5 * parabola)

        result.append({
            "x": round(px, 5),
            "y": round(py - lift, 5),
        })

    return result


def _extract_key_landmarks(raw_landmarks: list) -> dict:
    """Extract landmark groups for frontend SVG overlay rendering.

    Returns a dict with named groups of normalised {x, y} points.
    """
    def _pts(indices):
        return [{"x": round(raw_landmarks[i]["x"], 5),
                 "y": round(raw_landmarks[i]["y"], 5)}
                for i in indices if i < len(raw_landmarks)]

    return {
        "jawline": _pts(JAWLINE),
        "forehead_contour": _extract_forehead_contour(raw_landmarks),
        "right_brow": _pts(RIGHT_BROW),
        "left_brow": _pts(LEFT_BROW),
        "right_eye": _pts(RIGHT_EYE),
        "left_eye": _pts(LEFT_EYE),
        "nose_bridge": _pts(NOSE_BRIDGE),
        "nose_base": _pts(NOSE_BASE),
        "outer_lip": _pts(OUTER_LIP),
        "inner_lip": _pts(INNER_LIP),
    }


# ═══════════════════════════════════════════════════════════════════════
# Main analysis function
# ═══════════════════════════════════════════════════════════════════════

def analyze_face_from_raw_landmarks(raw_landmarks: list, img_w: int, img_h: int) -> dict:
    """Full pipeline: raw 478-pt landmarks → metrics → classification → scoring.

    raw_landmarks: list of 478 dicts with keys {x, y, z} (normalised 0-1).
    img_w, img_h: original image dimensions (REQUIRED for aspect-ratio correction).
    """
    metrics = compute_metrics(raw_landmarks, img_w, img_h)

    logger.info(
        f"[BeautyFit v2.1] img={img_w}x{img_h} Metrics: face_ratio={metrics['face_ratio']}, "
        f"jaw_angle={metrics['jaw_angle']}, jaw_ratio={metrics['jaw_ratio']}, "
        f"forehead_ratio={metrics['forehead_ratio']}, chin_ratio={metrics['chin_ratio']}, "
        f"EAR={metrics['EAR']}, eye_aspect_ratio={metrics['eye_aspect_ratio']}, "
        f"eye_tilt_angle={metrics['eye_tilt_angle']}, "
        f"lid_visibility={metrics['lid_visibility']}, "
        f"nose_bridge_height={metrics['nose_bridge_height']}, "
        f"lip_height_ratio={metrics['lip_height_ratio']}, "
        f"cupid_bow_ratio={metrics['cupid_bow_ratio']}"
    )

    face_shape = classify_face_shape(metrics)
    eye_tags = classify_eye_tags(metrics)
    facial_tags = classify_facial_tags(metrics)

    style_scores = {
        "sweet": score_sweet(metrics),
        "sexy": score_sexy(metrics),
        "powerful": score_powerful(metrics),
        "elegant": score_elegant(metrics),
        "natural": score_natural(metrics),
        "androgynous": score_androgynous(metrics),
    }

    recommendations = build_recommendations(style_scores)
    landmark_groups = _extract_key_landmarks(raw_landmarks)
    forehead_contour = _extract_forehead_contour(raw_landmarks)

    return {
        "face_shape": face_shape,
        "eye_tags": eye_tags,
        "facial_tags": facial_tags,
        "metrics": metrics,
        "style_scores": style_scores,
        "recommendations": recommendations,
        "landmark_groups": landmark_groups,
        "forehead_contour": forehead_contour,
    }


def decode_base64_image(data_uri: str) -> bytes:
    """Decode a base64 data URI or raw base64 string to bytes."""
    if "," in data_uri:
        data_uri = data_uri.split(",", 1)[1]
    return base64.b64decode(data_uri)