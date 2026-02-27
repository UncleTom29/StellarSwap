import {
  rpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { CFG } from '../config.js';
import { cache } from './cache.js';

export const rpcServer = new rpc.Server(CFG.RPC_URL);

async function buildTx(pk, contractId, method, args) {
  const account = await rpcServer.getAccount(pk);
  const contract = new Contract(contractId);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
}

export async function sim(pk, contractId, method, args = []) {
  const tx = await buildTx(pk, contractId, method, args);
  const result = await rpcServer.simulateTransaction(tx);
  if (rpc.isSimulationError(result)) {
    throw new Error('simulation: ' + result.error);
  }
  return scValToNative(result.result.retval);
}

export async function prep(pk, contractId, method, args = []) {
  const tx = await buildTx(pk, contractId, method, args);
  return rpcServer.prepareTransaction(tx);
}

// Cache TTLs: pool data is cheap to re-fetch (10s), balances change after swaps (12s),
// swap counter changes less critically (8s)
const STROOPS = 10_000_000;
const TTL_POOL = 10_000;
const TTL_BAL = 12_000;
const TTL_SWAPS = 8_000;

export async function getPool(pk) {
  const key = `pool:${pk}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const raw = await sim(pk, CFG.CONTRACT_SWAP, 'get_pool', []);
  const pool = {
    xlmReserve: Number(raw.xlm_reserve) / STROOPS,
    tokenReserve: Number(raw.token_reserve) / STROOPS,
    rate: Number(raw.token_reserve) / Number(raw.xlm_reserve),
    tokenContract: raw.token_contract,
  };
  cache.set(key, pool, TTL_POOL);
  return pool;
}

export async function getPrice(pk, xlmIn) {
  const args = [nativeToScVal(Math.round(xlmIn * STROOPS), { type: 'i128' })];
  const raw = await sim(pk, CFG.CONTRACT_SWAP, 'get_price', args);
  return Number(raw) / STROOPS;
}

export async function getTotalSwaps(pk) {
  const key = `swaps:${pk}`;
  const cached = cache.get(key);
  if (cached !== null) return cached;

  const raw = await sim(pk, CFG.CONTRACT_SWAP, 'total_swaps', []);
  const val = Number(raw);
  cache.set(key, val, TTL_SWAPS);
  return val;
}

export async function getTokenBalance(pk) {
  const key = `tokbal:${pk}`;
  const cached = cache.get(key);
  if (cached !== null) return cached;

  const args = [Address.fromString(pk).toScVal()];
  const raw = await sim(pk, CFG.CONTRACT_TOKEN, 'balance', args);
  const val = Number(raw) / STROOPS;
  cache.set(key, val, TTL_BAL);
  return val;
}

export async function getXLMBalance(pk) {
  const key = `xlmbal:${pk}`;
  const cached = cache.get(key);
  if (cached !== null) return cached;

  const resp = await fetch(`${CFG.HORIZON_URL}/accounts/${pk}`);
  if (!resp.ok) throw new Error('Network error fetching account');
  const data = await resp.json();
  const native = data.balances.find((b) => b.asset_type === 'native');
  const val = native ? parseFloat(native.balance) : 0;
  cache.set(key, val, TTL_BAL);
  return val;
}

export async function buildSwapXLM(pk, xlmAmt) {
  const args = [
    Address.fromString(pk).toScVal(),
    nativeToScVal(Math.round(xlmAmt * STROOPS), { type: 'i128' }),
  ];
  return prep(pk, CFG.CONTRACT_SWAP, 'swap_xlm_to_token', args);
}

export async function buildSwapToken(pk, tokenAmt) {
  const args = [
    Address.fromString(pk).toScVal(),
    nativeToScVal(Math.round(tokenAmt * STROOPS), { type: 'i128' }),
  ];
  return prep(pk, CFG.CONTRACT_SWAP, 'swap_token_to_xlm', args);
}

export async function submitTx(xdrStr) {
  const tx = TransactionBuilder.fromXDR(xdrStr, Networks.TESTNET);
  const result = await rpcServer.sendTransaction(tx);
  if (result.status === 'ERROR') {
    throw new Error('Contract error: ' + JSON.stringify(result.errorResult));
  }
  return result.hash;
}

export async function waitTx(hash) {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const result = await rpcServer.getTransaction(hash);
    if (result.status === 'SUCCESS') return result;
    if (result.status === 'FAILED') throw new Error('Contract error: Transaction FAILED');
    if (result.status !== 'NOT_FOUND') throw new Error('Unexpected status: ' + result.status);
  }
  throw new Error('Network error: Transaction confirmation timeout');
}

export function bustAll(pk) {
  cache.bust(`pool:${pk}`);
  cache.bust(`swaps:${pk}`);
  cache.bust(`tokbal:${pk}`);
  cache.bust(`xlmbal:${pk}`);
}
