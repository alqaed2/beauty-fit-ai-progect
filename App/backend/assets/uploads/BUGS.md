# BeautyFit Face Analysis — Bug Report

File: `backend/services/face_analysis.py`

---

## Bug 1 (Critical): `score_natural` always returns 80–100

**Location:** `face_analysis.py`, lines 332–340, function `score_natural`

**Problem:**
Four of five parameters use `("any",)` as their `best_range`. The `_tier_coeff` function returns `1.0` for any `"any"` range, so those four parameters always contribute their full weight regardless of the actual face. The minimum possible score is always **80/100**, making every face a `STRONG` natural match.

**Current code:**
```python
def score_natural(m: dict) -> float:
    params = [
        ("lid_visibility", 20, ("any",), None, None),
        ("face_ratio", 20, ("any",), None, None),
        ("eye_tilt_angle", 20, ("any",), None, None),
        ("nose_bridge_height", 20, ("any",), None, None),
        ("lip_height_ratio", 20, ("between", 0.022, 0.045), ("gt", 0.045), None),
    ]
    return _score_dimension(m, params)
```

**Fix:**
Replace the `("any",)` placeholders with real best/ok/weak ranges for each metric, matching the thresholds used in the other five scoring functions. For example:

```python
def score_natural(m: dict) -> float:
    params = [
        ("lid_visibility",      20, ("between", 0.30, 0.55), ("between", 0.55, 0.70), ("lt", 0.25)),
        ("face_ratio",          20, ("between", 1.2, 1.5),   ("between", 1.5, 1.65),  ("lt", 1.10)),
        ("eye_tilt_angle",      20, ("between", -3, 3),       ("between", -6, -3),     ("gt", 7)),
        ("nose_bridge_height",  20, ("between", 0.05, 0.08),  ("lt", 0.05),            ("gt", 0.09)),
        ("lip_height_ratio",    20, ("between", 0.022, 0.045),("gt", 0.045),           None),
    ]
    return _score_dimension(m, params)
```

---

## Bug 2 (Critical): `eye_tilt_angle` is approximately 90° for every face

**Location:** `face_analysis.py`, lines 120–122

**Problem:**
`tilt_r` and `tilt_l` are computed in **opposite directions** relative to the x-axis:

- Right eye: angle goes from outer corner `pts[36]` (smaller x) → inner corner `pts[39]` (larger x), so `dx` is positive.
- Left eye: angle goes from inner corner `pts[42]` (smaller x) → outer corner... wait, the formula uses `pts[42] - pts[45]`, meaning `dx` is **negative** (going right-to-left).

For a symmetric face with flat horizontal eyes this produces `tilt_r = 0°` and `tilt_l = 180°`, averaging to **90°**. For slightly upturned eyes it is `tilt_r ≈ +5°`, `tilt_l ≈ +175°`, averaging to **≈ 90°**. Every face ends up with `eye_tilt_angle ≈ 90°`, which falls into the `weak` tier (or no tier) in all scoring functions. Since eye tilt has a weight of 14–22 in five of the six dimensions, every face receives an identical tilt contribution and upturned/downturned classification never fires.

**Current code:**
```python
tilt_r = math.degrees(math.atan2(pts[39][1] - pts[36][1], pts[39][0] - pts[36][0]))
tilt_l = math.degrees(math.atan2(pts[42][1] - pts[45][1], pts[42][0] - pts[45][0]))
eye_tilt_angle = (tilt_r + tilt_l) / 2
```

**Fix:**
Flip the left eye formula so both angles measure in the same relative direction (inner → outer):

```python
tilt_r = math.degrees(math.atan2(pts[39][1] - pts[36][1], pts[39][0] - pts[36][0]))
tilt_l = math.degrees(math.atan2(pts[45][1] - pts[42][1], pts[45][0] - pts[42][0]))
eye_tilt_angle = (tilt_r + tilt_l) / 2
```

---

## Bug 3 (Minor): `eye_height` sign is inverted (rescued by `abs()`)

**Location:** `face_analysis.py`, lines 110–113

**Problem:**
Upper eyelid points have a smaller y-value (higher in the image) and lower eyelid points have a larger y-value. The current formula subtracts `min(lower_y)` from `max(upper_y)`, which yields a negative number. The `abs()` call on line 112 masks the error, but the formula logic is inverted and will silently misbehave if the sign assumption ever changes.

**Current code:**
```python
eye_height_r = (max(pts[37][1], pts[38][1]) - min(pts[40][1], pts[41][1]))
eye_height_l = (max(pts[43][1], pts[44][1]) - min(pts[46][1], pts[47][1]))
eye_height_r = abs(eye_height_r) if eye_height_r != 0 else 1
eye_height_l = abs(eye_height_l) if eye_height_l != 0 else 1
```

**Fix:**
Swap the operands so the subtraction is naturally positive, then the `abs()` guards can be simplified:

```python
eye_height_r = max(pts[40][1], pts[41][1]) - min(pts[37][1], pts[38][1])
eye_height_l = max(pts[46][1], pts[47][1]) - min(pts[43][1], pts[44][1])
eye_height_r = eye_height_r if eye_height_r > 0 else 1
eye_height_l = eye_height_l if eye_height_l > 0 else 1
```
