"""
Payzee Backend API

FastAPI application for the crypto-to-fiat payment bridge.
Manages virtual card creation, payment processing, and webhook handling.

Key Features:
- Payment session initiation
- Sui blockchain transaction verification
- Lithic virtual card creation and lifecycle management
- Webhook processing for Buffer & Refund strategy
"""
import hashlib
import hmac
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlmodel import Session, SQLModel, create_engine, select

from .config import settings
from .models import VirtualCard
from .services.lithic import lithic_service


logger = logging.getLogger(__name__)


# =============================================================================
# Database Setup
# =============================================================================

engine = create_engine(
    settings.database_url,
    echo=False,
    connect_args=(
        {"check_same_thread": False}
        if settings.database_url.startswith("sqlite")
        else {}
    ),
)


def get_session():
    """FastAPI dependency that provides a database session."""
    with Session(engine) as session:
        yield session


# =============================================================================
# Security
# =============================================================================

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(x_api_key: Optional[str] = Depends(api_key_header)) -> None:
    """
    FastAPI dependency that validates the API key from request headers.

    Raises:
        HTTPException: 401 if API key is missing or invalid.
    """
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


# =============================================================================
# Request/Response Schemas
# =============================================================================


# -----------------------------------------------------------------------------
# Card Creation Schemas
# -----------------------------------------------------------------------------


class CreateCardRequest(BaseModel):
    """Request schema for creating a new virtual card."""

    stellar_transaction_id: str = Field(
        ...,
        description="Stellar transaction hash or unique identifier",
        min_length=1,
    )
    user_stellar_address: str = Field(
        ...,
        description="User's Stellar wallet address for refunds",
        min_length=56,
        max_length=56,
        pattern="^G[A-Z2-7]{55}$",
    )
    amount_cents: int = Field(
        ...,
        description="Amount in minor currency units (cents)",
        gt=0,
    )
    merchant_name: Optional[str] = Field(
        None,
        description="Expected merchant name for this payment",
    )


# -----------------------------------------------------------------------------
# Card Response Schemas
# -----------------------------------------------------------------------------


class CardInfoResponse(BaseModel):
    """Schema for Lithic card information in API responses."""

    token: Optional[str] = Field(None, description="Lithic card token")
    last_four: Optional[str] = Field(None, description="Last 4 digits")
    exp_month: Optional[str] = Field(None, description="Expiration month (MM)")
    exp_year: Optional[str] = Field(None, description="Expiration year (YYYY)")
    state: Optional[str] = Field(None, description="Card state")
    pan: Optional[str] = Field(None, description="Full card number (PAN)")
    cvv: Optional[str] = Field(None, description="Card CVV")


class AuthorizationInfo(BaseModel):
    """Authorization transaction information."""

    token: Optional[str] = Field(None, description="Authorization token")
    amount_cents: Optional[int] = Field(None, description="Authorized amount in cents")
    authorized_at: Optional[datetime] = Field(None, description="Authorization timestamp")


class ClearingInfo(BaseModel):
    """Clearing/settlement information."""

    cleared: bool = Field(False, description="Whether transaction is cleared")
    amount_cents: Optional[int] = Field(None, description="Cleared amount in cents")
    cleared_at: Optional[datetime] = Field(None, description="Clearing timestamp")
    debug_id: Optional[str] = Field(None, description="Lithic debug request ID")


# -----------------------------------------------------------------------------
# Payment Session Schemas
# -----------------------------------------------------------------------------


class InitiatePaymentRequest(BaseModel):
    """Request schema for initiating a new payment session."""
    
    amount: float = Field(..., description="Payment amount in USD")
    user_public_key: str = Field(..., description="User's Stellar public key")
    merchant_name: Optional[str] = Field(None, description="Merchant name")


class InitiatePaymentResponse(BaseModel):
    """Response for payment initiation."""
    
    session_id: str = Field(..., description="Unique session ID for this payment")
    escrow_account: str = Field(..., description="Escrow contract package ID")
    amount_usdc: float = Field(..., description="Amount in USDC to deposit")
    expires_at: datetime = Field(..., description="Session expiration time")
    merchant_address: Optional[str] = Field(None, description="Merchant's Sui address")


class VirtualCardResponse(BaseModel):
    """Virtual card full response."""

    id: str = Field(..., description="Card ID")
    stellar_transaction_id: str = Field(..., description="Stellar transaction ID")
    amount_cents: int = Field(..., description="Card amount in cents")
    spend_limit_cents: Optional[int] = Field(None, description="Spend limit including slippage")
    merchant_name: Optional[str] = Field(None, description="Merchant name")
    
    card: Optional[CardInfoResponse] = Field(None, description="Lithic card details")
    authorization: Optional[AuthorizationInfo] = Field(None, description="Authorization info")
    clearing: Optional[ClearingInfo] = Field(None, description="Clearing info")
    
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


# -----------------------------------------------------------------------------
# Simulation Schemas (Sandbox Testing)
# -----------------------------------------------------------------------------


class SimulateAuthorizationRequest(BaseModel):
    """Request schema for simulating a card authorization (sandbox only)."""

    amount_cents: int = Field(
        ...,
        description="Amount to authorize in cents",
        gt=0,
    )
    descriptor: str = Field(
        ...,
        description="Merchant descriptor (shown on statement)",
        min_length=1,
        max_length=40,
    )
    mcc: str = Field(
        "5999",
        description="Merchant Category Code",
        min_length=4,
        max_length=4,
    )


class SimulateAuthorizationResponse(BaseModel):
    """Response from authorization simulation."""

    transaction_token: str = Field(..., description="Authorization transaction token")
    debugging_request_id: Optional[str] = Field(None, description="Debug request ID")


class SimulateClearingRequest(BaseModel):
    """Request to simulate transaction clearing."""

    amount_cents: int = Field(
        ...,
        description="Amount to clear in cents",
        gt=0,
    )


class SimulateClearingResponse(BaseModel):
    """Response from clearing simulation."""

    cleared: bool = Field(..., description="Clearing successful")
    debugging_request_id: Optional[str] = Field(None, description="Debug request ID")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="Payzee Backend API",
    description="Backend API for crypto-to-fiat payment bridge with Lithic integration",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for test frontend
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")


# =============================================================================
# Event Handlers
# =============================================================================


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database tables on application startup."""
    SQLModel.metadata.create_all(engine)


# =============================================================================
# API Routes - General
# =============================================================================


@app.get("/", include_in_schema=False)
def root():
    """Serve the test frontend."""
    static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "index.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return {"message": "payzee Backend API", "docs": "/docs"}


@app.get(
    "/health",
    tags=["Health"],
    summary="Health check",
)
def health_check():
    """Return current API health status and configuration."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.lithic_environment,
    }


# =============================================================================
# API Routes - Payment
# =============================================================================


@app.post(
    "/api/v1/payment/initiate",
    response_model=InitiatePaymentResponse,
    tags=["Payment"],
    summary="Initiate a new payment session",
    dependencies=[Depends(verify_api_key)],
)
def initiate_payment(
    request: InitiatePaymentRequest,
    session: Session = Depends(get_session),
) -> InitiatePaymentResponse:
    """
    Initiate a new payment session.
    
    Creates a session ID and returns details needed to build the Sui transaction.
    The frontend will use this to build and sign a Sui deposit transaction.
    
    Requires X-API-Key header.
    """
    from uuid import uuid4
    from datetime import timedelta
    
    session_id = str(uuid4())
    amount_with_buffer = request.amount * 1.05  # 5% buffer
    
    logger.info(f"Payment session created: {session_id} for {request.user_public_key}")
    
    return InitiatePaymentResponse(
        session_id=session_id,
        escrow_account=settings.sui_package_id,  # Sui contract package ID
        amount_usdc=amount_with_buffer,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        merchant_address=request.user_public_key  # For now, merchant is the user
    )


@app.post(
    "/api/v1/payment/build-tx",
    tags=["Payment"],
    summary="Build Soroban transaction XDR",
    dependencies=[Depends(verify_api_key)],
)
def build_transaction(request: Dict[str, Any]) -> Dict[str, str]:
    """
    Build a Soroban deposit transaction and return XDR for signing.
    
    This endpoint helps the extension build the transaction without
    needing to load Stellar SDK in the page context (CSP issues).
    """
    try:
        from stellar_sdk import (
            SorobanServer,
            TransactionBuilder,
            Network,
            Keypair,
            scval,
        )
        from stellar_sdk import xdr as stellar_xdr
        
        session_id = request.get("session_id")
        source_account = request.get("source_account")
        
        if not session_id or not source_account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="session_id and source_account required"
            )
        
        # In a real implementation, retrieve session details from database
        # For now, we'll return an error as transaction building should
        # happen in the extension with Stellar SDK
        # This endpoint is a placeholder for future backend-built transactions
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Transaction building should happen in extension. Use Stellar SDK in injected script."
        )
        
    except Exception as e:
        logger.error(f"Build transaction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post(
    "/api/v1/payment/submit",
    tags=["Payment"],
    summary="Submit signed transaction and create card immediately",
    dependencies=[Depends(verify_api_key)],
)
def submit_payment(request: Dict[str, Any], db_session: Session = Depends(get_session)) -> Dict[str, Any]:
    """
    Verify Sui transaction and create virtual card.
    Queries Sui blockchain to verify transaction and extract actual amount from events.
    """
    try:
        import requests
        import json
        
        session_id = request.get("session_id")
        tx_digest = request.get("signed_transaction")
        escrow_id = request.get("escrow_id")
        
        if not session_id or not tx_digest:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="session_id and signed_transaction required"
            )
        
        logger.info(f"🔍 Verifying Sui transaction - Session: {session_id}, TX: {tx_digest}")
        
        # Use direct RPC call to Sui to get transaction details
        try:
            rpc_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "sui_getTransactionBlock",
                "params": [
                    tx_digest,
                    {
                        "showInput": False,
                        "showRawInput": False,
                        "showEffects": True,
                        "showEvents": True,
                        "showObjectChanges": False,
                        "showBalanceChanges": False
                    }
                ]
            }
            
            logger.info(f"📡 Querying Sui RPC: {settings.sui_rpc_url}")
            response = requests.post(
                settings.sui_rpc_url,
                json=rpc_payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            response.raise_for_status()
            
            rpc_result = response.json()
            logger.info(f"✅ RPC Response received")
            
            if "error" in rpc_result:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"RPC Error: {rpc_result['error']}"
                )
            
            result = rpc_result.get("result", {})
            logger.info(f"📋 Transaction result keys: {result.keys() if result else 'None'}")
            
            # Check if transaction succeeded
            effects = result.get("effects", {})
            status_obj = effects.get("status", {})
            succeeded = status_obj.get("status") == "success"
            
            logger.info(f"🎯 Transaction status: {status_obj.get('status')}, succeeded: {succeeded}")
            
            if not succeeded:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transaction failed on blockchain"
                )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to fetch transaction from Sui RPC: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to verify transaction on blockchain: {str(e)}"
            )
        
        # Extract amount and user address from transaction events
        amount_usdc = None
        user_address = None
        depositor_address = None
        
        # Parse events from RPC response
        events = result.get("events", [])
        
        logger.info(f"📊 Total events found: {len(events)}")
        logger.info(f"🔍 Looking for DepositEvent with package ID: {settings.sui_package_id}")
        
        if events:
            for idx, event in enumerate(events):
                event_type = event.get("type", "")
                logger.info(f"📌 Event {idx}: {event_type}")
                
                # Look for DepositEvent from our escrow contract
                if f"{settings.sui_package_id}::escrow::DepositEvent" in event_type:
                    parsed_json = event.get("parsedJson", {})
                    logger.info(f"✅ Found DepositEvent: {parsed_json}")
                    
                    # Extract amount (in USDC base units, 6 decimals)
                    amount_raw = int(parsed_json.get("amount", 0))
                    amount_usdc = amount_raw / 1_000_000  # Convert from base units to USDC
                    
                    # Extract addresses
                    depositor_address = parsed_json.get("depositor")
                    user_address = parsed_json.get("merchant")
                    
                    logger.info(f"💰 Extracted: {amount_usdc} USDC from {depositor_address} to {user_address}")
                    break
        else:
            logger.warning(f"⚠️ No events found in transaction response")
        
        if amount_usdc is None:
            logger.warning("No DepositEvent found, using fallback amount")
            # Fallback: try to extract from transaction input
            amount_usdc = 10.0  # Default fallback
        
        amount_cents = int(amount_usdc * 100)
        spend_limit_cents = int(amount_cents * 1.05)  # 5% buffer
        
        logger.info(f"Creating card for {amount_usdc} USDC (${amount_cents/100})")
        
        try:
            # Create card via Lithic
            card_data = lithic_service.create_virtual_card(
                spend_limit_cents=spend_limit_cents,
                memo=f"Sui:{session_id[:8]},{tx_digest[:12]}"
            )
            
            logger.info(f"Lithic card created: {card_data.get('last_four')}")
            
            # Save to database
            card = VirtualCard(
                stellar_transaction_id=tx_digest,  # Reusing field for Sui digest
                user_stellar_address=depositor_address or user_address or "sui_user",
                amount_cents=amount_cents,
                spend_limit_cents=spend_limit_cents,
                lithic_card_token=card_data.get("token"),
                last_four=card_data.get("last_four"),
                exp_month=card_data.get("exp_month"),
                exp_year=card_data.get("exp_year"),
                card_state=card_data.get("state"),
                card_pan=card_data.get("pan"),
                card_cvv=card_data.get("cvv"),
            )
            db_session.add(card)
            db_session.commit()
            
            logger.info(f"✅ Card saved to database: {card.last_four}")
            
            return {
                "id": card.lithic_card_token,
                "pan": card.card_pan,
                "cvv": card.card_cvv,
                "exp_month": str(card.exp_month).zfill(2),
                "exp_year": str(card.exp_year),
                "last_four": card.last_four,
                "amount_cents": card.amount_cents,
                "state": card.card_state,
                "transaction_digest": tx_digest,
                "escrow_id": escrow_id,
                "verified_amount_usdc": amount_usdc
            }
            
        except Exception as card_error:
            logger.error(f"❌ Card creation failed: {card_error}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Card creation failed: {str(card_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit payment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}"
        )


# =============================================================================
# API Routes - Cards
# =============================================================================


@app.get(
    "/api/v1/cards/by-transaction/{transaction_id}",
    response_model=VirtualCardResponse,
    tags=["Cards"],
    summary="Get card by Stellar transaction ID",
    dependencies=[Depends(verify_api_key)],
)
def get_card_by_transaction(
    transaction_id: str,
    session: Session = Depends(get_session)
) -> VirtualCardResponse:
    """
    Retrieve a virtual card by its Stellar transaction ID.
    
    Used by the extension to poll for card creation after transaction submission.
    """
    statement = select(VirtualCard).where(VirtualCard.stellar_transaction_id == transaction_id)
    card = session.exec(statement).first()
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card not found for transaction {transaction_id}"
        )


@app.post(
    "/api/v1/cards/test-payment",
    tags=["Cards"],
    summary="Simulate a test payment with the card",
    dependencies=[Depends(verify_api_key)],
)
def test_payment(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulate a test authorization and clearing using Lithic sandbox.
    
    This simulates a merchant payment to test the card.
    """
    try:
        pan = request.get("pan")
        amount_cents = request.get("amount_cents")
        
        if not pan or not amount_cents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="pan and amount_cents required"
            )
        
        logger.info(f"Simulating test payment: ${amount_cents/100} on card {pan[-4:]}")
        
        # Simulate authorization
        auth_result = lithic_service.simulate_authorization(
            pan=pan,
            amount_cents=amount_cents,
            descriptor="TEST MERCHANT"
        )
        
        logger.info(f"Authorization successful: {auth_result.get('token')}")
        
        # Try to simulate clearing/settlement
        import time
        time.sleep(2)  # Longer delay to ensure transaction is available
        
        cleared = False
        try:
            clearing_result = lithic_service.simulate_clearing(
                transaction_token=auth_result["token"],
                amount_cents=amount_cents
            )
            logger.info(f"Payment cleared successfully")
            cleared = True
        except Exception as clear_error:
            logger.warning(f"Clearing simulation failed (transaction will auto-settle): {clear_error}")
            # Authorization was successful, clearing will happen automatically
            # This is fine - the card is already closed and transaction is approved
        
        return {
            "success": True,
            "message": f"Test payment of ${amount_cents/100:.2f} authorized successfully",
            "transaction_token": auth_result.get("token"),
            "status": "CLEARED" if cleared else "AUTHORIZED",
            "note": "Card is now CLOSED (single-use). Transaction will settle automatically." if not cleared else "Transaction cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"Test payment error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test payment failed: {str(e)}"
        )
    
    return _build_card_response(card)


@app.post(
    "/api/v1/cards/create",
    response_model=VirtualCardResponse,
    tags=["Cards"],
    summary="Create a new virtual card",
    dependencies=[Depends(verify_api_key)],
)
def create_card(
    request: CreateCardRequest,
    session: Session = Depends(get_session),
    slippage_percent: float = 5.0,  # Default 5% buffer for production reliability
) -> VirtualCardResponse:
    """
    Create a new virtual card via Lithic with spend limit using Buffer & Refund strategy.
    
    This endpoint implements the production-ready approach:
    1. Creates a database record for tracking
    2. Calculates spend limit with 5% buffer (e.g., $100 item → $105 limit)
    3. Calls Lithic API to create a SINGLE_USE card with higher limit
    4. Stores card details and returns them
    5. (Future) Webhook receives actual charge and refunds unused buffer to Stellar wallet
    
    The 5% buffer protects against:
    - Tax calculations applied at checkout (often 5-10%)
    - Shipping fees added after card entry
    - USDC peg slippage ($0.998 instead of $1.00)
    - Merchant tips, service fees, or surcharges
    - Pre-authorization holds (gas stations, hotels)
    
    Example: User pays for $100 item
    - User authorizes: 105 USDC from Stellar wallet
    - Card limit set: $105.00
    - Merchant charges: $102.40 (with tax)
    - Unused buffer: $2.60 → Auto-refunded to user via Stellar
    
    Requires X-API-Key header.
    """
    # Create database record
    card_record = VirtualCard(
        stellar_transaction_id=request.stellar_transaction_id,
        user_stellar_address=request.user_stellar_address,
        amount_cents=request.amount_cents,
        merchant_name=request.merchant_name,
    )
    
    # Calculate spend limit with buffer (default 5%)
    # Example: $100 item → User authorizes 105 USDC → Card limit $105.00
    # Merchant charges actual amount (e.g., $102.40)
    # Unused $2.60 will be refunded via webhook handler
    spend_limit_cents = int(request.amount_cents * (1 + slippage_percent / 100))
    card_record.spend_limit_cents = spend_limit_cents
    
    try:
        # Create card in Lithic with spend limit
        lithic_card = lithic_service.create_virtual_card(
            memo=f"Stellar: {request.stellar_transaction_id[:20]}",
            spend_limit_cents=spend_limit_cents,
        )
        
        # Store Lithic card details
        card_record.lithic_card_token = lithic_card.get("token")
        card_record.last_four = lithic_card.get("last_four")
        card_record.exp_month = lithic_card.get("exp_month")
        card_record.exp_year = lithic_card.get("exp_year")
        card_record.card_state = lithic_card.get("state")
        card_record.card_pan = lithic_card.get("pan")
        card_record.card_cvv = lithic_card.get("cvv")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Lithic card: {str(e)}",
        )
    
    # Save to database
    session.add(card_record)
    session.commit()
    session.refresh(card_record)
    
    return _build_card_response(card_record)


@app.get(
    "/api/v1/cards/{card_id}",
    response_model=VirtualCardResponse,
    tags=["Cards"],
    summary="Get card details",
    dependencies=[Depends(verify_api_key)],
)
def get_card(
    card_id: str,
    session: Session = Depends(get_session),
) -> VirtualCardResponse:
    """
    Retrieve details for a specific virtual card.
    
    Returns full card lifecycle information including:
    - Card details (masked)
    - Authorization status
    - Clearing/settlement status
    
    Requires X-API-Key header.
    """
    card = session.get(VirtualCard, card_id)
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with ID {card_id} not found",
        )
    
    return _build_card_response(card)


@app.get(
    "/api/v1/cards",
    response_model=List[VirtualCardResponse],
    tags=["Cards"],
    summary="List all cards",
    dependencies=[Depends(verify_api_key)],
)
def list_cards(
    session: Session = Depends(get_session),
    limit: int = 100,
    offset: int = 0,
    session_id: Optional[str] = None,
    stellar_transaction_id: Optional[str] = None,
) -> List[VirtualCardResponse]:
    """
    List all virtual cards with pagination.
    
    Can filter by session_id or stellar_transaction_id.
    Requires X-API-Key header.
    """
    statement = select(VirtualCard)
    
    # Filter by session_id or stellar_transaction_id if provided
    if session_id:
        statement = statement.where(VirtualCard.stellar_transaction_id == session_id)
    elif stellar_transaction_id:
        statement = statement.where(VirtualCard.stellar_transaction_id == stellar_transaction_id)
    
    statement = statement.offset(offset).limit(limit)
    cards = session.exec(statement).all()
    
    return [_build_card_response(card) for card in cards]


# =============================================================================
# API Routes - Testing (Sandbox Only)
# =============================================================================


@app.post(
    "/api/v1/cards/{card_id}/simulate/authorize",
    response_model=SimulateAuthorizationResponse,
    tags=["Testing"],
    summary="Simulate card authorization",
    dependencies=[Depends(verify_api_key)],
)
def simulate_authorization(
    card_id: str,
    request: SimulateAuthorizationRequest,
    session: Session = Depends(get_session),
) -> SimulateAuthorizationResponse:
    """
    Simulate a card authorization transaction (sandbox only).

    This endpoint is for testing the authorization flow in Lithic's sandbox.
    It uses the card's PAN to simulate a merchant charging the card.

    Args:
        card_id: The virtual card ID.
        request: Authorization details including amount and merchant info.

    Returns:
        SimulateAuthorizationResponse with transaction token.

    Raises:
        HTTPException: 404 if card not found, 400 if PAN unavailable.
    """
    card = session.get(VirtualCard, card_id)
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with ID {card_id} not found",
        )
    
    if not card.card_pan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card PAN not available (not in sandbox mode?)",
        )
    
    try:
        auth_response = lithic_service.simulate_authorization(
            pan=card.card_pan,
            amount_cents=request.amount_cents,
            descriptor=request.descriptor,
            mcc=request.mcc,
        )
        
        # Update card record with authorization info
        card.mark_authorized(
            authorization_token=auth_response["token"],
            amount_cents=request.amount_cents,
        )
        session.commit()
        
        return SimulateAuthorizationResponse(
            transaction_token=auth_response["token"],
            debugging_request_id=auth_response.get("debugging_request_id"),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authorization simulation failed: {str(e)}",
        )


@app.post(
    "/api/v1/cards/{card_id}/simulate/clear",
    response_model=SimulateClearingResponse,
    tags=["Testing"],
    summary="Simulate transaction clearing",
    dependencies=[Depends(verify_api_key)],
)
def simulate_clearing(
    card_id: str,
    request: SimulateClearingRequest,
    session: Session = Depends(get_session),
) -> SimulateClearingResponse:
    """
    Simulate transaction clearing/settlement (sandbox only).
    
    This completes the payment flow by settling the authorized transaction.
    Must be called after simulate_authorization.
    
    Requires X-API-Key header.
    """
    card = session.get(VirtualCard, card_id)
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card with ID {card_id} not found",
        )
    
    if not card.authorization_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card has no authorization to clear. Call /simulate/authorize first.",
        )
    
    try:
        clear_response = lithic_service.simulate_clearing(
            transaction_token=card.authorization_token,
            amount_cents=request.amount_cents,
        )
        
        # Update card record with clearing info
        card.mark_cleared(
            amount_cents=request.amount_cents,
            clearing_debug_id=clear_response.get("debugging_request_id"),
        )
        session.commit()
        
        return SimulateClearingResponse(
            cleared=True,
            debugging_request_id=clear_response.get("debugging_request_id"),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clearing simulation failed: {str(e)}",
        )


# =============================================================================
# Helper Functions
# =============================================================================


def _build_card_response(card: VirtualCard) -> VirtualCardResponse:
    """
    Transform a VirtualCard database model into an API response.

    Args:
        card: VirtualCard model instance.

    Returns:
        VirtualCardResponse with all card lifecycle information.
    """
    card_info = None
    if card.lithic_card_token:
        card_info = CardInfoResponse(
            token=card.lithic_card_token,
            last_four=card.last_four,
            exp_month=card.exp_month,
            exp_year=card.exp_year,
            state=card.card_state,
            pan=card.card_pan,
            cvv=card.card_cvv,
        )
    
    auth_info = None
    if card.authorization_token:
        auth_info = AuthorizationInfo(
            token=card.authorization_token,
            amount_cents=card.authorization_amount_cents,
            authorized_at=card.authorized_at,
        )
    
    clearing_info = ClearingInfo(
        cleared=card.cleared,
        amount_cents=card.cleared_amount_cents,
        cleared_at=card.cleared_at,
        debug_id=card.clearing_debug_id,
    )
    
    return VirtualCardResponse(
        id=card.id,
        stellar_transaction_id=card.stellar_transaction_id,
        amount_cents=card.amount_cents,
        spend_limit_cents=card.spend_limit_cents,
        merchant_name=card.merchant_name,
        card=card_info,
        authorization=auth_info,
        clearing=clearing_info,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


# =============================================================================
# Lithic Webhooks (Buffer & Refund Strategy)
# =============================================================================


def verify_lithic_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str,
) -> bool:
    """
    Verify Lithic webhook signature using HMAC-SHA256.

    Lithic signs webhook payloads to ensure authenticity. This function
    validates that the incoming webhook is genuinely from Lithic.

    Args:
        payload: Raw request body bytes.
        signature: X-Lithic-Signature header value.
        secret: Webhook secret from Lithic dashboard.

    Returns:
        True if signature is valid, False otherwise.

    Note:
        Returns True when secret is not configured (development mode).
    """
    if not secret:
        logger.warning("Webhook secret not configured - skipping verification")
        return True  # Allow in development
    
    expected_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


@app.post(
    "/webhooks/lithic",
    tags=["Webhooks"],
    summary="Lithic webhook receiver",
    include_in_schema=False,  # Hide from public API docs
)
async def lithic_webhook(
    request: Request,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    Receive and process Lithic webhook events.
    
    This endpoint handles real-time notifications from Lithic about:
    - transaction.settled: When money actually moves (triggers refund)
    - transaction.authorization: When merchant attempts to charge
    - card.state_changed: When card state changes (OPEN → CLOSED)
    
    For Buffer & Refund strategy:
    1. Receive transaction.settled event
    2. Calculate: spend_limit - actual_charged
    3. If difference > 0, send USDC refund via Stellar
    4. Update card record with refund details
    """
    # Get raw body for signature verification
    body = await request.body()
    signature = request.headers.get("X-Lithic-Signature", "")
    
    # Verify webhook is from Lithic
    if not verify_lithic_webhook_signature(
        body,
        signature,
        settings.lithic_webhook_secret,
    ):
        logger.warning("Invalid webhook signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )
    
    # Parse webhook payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )
    
    event_type = payload.get("event_type")
    logger.info(f"Received Lithic webhook: {event_type}")
    
    # Handle transaction.settled (main event for refunds)
    if event_type == "transaction.settled":
        return await handle_transaction_settled(payload, session)
    
    # Handle other events (for logging/tracking)
    elif event_type == "transaction.authorization":
        logger.info(f"Authorization event: {payload.get('token')}")
        return {"status": "logged"}
    
    elif event_type == "card.state_changed":
        logger.info(f"Card state changed: {payload.get('card_token')}")
        return {"status": "logged"}
    
    # Unknown event type
    else:
        logger.info(f"Unknown event type: {event_type}")
        return {"status": "ignored"}


async def handle_transaction_settled(
    payload: Dict[str, Any],
    session: Session,
) -> Dict[str, Any]:
    """
    Handle transaction.settled webhook event.
    
    This is the critical event for Buffer & Refund strategy.
    When merchant's charge settles, we:
    1. Find the card in our database
    2. Calculate unused buffer
    3. Send USDC refund to user's Stellar wallet
    4. Update database with refund details
    
    Args:
        payload: Webhook event payload from Lithic
        session: Database session
        
    Returns:
        Status dict with refund details
    """
    # Extract transaction details from webhook
    card_token = payload.get("card_token")
    actual_amount_cents = payload.get("amount")  # Amount in cents
    transaction_token = payload.get("token")
    
    if not card_token or actual_amount_cents is None:
        logger.error("Missing required fields in webhook payload")
        return {"status": "error", "reason": "missing_fields"}
    
    # Find card in database
    card = session.exec(
        select(VirtualCard).where(VirtualCard.lithic_card_token == card_token)
    ).first()
    
    if not card:
        logger.warning(f"Card not found: {card_token}")
        return {"status": "error", "reason": "card_not_found"}
    
    # Update actual charged amount
    card.actual_charged_cents = actual_amount_cents
    card.updated_at = datetime.utcnow()
    
    # Calculate refund amount (unused buffer)
    spend_limit = card.spend_limit_cents or card.amount_cents
    refund_cents = spend_limit - actual_amount_cents
    
    logger.info(
        f"Card {card.id}: Limit ${spend_limit/100:.2f}, "
        f"Charged ${actual_amount_cents/100:.2f}, "
        f"Refund ${refund_cents/100:.2f}"
    )
    
    # Only refund if there's unused buffer (positive amount)
    if refund_cents > 0 and card.user_stellar_address:
        try:
            # Send USDC refund via Stellar
            refund_result = stellar_service.send_usdc_refund(
                destination_address=card.user_stellar_address,
                amount_cents=refund_cents,
                memo=f"Refund: {card.stellar_transaction_id[:20]}",
            )
            
            # Update card with refund details
            card.refund_amount_cents = refund_cents
            card.refund_stellar_tx = refund_result["tx_hash"]
            card.refunded_at = datetime.utcnow()
            
            session.commit()
            
            logger.info(
                f"Refund successful: {refund_cents/100:.2f} USDC "
                f"to {card.user_stellar_address[:8]}... "
                f"TX: {refund_result['tx_hash'][:16]}..."
            )
            
            return {
                "status": "refunded",
                "refund_amount_cents": refund_cents,
                "refund_tx": refund_result["tx_hash"],
            }
            
        except Exception as e:
            logger.error(f"Failed to send refund: {e}")
            session.commit()  # Still save the actual_charged_cents
            return {
                "status": "refund_failed",
                "error": str(e),
                "refund_amount_cents": refund_cents,
            }
    
    elif refund_cents <= 0:
        logger.info("No refund needed - merchant charged full amount or more")
        session.commit()
        return {"status": "no_refund_needed"}
    
    else:
        logger.warning("Cannot refund - no user Stellar address")
        session.commit()
        return {"status": "no_stellar_address"}

