import { useState, useEffect, useCallback, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet.js';
import { useSwap, TX } from './hooks/useSwap.js';
import { CFG } from './config.js';

// ── TX progress step config ──────────────────────────────────────────────────
const STEPS = {
  [TX.BUILD]:   { pct: 20,  label: 'Building transaction…' },
  [TX.SIGN]:    { pct: 40,  label: 'Waiting for signature…' },
  [TX.SEND]:    { pct: 60,  label: 'Submitting to network…' },
  [TX.CONFIRM]: { pct: 80,  label: 'Confirming on-chain…' },
  [TX.OK]:      { pct: 100, label: 'Swap complete!' },
};

// ── TxBox ────────────────────────────────────────────────────────────────────
function TxBox({ st, hash, txErr }) {
  if (st === TX.IDLE) return null;

  if (st === TX.FAIL) {
    return (
      <div className="txb fail">
        ✕ {txErr || 'Transaction failed'}
      </div>
    );
  }

  const step = STEPS[st];
  if (!step) return null;

  return (
    <div className="txb w">
      {step.pct < 100 && (
        <div className="prog">
          <div className="pb" style={{ width: `${step.pct}%` }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {st !== TX.OK && <span className="sp" />}
        {st === TX.OK ? (
          <span className="txb ok" style={{ margin: 0, border: 'none', padding: 0, background: 'transparent' }}>
            ✓ {step.label}{' '}
            {hash && (
              <a
                href={`${CFG.EXPLORER}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hash.slice(0, 8)}…
              </a>
            )}
          </span>
        ) : (
          <span>{step.label}</span>
        )}
      </div>
    </div>
  );
}

// ── PoolCard ─────────────────────────────────────────────────────────────────
function PoolCard({ pool, totalSwaps, xlmBal, tokBal, loading, onRefresh }) {
  if (!CFG.CONTRACT_SWAP) {
    return (
      <div className="card">
        <div className="card-title">Pool</div>
        <p style={{ color: 'var(--text2)', fontSize: '.85rem' }}>
          Contracts not configured. Set VITE_SWAP_CONTRACT in your .env file.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="card-title" style={{ marginBottom: 0 }}>Pool Stats</span>
        <button
          className="btn bs"
          style={{ minHeight: 32, padding: '0 10px', fontSize: '.75rem' }}
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? <span className="sp" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : '↻'} Refresh
        </button>
      </div>
      {loading && !pool ? (
        <div className="pool-grid">
          {[0,1,2,3].map(i => <div key={i} className="skel" />)}
        </div>
      ) : (
        <div className="pool-grid">
          <div className="stat">
            <div className="stat-label">XLM Reserve</div>
            <div className="stat-value">{pool ? pool.xlmReserve.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">SST Reserve</div>
            <div className="stat-value">{pool ? pool.tokenReserve.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Rate (SST/XLM)</div>
            <div className="stat-value">{pool ? pool.rate.toFixed(4) : '—'}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Swaps</div>
            <div className="stat-value">{totalSwaps}</div>
          </div>
        </div>
      )}
      <div className="divider" style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="stat" style={{ flex: 1 }}>
          <div className="stat-label">Your XLM</div>
          <div className="stat-value" style={{ fontSize: '.9rem' }}>{xlmBal.toFixed(4)}</div>
        </div>
        <div className="stat" style={{ flex: 1 }}>
          <div className="stat-label">Your SST</div>
          <div className="stat-value" style={{ fontSize: '.9rem' }}>{tokBal.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}

// ── SwapCard ─────────────────────────────────────────────────────────────────
function SwapCard({ xlmBal, tokBal, swapXLM, swapToken, st, hash, txErr, reset, getQuote }) {
  const [dir, setDir] = useState('xlm');
  const [amt, setAmt] = useState('');
  const [quote, setQuote] = useState(null);
  const debounceRef = useRef(null);
  const busy = st !== TX.IDLE && st !== TX.OK && st !== TX.FAIL;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const val = parseFloat(amt);
    if (!val || val <= 0 || dir !== 'xlm') {
      setQuote(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const q = await getQuote(val);
        setQuote(q);
      } catch {
        setQuote(null);
      }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [amt, dir, getQuote]);

  const handleSwap = async () => {
    const val = parseFloat(amt);
    if (!val || val <= 0) return;
    reset();
    if (dir === 'xlm') await swapXLM(val);
    else await swapToken(val);
  };

  const bal = dir === 'xlm' ? xlmBal : tokBal;
  const fromLabel = dir === 'xlm' ? 'XLM' : 'SST';
  const toLabel = dir === 'xlm' ? 'SST' : 'XLM';

  return (
    <div className="card">
      <div className="card-title">Swap</div>
      <div className="tabs">
        <button className={`tab${dir === 'xlm' ? ' active' : ''}`} onClick={() => { setDir('xlm'); setAmt(''); setQuote(null); reset(); }}>
          XLM → SST
        </button>
        <button className={`tab${dir === 'sst' ? ' active' : ''}`} onClick={() => { setDir('sst'); setAmt(''); setQuote(null); reset(); }}>
          SST → XLM
        </button>
      </div>

      <div className="inp-wrap">
        <input
          className="inp"
          type="number"
          min="0"
          step="any"
          placeholder={`Amount in ${fromLabel}`}
          value={amt}
          onChange={e => setAmt(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="bal-hint">Balance: {bal.toFixed(4)} {fromLabel}</div>

      {dir === 'xlm' && (
        <div className="quote">
          {quote !== null
            ? <span>Estimated: <strong>{quote.toFixed(4)} {toLabel}</strong></span>
            : <span style={{ opacity: .5 }}>Enter amount to see quote</span>
          }
        </div>
      )}

      <button
        className="btn bp"
        onClick={handleSwap}
        disabled={busy || !amt || parseFloat(amt) <= 0}
      >
        {busy ? <><span className="sp" /> Processing…</> : `Swap ${fromLabel} → ${toLabel}`}
      </button>

      <TxBox st={st} hash={hash} txErr={txErr} />
    </div>
  );
}

// ── EventFeed ─────────────────────────────────────────────────────────────────
function EventFeed({ events }) {
  if (!events.length) return null;
  return (
    <div className="card">
      <div className="card-title">Recent Swaps</div>
      <div className="evt-list">
        {events.map((evt, i) => (
          <div key={i} className="evt">
            <span className="evt-dir">{evt.dir}</span>
            <span className="evt-amt">{Number(evt.amt).toFixed(4)}</span>
            <span className="evt-time">{new Date(evt.time).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HeroScreen ────────────────────────────────────────────────────────────────
function HeroScreen({ connect, busy, err }) {
  return (
    <div className="hero">
      <div className="hero-icon">🌟</div>
      <h1>StellarSwap</h1>
      <p className="hero-sub">
        Swap XLM and custom Soroban tokens using a constant-product AMM on Stellar Testnet.
      </p>
      <ul className="feature-list">
        <li>Custom SAC-style token contract (SST)</li>
        <li>AMM with 0.3% fee (constant product x·y=k)</li>
        <li>Multi-wallet support via StellarWalletsKit</li>
        <li>Live pool stats with 10s cache</li>
        <li>On-chain event feed</li>
      </ul>
      <button className="btn bp" onClick={connect} disabled={busy} style={{ maxWidth: 260 }}>
        {busy ? <><span className="sp" /> Connecting…</> : 'Connect Wallet'}
      </button>
      {err && <div className="txb fail" style={{ maxWidth: 340 }}>✕ {err}</div>}
    </div>
  );
}

// ── ContractInfo ──────────────────────────────────────────────────────────────
function ContractInfo() {
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };
  if (!CFG.CONTRACT_SWAP && !CFG.CONTRACT_TOKEN) return null;
  return (
    <div className="card">
      <div className="card-title">Contracts</div>
      {CFG.CONTRACT_SWAP && (
        <div className="contract-row">
          <span className="contract-label">Swap</span>
          <span className="contract-id" onClick={() => copy(CFG.CONTRACT_SWAP)} title="Click to copy">
            {CFG.CONTRACT_SWAP}
          </span>
        </div>
      )}
      {CFG.CONTRACT_TOKEN && (
        <div className="contract-row">
          <span className="contract-label">Token</span>
          <span className="contract-id" onClick={() => copy(CFG.CONTRACT_TOKEN)} title="Click to copy">
            {CFG.CONTRACT_TOKEN}
          </span>
        </div>
      )}
      {CFG.CONTRACT_SWAP && (
        <div style={{ marginTop: 8 }}>
          <a
            href={`${CFG.EXPLORER}/contract/${CFG.CONTRACT_SWAP}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '.75rem', color: 'var(--accent)' }}
          >
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { pk, busy: walletBusy, err: walletErr, connect, disconnect, sign } = useWallet();
  const {
    pool, xlmBal, tokBal, totalSwaps, loading,
    st, hash, txErr,
    events, refresh, swapXLM, swapToken, getQuote, reset,
  } = useSwap(pk, sign);

  // Toast on TX status changes
  useEffect(() => {
    if (st === TX.OK) toast.success('Swap confirmed! 🎉');
    if (st === TX.FAIL && txErr) toast.error(txErr);
  }, [st, txErr]);

  const shortPk = pk ? `${pk.slice(0, 6)}…${pk.slice(-4)}` : null;

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1a2235', color: '#e2e8f0', border: '1px solid #2a3a5c' },
        }}
      />

      <header>
        <span className="logo">⬡ StellarSwap</span>
        <div className="hdr-right">
          <span className="badge">TESTNET</span>
          {pk && <span className="wallet-badge">{shortPk}</span>}
          {pk && (
            <button className="btn bd" style={{ minHeight: 32, padding: '0 10px', fontSize: '.75rem' }} onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {!pk ? (
          <HeroScreen connect={connect} busy={walletBusy} err={walletErr} />
        ) : (
          <>
            <PoolCard
              pool={pool}
              totalSwaps={totalSwaps}
              xlmBal={xlmBal}
              tokBal={tokBal}
              loading={loading}
              onRefresh={() => refresh(true)}
            />
            <SwapCard
              xlmBal={xlmBal}
              tokBal={tokBal}
              swapXLM={swapXLM}
              swapToken={swapToken}
              st={st}
              hash={hash}
              txErr={txErr}
              reset={reset}
              getQuote={getQuote}
            />
            <EventFeed events={events} />
            <ContractInfo />
          </>
        )}
      </main>
    </>
  );
}
