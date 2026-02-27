import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPool,
  getXLMBalance,
  getTokenBalance,
  getTotalSwaps,
  buildSwapXLM,
  buildSwapToken,
  getPrice,
  submitTx,
  waitTx,
  bustAll,
} from '../utils/contract.js';
import { parseErr } from '../utils/errors.js';

export const TX = {
  IDLE: 'IDLE',
  BUILD: 'BUILD',
  SIGN: 'SIGN',
  SEND: 'SEND',
  CONFIRM: 'CONFIRM',
  OK: 'OK',
  FAIL: 'FAIL',
};

const MAX_EVENTS = 10;
const REFRESH_INTERVAL_MS = 15_000;

export function useSwap(pk, sign) {
  const [pool, setPool] = useState(null);
  const [xlmBal, setXlmBal] = useState(0);
  const [tokBal, setTokBal] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [st, setSt] = useState(TX.IDLE);
  const [hash, setHash] = useState(null);
  const [txErr, setTxErr] = useState(null);
  const [events, setEvents] = useState([]);
  const intervalRef = useRef(null);

  const refresh = useCallback(
    async (force = false) => {
      if (!pk) return;
      if (force) bustAll(pk);
      setLoading(true);
      try {
        const [p, xlm, tok, swaps] = await Promise.all([
          getPool(pk),
          getXLMBalance(pk),
          getTokenBalance(pk),
          getTotalSwaps(pk),
        ]);
        setPool(p);
        setXlmBal(xlm);
        setTokBal(tok);
        setTotalSwaps(swaps);
      } catch {
        // silent refresh errors
      } finally {
        setLoading(false);
      }
    },
    [pk]
  );

  useEffect(() => {
    if (!pk) {
      setPool(null);
      setXlmBal(0);
      setTokBal(0);
      setTotalSwaps(0);
      setSt(TX.IDLE);
      setHash(null);
      setTxErr(null);
      setEvents([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    refresh();
    intervalRef.current = setInterval(() => refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [pk, refresh]);

  const addEvent = useCallback((evt) => {
    setEvents((prev) => [evt, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const run = useCallback(
    async (buildFn, amt, label) => {
      setSt(TX.BUILD);
      setHash(null);
      setTxErr(null);
      try {
        const preparedTx = await buildFn(pk, amt);
        setSt(TX.SIGN);
        const signed = await sign(preparedTx.toXDR());
        setSt(TX.SEND);
        const txHash = await submitTx(signed);
        setHash(txHash);
        setSt(TX.CONFIRM);
        await waitTx(txHash);
        setSt(TX.OK);
        addEvent({ dir: label, amt, hash: txHash, time: Date.now() });
        setTimeout(() => refresh(true), 2000);
      } catch (e) {
        const parsed = parseErr(e);
        setTxErr(parsed.message);
        setSt(TX.FAIL);
      }
    },
    [pk, sign, refresh, addEvent]
  );

  const swapXLM = useCallback(
    (amt) => run(buildSwapXLM, amt, 'XLM→SST'),
    [run]
  );

  const swapToken = useCallback(
    (amt) => run(buildSwapToken, amt, 'SST→XLM'),
    [run]
  );

  const getQuote = useCallback(
    (xlmAmt) => getPrice(pk, xlmAmt),
    [pk]
  );

  const reset = useCallback(() => setSt(TX.IDLE), []);

  return {
    pool,
    xlmBal,
    tokBal,
    totalSwaps,
    loading,
    st,
    hash,
    txErr,
    events,
    refresh,
    swapXLM,
    swapToken,
    getQuote,
    reset,
  };
}
