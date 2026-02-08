"""
Sui Network Service

Service for interacting with the Sui blockchain for USDC escrow operations.

Supported operations:
- Building deposit transactions for user signing
- Submitting signed transactions to the network
- Releasing escrowed funds to merchants (admin)
- Refunding escrowed funds to users (admin)
"""
import logging
from decimal import Decimal
from typing import Any, Dict, Optional

from pysui import SuiConfig, SyncClient
from pysui.sui.sui_crypto import SuiAddress
from pysui.sui.sui_txn import SyncTransaction
from pysui.sui.sui_types.scalars import ObjectID, SuiString

from ..config import settings

logger = logging.getLogger(__name__)


class SuiService:
    """
    Service for interacting with Sui network.
    
    Handles USDC escrow deposits, releases, and refunds.
    """

    def __init__(
        self,
        network: str = "testnet",
        admin_private_key: Optional[str] = None,
        package_id: Optional[str] = None,
        usdc_coin_type: Optional[str] = None,
    ) -> None:
        """
        Initialize Sui service.
        
        Args:
            network: 'testnet', 'devnet', or 'mainnet'
            admin_private_key: Admin's Sui private key for signing transactions
            package_id: Deployed escrow contract package ID
            usdc_coin_type: USDC coin type on Sui (e.g., 0x...)
        """
        self.network = network
        self.admin_private_key = admin_private_key or settings.sui_admin_private_key
        self.package_id = package_id or settings.sui_package_id
        self.usdc_coin_type = usdc_coin_type or settings.sui_usdc_coin_type
        
        # Set up Sui client
        if network == "mainnet":
            config = SuiConfig.mainnet_config()
        elif network == "devnet":
            config = SuiConfig.devnet_config()
        else:  # testnet
            config = SuiConfig.testnet_config()
        
        self.client = SyncClient(config)
        
        # Load admin keypair if provided
        if self.admin_private_key:
            try:
                # The admin address will be derived from private key by pysui
                logger.info(f"Sui service initialized for {network}")
            except Exception as e:
                logger.error(f"Failed to initialize Sui client: {e}")
        else:
            logger.warning("Admin private key not configured - admin operations will not work")

    def build_deposit_transaction(
        self,
        user_address: str,
        amount_cents: int,
        merchant_address: str,
        card_id: str,
    ) -> Dict[str, Any]:
        """
        Build a deposit transaction for user to sign.
        
        Args:
            user_address: User's Sui address
            amount_cents: Amount in cents (e.g., 250 = $2.50 USDC)
            merchant_address: Merchant's Sui address to receive funds
            card_id: Virtual card ID for tracking
            
        Returns:
            dict with transaction details for client-side signing:
            {
                "transaction_block": {...},
                "amount_usdc": "2.50",
                "user_address": "0x...",
                "merchant_address": "0x...",
                "card_id": "..."
            }
        """
        try:
            # Convert cents to USDC (6 decimals for USDC on Sui)
            amount_usdc = Decimal(amount_cents) / Decimal(100)
            amount_mist = int(amount_usdc * 1_000_000)  # USDC has 6 decimals
            
            logger.info(f"Building deposit transaction: {amount_usdc} USDC from {user_address}")
            
            # Create transaction block
            txn = SyncTransaction(client=self.client, initial_sender=SuiAddress(user_address))
            
            # Split USDC coin for the exact amount needed
            split_coin = txn.split_coin(
                coin=txn.gas,  # Use gas coin, will be adjusted for USDC
                amounts=[amount_mist]
            )
            
            # Call escrow deposit function
            txn.move_call(
                target=f"{self.package_id}::escrow::deposit",
                arguments=[
                    split_coin,
                    SuiAddress(merchant_address),
                    SuiString(card_id),
                ],
                type_arguments=[self.usdc_coin_type],
            )
            
            # Build the transaction (but don't execute)
            result = txn.inspect_all()
            
            return {
                "success": True,
                "transaction_data": result,
                "amount_usdc": str(amount_usdc),
                "user_address": user_address,
                "merchant_address": merchant_address,
                "card_id": card_id,
            }
            
        except Exception as e:
            logger.error(f"Failed to build deposit transaction: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def submit_signed_transaction(
        self,
        signed_transaction: str,
    ) -> Dict[str, Any]:
        """
        Submit a signed transaction to the network.
        
        Args:
            signed_transaction: Base64-encoded signed transaction from user's wallet
            
        Returns:
            dict with transaction result:
            {
                "success": True,
                "digest": "abc123...",
                "escrow_id": "0x..."
            }
        """
        try:
            # Execute the signed transaction
            result = self.client.execute_tx(signed_transaction)
            
            digest = result.digest if hasattr(result, 'digest') else None
            
            # Extract escrow object ID from events
            escrow_id = None
            if hasattr(result, 'events'):
                for event in result.events:
                    if 'DepositEvent' in str(event):
                        # Parse escrow ID from event
                        escrow_id = getattr(event, 'escrow_id', None)
            
            logger.info(f"Transaction submitted successfully: {digest}")
            
            return {
                "success": True,
                "digest": digest,
                "escrow_id": escrow_id,
            }
            
        except Exception as e:
            logger.error(f"Failed to submit transaction: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def release_escrow(
        self,
        escrow_id: str,
    ) -> Dict[str, Any]:
        """
        Release escrowed funds to merchant (admin operation).
        
        Args:
            escrow_id: Escrow object ID
            
        Returns:
            dict with transaction result
        """
        try:
            if not self.admin_private_key:
                raise ValueError("Admin private key not configured")
            
            logger.info(f"Releasing escrow {escrow_id}")
            
            # Create admin transaction
            txn = SyncTransaction(client=self.client)
            
            # Get admin cap object
            # TODO: Query for AdminCap object owned by admin
            
            # Call release function
            txn.move_call(
                target=f"{self.package_id}::escrow::release",
                arguments=[
                    # admin_cap,
                    ObjectID(escrow_id),
                ],
                type_arguments=[self.usdc_coin_type],
            )
            
            result = txn.execute()
            digest = result.digest if hasattr(result, 'digest') else None
            
            logger.info(f"Escrow released successfully: {digest}")
            
            return {
                "success": True,
                "digest": digest,
                "escrow_id": escrow_id,
            }
            
        except Exception as e:
            logger.error(f"Failed to release escrow: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def refund_escrow(
        self,
        escrow_id: str,
    ) -> Dict[str, Any]:
        """
        Refund escrowed funds to user (admin operation).
        
        Args:
            escrow_id: Escrow object ID
            
        Returns:
            dict with transaction result
        """
        try:
            if not self.admin_private_key:
                raise ValueError("Admin private key not configured")
            
            logger.info(f"Refunding escrow {escrow_id}")
            
            # Create admin transaction
            txn = SyncTransaction(client=self.client)
            
            # Call refund function
            txn.move_call(
                target=f"{self.package_id}::escrow::refund",
                arguments=[
                    # admin_cap,
                    ObjectID(escrow_id),
                ],
                type_arguments=[self.usdc_coin_type],
            )
            
            result = txn.execute()
            digest = result.digest if hasattr(result, 'digest') else None
            
            logger.info(f"Escrow refunded successfully: {digest}")
            
            return {
                "success": True,
                "digest": digest,
                "escrow_id": escrow_id,
            }
            
        except Exception as e:
            logger.error(f"Failed to refund escrow: {e}")
            return {
                "success": False,
                "error": str(e),
            }
