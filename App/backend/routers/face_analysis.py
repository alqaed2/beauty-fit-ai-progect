"""
Face Analysis API Router — MediaPipe 478-pt native (v2.0).

Accepts pre-detected 478 normalised landmarks from the browser-side
MediaPipe FaceLandmarker, computes metrics directly from the 478 points
(no dlib 68-pt mapping), classifies features, and returns style scores.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/face-analysis", tags=["face-analysis"])


# ─── Request / Response schemas ───────────────────────────────────────

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float = 0.0


class LandmarkAnalysisRequest(BaseModel):
    """478 normalised landmarks detected in the browser."""
    landmarks: list[LandmarkPoint]
    image_width: int
    image_height: int


class MetricsResponse(BaseModel):
    face_ratio: float
    jaw_ratio: float
    jaw_angle: float
    eye_aspect_ratio: float
    eye_tilt_angle: float
    eye_spacing_ratio: float
    lid_visibility: float
    nose_bridge_height: float
    alar_width_ratio: float
    lip_width_ratio: float
    lip_height_ratio: float
    cupid_bow_ratio: float
    forehead_ratio: float
    chin_ratio: float


class StyleScoresResponse(BaseModel):
    sweet: float
    sexy: float
    powerful: float
    elegant: float
    natural: float
    androgynous: float


class RecommendationItem(BaseModel):
    style: str
    style_name: str
    score: float
    match: str


class LandmarkPointOut(BaseModel):
    x: float
    y: float


class LandmarkGroupsResponse(BaseModel):
    jawline: list[LandmarkPointOut] = []
    forehead_contour: list[LandmarkPointOut] = []
    right_brow: list[LandmarkPointOut] = []
    left_brow: list[LandmarkPointOut] = []
    right_eye: list[LandmarkPointOut] = []
    left_eye: list[LandmarkPointOut] = []
    nose_bridge: list[LandmarkPointOut] = []
    nose_base: list[LandmarkPointOut] = []
    outer_lip: list[LandmarkPointOut] = []
    inner_lip: list[LandmarkPointOut] = []


class FaceAnalysisResponse(BaseModel):
    face_shape: str
    eye_tags: list[str]
    facial_tags: list[str]
    metrics: MetricsResponse
    style_scores: StyleScoresResponse
    recommendations: list[RecommendationItem]
    landmark_groups: LandmarkGroupsResponse
    forehead_contour: list[LandmarkPointOut] = []


# ─── Endpoint ─────────────────────────────────────────────────────────

@router.post("/analyze-landmarks", response_model=FaceAnalysisResponse)
async def analyze_landmarks(data: LandmarkAnalysisRequest):
    """Analyse pre-detected 478-pt landmarks and return style scores."""
    try:
        from services.face_analysis import (
            analyze_face_from_raw_landmarks,
        )

        if len(data.landmarks) < 468:
            raise HTTPException(
                status_code=422,
                detail=f"Expected ≥468 landmarks, got {len(data.landmarks)}. "
                       "Please upload a clear, front-facing photo.",
            )

        # Convert Pydantic models to simple dicts for the service
        raw_landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in data.landmarks]

        analysis = analyze_face_from_raw_landmarks(
            raw_landmarks, data.image_width, data.image_height
        )

        m = analysis["metrics"]

        # Build landmark groups response
        lg = analysis["landmark_groups"]
        landmark_groups = LandmarkGroupsResponse(
            jawline=[LandmarkPointOut(**pt) for pt in lg.get("jawline", [])],
            forehead_contour=[LandmarkPointOut(**pt) for pt in lg.get("forehead_contour", [])],
            right_brow=[LandmarkPointOut(**pt) for pt in lg.get("right_brow", [])],
            left_brow=[LandmarkPointOut(**pt) for pt in lg.get("left_brow", [])],
            right_eye=[LandmarkPointOut(**pt) for pt in lg.get("right_eye", [])],
            left_eye=[LandmarkPointOut(**pt) for pt in lg.get("left_eye", [])],
            nose_bridge=[LandmarkPointOut(**pt) for pt in lg.get("nose_bridge", [])],
            nose_base=[LandmarkPointOut(**pt) for pt in lg.get("nose_base", [])],
            outer_lip=[LandmarkPointOut(**pt) for pt in lg.get("outer_lip", [])],
            inner_lip=[LandmarkPointOut(**pt) for pt in lg.get("inner_lip", [])],
        )

        return FaceAnalysisResponse(
            face_shape=analysis["face_shape"],
            eye_tags=analysis["eye_tags"],
            facial_tags=analysis["facial_tags"],
            metrics=MetricsResponse(
                face_ratio=m["face_ratio"],
                jaw_ratio=m["jaw_ratio"],
                jaw_angle=m["jaw_angle"],
                eye_aspect_ratio=m["eye_aspect_ratio"],
                eye_tilt_angle=m["eye_tilt_angle"],
                eye_spacing_ratio=m["eye_spacing_ratio"],
                lid_visibility=m["lid_visibility"],
                nose_bridge_height=m["nose_bridge_height"],
                alar_width_ratio=m["alar_width_ratio"],
                lip_width_ratio=m["lip_width_ratio"],
                lip_height_ratio=m["lip_height_ratio"],
                cupid_bow_ratio=m["cupid_bow_ratio"],
                forehead_ratio=m["forehead_ratio"],
                chin_ratio=m["chin_ratio"],
            ),
            style_scores=StyleScoresResponse(**analysis["style_scores"]),
            recommendations=[
                RecommendationItem(**r) for r in analysis["recommendations"]
            ],
            landmark_groups=landmark_groups,
            forehead_contour=[
                LandmarkPointOut(**pt) for pt in analysis.get("forehead_contour", [])
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face analysis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Face analysis failed: {str(e)}",
        )