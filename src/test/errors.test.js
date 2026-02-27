import { describe, it, expect } from 'vitest';
import { parseErr, ERR } from '../utils/errors.js';

describe('parseErr', () => {
  it('detects WALLET from "Wallet not found"', () => {
    const result = parseErr(new Error('Wallet not found'));
    expect(result.type).toBe(ERR.WALLET);
  });

  it('detects REJECTED from "User declined"', () => {
    const result = parseErr(new Error('User declined the request'));
    expect(result.type).toBe(ERR.REJECTED);
  });

  it('detects BALANCE from "underfunded"', () => {
    const result = parseErr(new Error('Account is underfunded'));
    expect(result.type).toBe(ERR.BALANCE);
  });

  it('detects LIQUIDITY from "insufficient liquidity"', () => {
    const result = parseErr(new Error('insufficient liquidity'));
    expect(result.type).toBe(ERR.LIQUIDITY);
  });

  it('detects NETWORK as fallback', () => {
    const result = parseErr(new Error('unknown failure'));
    expect(result.type).toBe(ERR.NETWORK);
  });

  it('handles plain string input', () => {
    const result = parseErr('User declined');
    expect(result.type).toBe(ERR.REJECTED);
  });
});
