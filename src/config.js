export const CFG = {
  CONTRACT_SWAP: import.meta.env.VITE_SWAP_CONTRACT || '',
  CONTRACT_TOKEN: import.meta.env.VITE_TOKEN_CONTRACT || '',
  RPC_URL:
    import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org',
  HORIZON_URL:
    import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  PASSPHRASE: 'Test SDF Network ; September 2015',
  EXPLORER: 'https://stellar.expert/explorer/testnet',
};
