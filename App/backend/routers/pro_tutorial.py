"""Pro tutorial router — personalized makeup tutorials for paid users."""

import logging

from fastapi import APIRouter, HTTPException, status
from schemas.pro_tutorial import (
    ProTutorialRequest,
    ProTutorialResponse,
    StylizeRequest,
    StylizeResponse,
)
from services.pro_tutorial import generate_pro_tutorial, stylize_user_photo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pro", tags=["pro-tutorial"])


@router.post("/tutorial", response_model=ProTutorialResponse)
async def post_pro_tutorial(
    req: ProTutorialRequest,
) -> ProTutorialResponse:
    """Generate a personalized Pro makeup tutorial for the given style + profile.

    NOTE (testing phase): Authentication and Pro entitlement checks have been
    temporarily removed so testers can view the complete report end-to-end.
    Re-enable `get_current_user` dependency before production release.
    """
    try:
        logger.info("Generating pro tutorial (testing mode): style=%s", req.style)
        return await generate_pro_tutorial(req)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Pro tutorial generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate pro tutorial.",
        )


@router.post("/stylize", response_model=StylizeResponse)
async def post_stylize(req: StylizeRequest) -> StylizeResponse:
    """Generate an AI-stylized makeup image from the user's photo.

    Accepts the user's photo (base64 data URI or URL) and returns a new image
    with the requested style + sub-style applied via img2img.
    """
    try:
        logger.info(
            "Stylize request: style=%s sub_style=%s",
            req.style,
            req.sub_style or "overall",
        )
        image_ref = await stylize_user_photo(
            style=req.style,
            sub_style=req.sub_style,
            image=req.image,
        )
        return StylizeResponse(
            style=req.style,
            sub_style=req.sub_style,
            image=image_ref,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("Stylize bad request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        # Surface platform-level conditions (timeout, insufficient balance)
        # with their original human-readable message and a 503 so the UI can
        # show it instead of a generic "failed" toast.
        msg = str(exc)
        logger.warning("Stylize unavailable: %s", msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=msg or "Stylize service is temporarily unavailable.",
        )
    except Exception as exc:
        logger.exception("Stylize failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate stylized image.",
        )