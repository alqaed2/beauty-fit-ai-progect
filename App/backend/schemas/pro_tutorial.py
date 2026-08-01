"""Schemas for Pro tutorial generation."""

from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


class ProTutorialRequest(BaseModel):
    style: str = Field(..., description="Style id, e.g. 'sweet', 'elegant'.")
    face_shape: Optional[str] = Field(default=None, description="Detected face shape.")
    eye_tags: Optional[List[str]] = Field(default_factory=list)
    facial_tags: Optional[List[str]] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = Field(default=None)
    score: Optional[float] = Field(default=None, description="Style match score 0-100.")


class TutorialStep(BaseModel):
    title: str
    description: str
    products: List[str] = Field(default_factory=list)
    technique: str = ""


class SubStyle(BaseModel):
    name: str
    summary: str
    best_for: str = ""


class ProTutorialResponse(BaseModel):
    style: str
    overview: str
    personalized_analysis: str
    steps: List[TutorialStep]
    sub_styles: List[SubStyle] = Field(default_factory=list)
    recommended_sub_style: Optional[str] = None
    color_palette: List[str] = Field(default_factory=list)
    pro_tips: List[str] = Field(default_factory=list)
    simulation_prompt: str = Field(
        default="",
        description="A prompt suitable for image generation to simulate the final look.",
    )


class StylizeRequest(BaseModel):
    """Request to stylize a user photo into a specific makeup look."""

    style: str = Field(..., description="Style id, e.g. 'sweet', 'elegant'.")
    sub_style: Optional[str] = Field(
        default=None,
        description=(
            "Sub-style display name (e.g. 'Quiet Luxury'). "
            "If omitted, the overall style prompt is used."
        ),
    )
    image: str = Field(
        ...,
        description=(
            "User photo as base64 data URI (e.g. data:image/jpeg;base64,...) "
            "or an http(s) URL."
        ),
    )


class StylizeResponse(BaseModel):
    style: str
    sub_style: Optional[str] = None
    image: str = Field(..., description="Generated image URL or base64 data URI.")