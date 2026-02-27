export const ERR = {
  WALLET: 'WALLET',
  REJECTED: 'REJECTED',
  BALANCE: 'BALANCE',
  LIQUIDITY: 'LIQUIDITY',
  CONTRACT: 'CONTRACT',
  NETWORK: 'NETWORK',
};

export function parseErr(e) {
  const msg = typeof e === 'string' ? e : e?.message || String(e);
  const lower = msg.toLowerCase();

  if (/not found|no wallet/i.test(lower)) {
    return { type: ERR.WALLET, message: 'Wallet not found. Please install a Stellar wallet.' };
  }
  if (/reject|declined|cancel/i.test(lower)) {
    return { type: ERR.REJECTED, message: 'Transaction rejected by user.' };
  }
  if (/insufficient liquidity/i.test(lower)) {
    return { type: ERR.LIQUIDITY, message: 'Insufficient pool liquidity for this swap.' };
  }
  if (/insufficient|underfunded/i.test(lower)) {
    return { type: ERR.BALANCE, message: 'Insufficient balance or account underfunded.' };
  }
  if (/contract|simulation/i.test(lower)) {
    return { type: ERR.CONTRACT, message: 'Contract error: ' + msg };
  }
  return { type: ERR.NETWORK, message: 'Network error: ' + msg };
}
