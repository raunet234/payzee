"""
Application Configuration

Centralized configuration management using Pydantic Settings.
All environment variables are loaded and validated here.
"""
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


# =============================================================================
# Path Configuration
# =============================================================================

BACKEND_DIR = Path(__file__).parent.parent  # Parent of src/ directory
ENV_FILE = BACKEND_DIR / ".env"


# =============================================================================
# Settings Class
# =============================================================================


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All configuration values can be overridden via environment variables
    or a .env file in the backend directory.
    """

    # -------------------------------------------------------------------------
    # API Security
    # -------------------------------------------------------------------------
    api_key: str = "changeme"

    # -------------------------------------------------------------------------
    # Lithic Configuration (Virtual Card Provider)
    # -------------------------------------------------------------------------
    lithic_api_key: str = ""
    lithic_environment: Literal["sandbox", "production"] = "sandbox"
    lithic_webhook_secret: str = ""  # Used for webhook signature verification

    # -------------------------------------------------------------------------
    # Sui Blockchain Configuration
    # -------------------------------------------------------------------------
    sui_network: Literal["testnet", "devnet", "mainnet"] = "testnet"
    sui_rpc_url: str = "https://fullnode.testnet.sui.io:443"
    sui_admin_private_key: str = ""  # Admin key for escrow release/refund
    sui_admin_cap_id: str = ""  # Admin capability object ID

    # -------------------------------------------------------------------------
    # Sui Smart Contract
    # -------------------------------------------------------------------------
    sui_package_id: str = ""  # Deployed escrow contract package ID
    sui_usdc_coin_type: str = (
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"
    )

    # -------------------------------------------------------------------------
    # Database
    # -------------------------------------------------------------------------
    database_url: str = "sqlite:///./stellar_pay.db"

    # -------------------------------------------------------------------------
    # Server
    # -------------------------------------------------------------------------
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# =============================================================================
# Global Settings Instance
# =============================================================================

settings = Settings()
