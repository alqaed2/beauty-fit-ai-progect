"""Payment router for Stripe checkout sessions."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from services.payment import CheckoutError, PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

payment_service = PaymentService()


class CreatePaymentSessionRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    plan: str = Field(..., description="Plan type: 'one_time' or 'monthly'")
    style_id: Optional[str] = Field(None, description="Style ID for the report")
    success_url: Optional[str] = Field(None, description="URL to redirect after success")
    cancel_url: Optional[str] = Field(None, description="URL to redirect on cancel")


class CreatePaymentSessionResponse(BaseModel):
    """Response with checkout URL."""
    url: Optional[str] = None
    session_id: str = ""


class VerifyPaymentRequest(BaseModel):
    """Request to verify a payment session."""
    session_id: str = Field(..., description="Stripe checkout session ID")


class VerifyPaymentResponse(BaseModel):
    """Response with payment verification result."""
    status: str = ""
    payment_status: str = ""
    plan: str = ""
    style_id: str = ""
    amount_total: int = 0
    currency: str = ""


@router.post("/create_payment_session", response_model=CreatePaymentSessionResponse)
async def create_payment_session(request: Request, body: CreatePaymentSessionRequest):
    """Create a Stripe checkout session for one-time or subscription payment."""
    try:
        # Determine origin for redirect URLs
        origin = str(request.headers.get("origin", ""))
        if not origin:
            referer = str(request.headers.get("referer", ""))
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                origin = f"{parsed.scheme}://{parsed.netloc}"

        # Fallback: use the frontend URL from env or a sensible default
        if not origin:
            import os
            origin = os.environ.get("FRONTEND_URL", "http://localhost:5173")

        success_url = body.success_url or f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = body.cancel_url or f"{origin}/results"

        metadata = {
            "plan": body.plan,
            "style_id": body.style_id or "",
        }

        if body.plan == "monthly":
            # Subscription mode - $7.99/month
            # Use inline price_data for subscription
            from services.payment import CheckoutSessionRequest as StripeRequest
            import stripe
            from core.config import settings

            # Ensure stripe is configured
            await payment_service._auto_reload_stripe_config()

            session = await stripe.checkout.Session.create_async(
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "BeautyFit Pro Monthly",
                            "description": "All top 3 style reports + unlimited regenerations",
                        },
                        "unit_amount": 799,  # $7.99 in cents
                        "recurring": {
                            "interval": "month",
                        },
                    },
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
            )

            return CreatePaymentSessionResponse(
                url=session.url,
                session_id=session.id,
            )
        else:
            # One-time payment - $1.80
            from services.payment import CheckoutSessionRequest as StripeRequest

            stripe_request = StripeRequest(
                amount=1.80,
                currency="usd",
                mode="payment",
                ui_mode="hosted",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
            )

            result = await payment_service.create_checkout_session(stripe_request)

            return CreatePaymentSessionResponse(
                url=result.url,
                session_id=result.session_id,
            )

    except CheckoutError as e:
        logger.error(f"Checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Payment session creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment session: {str(e)}")


@router.post("/verify_payment", response_model=VerifyPaymentResponse)
async def verify_payment(body: VerifyPaymentRequest):
    """Verify a Stripe checkout session status."""
    try:
        result = await payment_service.get_checkout_status(body.session_id)

        return VerifyPaymentResponse(
            status=result.status,
            payment_status=result.payment_status,
            plan=result.metadata.get("plan", ""),
            style_id=result.metadata.get("style_id", ""),
            amount_total=result.amount_total,
            currency=result.currency,
        )

    except CheckoutError as e:
        logger.error(f"Payment verification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify payment: {str(e)}")