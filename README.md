# StellarSwap

[![CI/CD](https://github.com/UncleTom29/StellarSwap/actions/workflows/ci.yml/badge.svg)](https://github.com/UncleTom29/StellarSwap/actions/workflows/ci.yml)

A mobile-first AMM DEX on Stellar Testnet — swap XLM and a custom Soroban token (SST) using a constant-product formula with 0.3% fee. Built with React 18 + Vite.

## Features

- **Custom token contract** — SAC-style `SST` token with mint, transfer, balance
- **AMM swap contract** — constant product `x·y=k` with 0.3% fee and inter-contract calls
- **Multi-wallet** — StellarWalletsKit with Freighter, xBull, Albedo and more
- **Live pool stats** — 10s cache, auto-refresh every 15s
- **Balance display** — XLM via Horizon, SST via contract query (12s cache)
- **Event feed** — tracks successful swaps in session state
- **CI/CD pipeline** — GitHub Actions → Vercel deploy

## Contract Addresses (Testnet)

| Contract | ID |
|---|---|
| Swap | `YOUR_SWAP_CONTRACT_ID` |
| Token (SST) | `YOUR_TOKEN_CONTRACT_ID` |

## Setup

### Prerequisites

```bash
npm install
cargo install --locked stellar-cli
```

### Generate & fund a test keypair

```bash
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet
```

### Deploy contracts

```bash
ADMIN_SECRET=$(stellar keys show admin) bash scripts/deploy.sh
```

Copy the printed contract IDs and create your env file:

```bash
cp .env.example .env
# Edit .env and fill in VITE_SWAP_CONTRACT and VITE_TOKEN_CONTRACT
```

### Run locally

```bash
npm run dev
```

## Tests

```bash
npm test
```

## Build & Deploy

```bash
npm run build
npx vercel --prod
```

## Screenshots

| Mobile View | CI Pipeline | Swap TX |
|---|---|---|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

## Suggested Commit Messages

1. `feat: add token Soroban contract with mint/transfer/balance`
2. `feat: add AMM swap contract with constant-product formula`
3. `feat: implement TTL cache utility`
4. `feat: implement error handling with typed errors`
5. `feat: add RPC utils for simulation and TX submission`
6. `feat: implement useWallet hook with StellarWalletsKit`
7. `feat: implement useSwap hook with full TX flow`
8. `feat: build responsive mobile-first UI`
9. `ci: add GitHub Actions CI/CD pipeline with Vercel deploy`
10. `docs: update README with setup and deploy instructions`
