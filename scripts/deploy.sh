#!/usr/bin/env bash
set -e

NETWORK="testnet"
ADMIN_KEYPAIR="${ADMIN_SECRET:?Need ADMIN_SECRET env var}"

echo "==> Building token contract..."
cd contract/token
cargo build --release --target wasm32-unknown-unknown
TOKEN_WASM="target/wasm32-unknown-unknown/release/token.wasm"

echo "==> Deploying token contract..."
TOKEN_ID=$(stellar contract deploy \
  --wasm "$TOKEN_WASM" \
  --source "$ADMIN_KEYPAIR" \
  --network "$NETWORK")
echo "Token contract deployed: $TOKEN_ID"

echo "==> Initializing token contract..."
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$ADMIN_KEYPAIR" \
  --network "$NETWORK" \
  -- init \
  --admin "$(stellar keys address admin)" \
  --name "StellarSwap Token" \
  --symbol "SST" \
  --supply 1000000000000000

echo "==> Building swap contract..."
cd ../swap
cargo build --release --target wasm32-unknown-unknown
SWAP_WASM="target/wasm32-unknown-unknown/release/swap.wasm"

echo "==> Deploying swap contract..."
SWAP_ID=$(stellar contract deploy \
  --wasm "$SWAP_WASM" \
  --source "$ADMIN_KEYPAIR" \
  --network "$NETWORK")
echo "Swap contract deployed: $SWAP_ID"

echo "==> Initializing swap contract..."
stellar contract invoke \
  --id "$SWAP_ID" \
  --source "$ADMIN_KEYPAIR" \
  --network "$NETWORK" \
  -- init \
  --admin "$(stellar keys address admin)" \
  --token-contract "$TOKEN_ID" \
  --xlm-seed 500000000000 \
  --token-seed 5000000000000000

echo ""
echo "=== Deployment complete ==="
echo "VITE_TOKEN_CONTRACT=$TOKEN_ID"
echo "VITE_SWAP_CONTRACT=$SWAP_ID"
echo ""
echo "Add these to your .env file."
