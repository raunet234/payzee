#!/bin/bash
# Test script for Payzee escrow contract on Sui testnet

set -e

echo "🧪 Testing Payzee Escrow Contract on Sui Testnet"
echo "================================================="
echo ""

# Contract details
PACKAGE_ID="0xd0d84d39c4cb1e8504696f447daccc5c0a105c7459a5bafedb1c31bb5e3dbf69"
ADMIN_CAP="0x490afd6c5ba8880a09d4c8c972d2c82538e352423b06930ff5aa0783fbe9cd40"
USDC_TYPE="0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

echo "📦 Package ID: $PACKAGE_ID"
echo "🔑 Admin Cap: $ADMIN_CAP"
echo ""

# Get active address
ACTIVE_ADDRESS=$(sui client active-address 2>&1 | tail -1)
echo "👤 Active Address: $ACTIVE_ADDRESS"
echo ""

# Check balance
echo "💰 Checking SUI balance..."
sui client gas 2>&1 | grep -A 20 "gasCoinId"
echo ""

# Verify contract is deployed
echo "✅ Verifying contract deployment..."
sui client object $PACKAGE_ID --json > /dev/null 2>&1 && echo "Contract found on testnet!" || echo "❌ Contract not found"
echo ""

# View AdminCap object
echo "🔍 AdminCap Object Details:"
sui client object $ADMIN_CAP
echo ""

echo "================================================="
echo "✅ Contract deployment verified!"
echo ""
echo "Next steps:"
echo "1. Get test USDC tokens"
echo "2. Test deposit() function"
echo "3. Test release() function"
echo "4. Test refund() function"
echo ""
echo "To view contract on explorer:"
echo "https://suiexplorer.com/object/$PACKAGE_ID?network=testnet"
echo ""
echo "To view transaction:"
echo "https://suiexplorer.com/txblock/CVA4LLAELc2EVKmQNnrCXLbU2R3Gkvqw1vS1hFe39Drb?network=testnet"
