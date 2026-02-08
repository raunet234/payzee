"""Application configuration using Pydantic Settings."""
from typing import Literal
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the backend directory (parent of src/)
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Security
    api_key: str = "changeme"

    # Lithic Configuration
    lithic_api_key: str = ""
    lithic_environment: Literal["sandbox", "production"] = "sandbox"
    lithic_webhook_secret: str = ""  # For webhook signature verification

    # Sui Configuration
    sui_network: Literal["testnet", "devnet", "mainnet"] = "testnet"
    sui_rpc_url: str = "https://fullnode.testnet.sui.io:443"  # Sui RPC endpoint
    sui_admin_private_key: str = ""  # Admin's private key for releasing/refunding escrow
    sui_admin_cap_id: str = ""  # Admin capability object ID

    # Sui Contract
    sui_package_id: str = ""  # Deployed escrow contract package ID
    sui_usdc_coin_type: str = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"  # USDC coin type on Sui

    # Database
    database_url: str = "sqlite:///./stellar_pay.db"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields in .env
    )


# Global settings instance
settings = Settings()
