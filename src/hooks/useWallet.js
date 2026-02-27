import { useState, useCallback } from 'react';
import {
  StellarWalletsKit,
  Networks,
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';

let initialized = false;

function ensureInit() {
  if (!initialized) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
      ],
    });
    initialized = true;
  }
}

export function useWallet() {
  const [pk, setPk] = useState(null);
  const [wid, setWid] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const connect = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      ensureInit();
      const { address } = await StellarWalletsKit.authModal();
      setPk(address);
      setWid(StellarWalletsKit.selectedModule?.productId || FREIGHTER_ID);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // ignore
    }
    setPk(null);
    setWid(null);
    setErr(null);
  }, []);

  const sign = useCallback(
    async (xdr) => {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });
      return signedTxXdr;
    },
    []
  );

  return { pk, wid, busy, err, connect, disconnect, sign };
}
