import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, ReferenceLine, Cell
} from "recharts";

/* ═══════════════════════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════════════════════ */

const C = {
  bg: "#05070d",
  bgSub: "#0a0e18",
  card: "#0d1220",
  border: "#161e30",
  borderHi: "#1e2a42",
  text: "#dce4f0",
  dim: "#4a5a78",
  accent: "#7c6aff",
  green: "#6ee7b7",
  red: "#fb7185",
  orange: "#c4b5fd",
  purple: "#a78bfa",
  pink: "#c084fc",
  blue: "#818cf8",
  lines: ["#7c6aff", "#818cf8", "#a78bfa", "#c084fc", "#6ee7b7", "#60a5fa", "#c4b5fd", "#93c5fd"],
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */
const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 1825 },
];

const filterByRange = (data, rangeKey) => {
  if (!data || !Array.isArray(data)) return [];
  const r = RANGES.find((x) => x.key === rangeKey);
  if (!r) return data;
  return data.slice(-r.days);
};

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

const TT = ({ active, payload, label, pre = "", suf = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#131930", border: `1px solid ${C.borderHi}`, borderRadius: 6, padding: "7px 11px", fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
      <div style={{ color: C.dim, marginBottom: 3, fontSize: 9.5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.accent, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <span style={{ color: C.dim }}>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{pre}{typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : p.value}{suf}</span>
        </div>
      ))}
    </div>
  );
};

const RangeToggle = ({ range, setRange, options }) => (
  <div style={{ display: "flex", gap: 2, background: C.bgSub, borderRadius: 5, padding: 2 }}>
    {(options || RANGES).map((r) => {
      const k = r.key || r;
      return (
        <button key={k} onClick={() => setRange(k)} style={{
          background: range === k ? C.borderHi : "transparent",
          color: range === k ? C.accent : C.dim,
          border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 9.5,
          fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
          transition: "all 0.15s",
        }}>{k}</button>
      );
    })}
  </div>
);

const ChartCard = ({ title, subtitle, children, headerRight, wide }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gridColumn: wide ? "span 2" : undefined,
    minHeight: 0,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, letterSpacing: 0.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 9.5, color: C.dim, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {headerRight}
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
  </div>
);

const PriceLabel = ({ data, color = C.accent, prefix = "", suffix = "" }) => {
  if (!data || data.length === 0) return null;
  const last = data[data.length - 1]?.value;
  const prev = data[data.length - 2]?.value;
  const ch = prev ? ((last - prev) / prev * 100).toFixed(2) : 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {prefix}{last?.toLocaleString(undefined, { maximumFractionDigits: 4 })}{suffix}
      </span>
      <span style={{ fontSize: 11, color: ch >= 0 ? C.green : C.red, fontFamily: "'JetBrains Mono', monospace" }}>
        {ch >= 0 ? "+" : ""}{ch}%
      </span>
    </div>
  );
};

const SmallAreaChart = ({ data, color = C.accent, height = 130, yDomain }) => {
  if (!data || data.length === 0) return <div style={{ height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim }}>No Data</div>;
  const id = `g${color.replace(/[^a-zA-Z0-9]/g, "")}${Math.random().toString(36).slice(2, 5)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={yDomain || ["auto", "auto"]} />
        <Tooltip content={<TT />} />
        <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${id})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const IndependentChart = ({ title, fullData, color, prefix = "", unit = "" }) => {
  const [range, setRange] = useState("1Y");
  const filtered = useMemo(() => filterByRange(fullData, range), [fullData, range]);
  return (
    <ChartCard
      title={title}
      subtitle={unit}
      headerRight={<RangeToggle range={range} setRange={setRange} />}
    >
      <SmallAreaChart data={filtered} color={color} height={120} />
      <PriceLabel data={filtered} color={color} prefix={prefix} />
    </ChartCard>
  );
};

const StatPill = ({ label, value, color }) => (
  <div style={{
    background: C.bgSub,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    padding: "10px 14px",
    textAlign: "center",
    minWidth: 0,
  }}>
    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color: color || C.text, fontFamily: "'JetBrains Mono', monospace" }}>{value || "-"}</div>
  </div>
);


/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: EQUITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const EquitiesSection = ({ data }) => {
  if (!data) return <div>No Equities Data</div>;
  const tickers = [
    { key: "S&P 500", ticker: "SPX" },
    { key: "NASDAQ", ticker: "NQ" },
    { key: "Dow Jones", ticker: "DOWJ" },
    { key: "FTSE 100", ticker: "FTSE" },
    { key: "Nikkei 225", ticker: "N225" },
    { key: "DAX", ticker: "DAX" },
    { key: "Hang Seng", ticker: "HSI" },
    { key: "KOSPI", ticker: "KOSPI" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {tickers.map((e, i) => (
        <IndependentChart
          key={e.ticker}
          title={e.key}
          fullData={data[e.ticker] || []}
          color={C.lines[i % C.lines.length]}
          prefix=""
          unit={e.ticker}
        />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: COMMODITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const CommoditiesSection = ({ data }) => {
  if (!data) return <div>No Commodities Data</div>;
  const commodities = [
    { key: "Gold", ticker: "GOLD", unit: "$/oz" },
    { key: "Silver", ticker: "SILVER", unit: "$/oz" },
    { key: "Copper", ticker: "COPPER", unit: "$/lb" },
    { key: "WTI Crude", ticker: "WTI", unit: "$/bbl" },
    { key: "Brent Crude", ticker: "BRENT", unit: "$/bbl" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {commodities.map((c, i) => (
        <IndependentChart
          key={c.ticker}
          title={c.key}
          fullData={data[c.ticker] || []}
          color={C.lines[i % C.lines.length]}
          prefix="$"
          unit={c.unit}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: BONDS
   ═══════════════════════════════════════════════════════════════════════════ */

const BondsSection = ({ data }) => {
  if (!data) return <div>No Bonds Data</div>;
  const bonds = [
    { key: "US 3-Month", ticker: "US3M" },
    { key: "US 2-Year", ticker: "US2Y" },
    { key: "US 5-Year", ticker: "US5Y" },
    { key: "US 10-Year", ticker: "US10Y" },
    { key: "US 30-Year", ticker: "US30Y" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {bonds.map((b) => {
          const arr = data[b.ticker];
          const last = arr && arr.length > 0 ? arr[arr.length - 1].value : 0;
          return <StatPill key={b.ticker} label={b.ticker} value={`${last.toFixed(2)}%`} color={C.accent} />;
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {bonds.map((b, i) => (
          <IndependentChart
            key={b.ticker}
            title={b.key}
            fullData={data[b.ticker] || []}
            color={C.lines[i % C.lines.length]}
            unit="Yield %"
          />
        ))}
        {/* Spread chart */}
        <IndependentChart
          title="10Y – 2Y Spread"
          fullData={data.spread || []}
          color={C.pink}
          unit="Yield curve spread (%)"
        />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: FOREX
   ═══════════════════════════════════════════════════════════════════════════ */

const ForexSection = ({ data }) => {
  if (!data) return <div>No Forex Data</div>;
  const forexPairs = [
    { key: "DXY (Dollar Index)", ticker: "DXY" },
    { key: "USD/JPY", ticker: "USDJPY" },
    { key: "EUR/USD", ticker: "EURUSD" },
    { key: "GBP/USD", ticker: "GBPUSD" },
    { key: "USD/CAD", ticker: "USDCAD" },
    { key: "AUD/USD", ticker: "AUDUSD" },
    { key: "USD/CHF", ticker: "USDCHF" },
    { key: "NZD/USD", ticker: "NZDUSD" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {forexPairs.map((f, i) => (
        <IndependentChart
          key={f.ticker}
          title={f.key}
          fullData={data[f.ticker] || []}
          color={C.lines[i % C.lines.length]}
          unit={f.ticker}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: US ECONOMY
   ═══════════════════════════════════════════════════════════════════════════ */

const USEconomySection = ({ data }) => {
  if (!data) return <div>No Economy Data</div>;

  const getLatest = (key) => {
    const arr = data[key];
    return arr && arr.length > 0 ? arr[arr.length - 1].value : 0;
  };

  const nfp = data.nfp || [];
  const unemploymentRate = data.unemp || [];
  const fedFunds = data.fedfunds || [];
  const initialClaims = data.claims || [];
  const corePCE = data.corepce || [];
  const personalIncome = data.income || [];
  const mortgageRate = data.mortgage30 || [];
  const walcl = data.walcl || [];
  const ccDelinq = data.ccdelinq || [];
  const m2eco = data.m2eco || [];

  const ecoStats = [
    { label: "NFP (Latest)", value: `+${getLatest('nfp')}K`, color: "#6ee7b7" },
    { label: "Unemployment", value: `${getLatest('unemp').toFixed(1)}%`, color: "#c084fc" },
    { label: "Fed Funds", value: `${getLatest('fedfunds').toFixed(2)}%`, color: "#7c6aff" },
    { label: "Core PCE", value: `${getLatest('corepce').toFixed(1)}%`, color: "#a78bfa" },
    { label: "30Y Mortgage", value: `${getLatest('mortgage30').toFixed(2)}%`, color: "#818cf8" },
    { label: "Initial Claims", value: `${getLatest('claims').toFixed(0)}K`, color: "#93c5fd" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        {ecoStats.map((s) => (
          <StatPill key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="Non-Farm Payrolls" subtitle="Total Nonfarm Employment Level (Thousands)">
          <SmallAreaChart data={nfp} color={C.green} height={130} />
          <PriceLabel data={nfp} color={C.green} />
        </ChartCard>
        <IndependentChart title="Unemployment Rate" fullData={unemploymentRate} color={C.orange} unit="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <IndependentChart title="Fed Funds Rate" fullData={fedFunds} color={C.accent} unit="%" />
        <ChartCard title="Core PCE (YoY)" subtitle="Fed's preferred inflation gauge">
          <SmallAreaChart data={corePCE} color={C.purple} height={130} />
          <PriceLabel data={corePCE} color={C.purple} />
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <IndependentChart title="Initial Jobless Claims" fullData={initialClaims} color={C.red} unit="Thousands (weekly)" />
        <IndependentChart title="30Y Fixed Mortgage Rate" fullData={mortgageRate} color={C.pink} unit="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="WALCL — Fed Balance Sheet" subtitle="Total assets ($T)">
          <SmallAreaChart data={walcl} color={C.blue} height={130} />
          <PriceLabel data={walcl} color={C.blue} prefix="$" suffix="T" />
        </ChartCard>
        <ChartCard title="Personal Disposable Income" subtitle="Real disposable income ($T, annualized)">
          <SmallAreaChart data={personalIncome} color={C.green} height={130} />
          <PriceLabel data={personalIncome} color={C.green} prefix="$" suffix="T" />
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ChartCard title="Credit Card Delinquency Rate" subtitle="Quarterly (%)">
          <SmallAreaChart data={ccDelinq} color={C.red} height={130} />
          <PriceLabel data={ccDelinq} color={C.red} />
        </ChartCard>
        <ChartCard title="M2 Money Supply" subtitle="Broad money ($T)">
          <SmallAreaChart data={m2eco} color={C.accent} height={130} />
          <PriceLabel data={m2eco} color={C.accent} prefix="$" suffix="T" />
        </ChartCard>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: SENTIMENT & NLP
   ═══════════════════════════════════════════════════════════════════════════ */

const SentimentSection = ({ scores, funds, signals }) => {
  if (!scores || !scores.current) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Generating Sentiment Analytics...</div>;

  const current = scores.current;
  const trend = scores.trend || [];

  const getGaugeColor = (val) => {
    if (val >= 65) return C.green;
    if (val <= 35) return C.red;
    return C.dim;
  };

  const compColor = getGaugeColor(current.composite);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top row: Gauge and Line Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>

        {/* Composite Score Gauge */}
        <ChartCard title="Composite Sentiment Index" subtitle="0 (Bearish) to 100 (Bullish)">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "10px 0" }}>
            <div style={{
              position: "relative",
              width: 140, height: 70,
              overflow: "hidden",
            }}>
              {/* Semi-circle background */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: 140, height: 140,
                borderRadius: "50%",
                border: `10px solid ${C.borderHi}`,
                boxSizing: "border-box"
              }}></div>

              {/* Semi-circle foreground */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: 140, height: 140,
                borderRadius: "50%",
                border: `10px solid ${compColor}`,
                boxSizing: "border-box",
                transform: `rotate(${(current.composite / 100) * 180 - 180}deg)`,
                transformOrigin: "50% 50%",
                transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
                borderBottomColor: "transparent",
                borderRightColor: "transparent"
              }}></div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: compColor, fontFamily: "'JetBrains Mono', monospace", marginTop: -20, textShadow: `0 0 20px ${compColor}40` }}>
              {current.composite}
            </div>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>
              {current.composite >= 65 ? "Bullish" : current.composite <= 35 ? "Bearish" : "Neutral"}
            </div>
          </div>
        </ChartCard>

        {/* 7-Day Trend Line Chart */}
        <ChartCard title="7-Day Trajectory" subtitle="Comparing Media vs Retail vs Institutional sentiment">
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9.5, fill: C.dim }} stroke={C.border} tickFormatter={(val) => val.split("-").slice(1).join("/")} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9.5, fill: C.dim }} stroke={C.border} />
              <Tooltip content={<TT />} />
              <ReferenceLine y={50} stroke={C.borderHi} strokeDasharray="3 3" />
              <Line type="monotone" name="Media (RSS)" dataKey="rss" stroke={C.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" name="Retail (Reddit)" dataKey="reddit" stroke={C.orange} strokeWidth={2} dot={false} />
              <Line type="monotone" name="Smart Money (EDGAR)" dataKey="edgar" stroke={C.green} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Middle row: Granular Breakdowns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <StatPill label="Media Index (News/RSS)" value={current.rss} color={C.blue} />
        <StatPill label="Retail Index (r/WSB)" value={current.reddit} color={C.orange} />
        <StatPill label="Smart Money (13F/8-K)" value={current.edgar} color={C.green} />
      </div>

      {/* Bottom row: Feeds and Heatmap */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* SEC EDGAR Signals Feed */}
        <ChartCard title="SEC Regulatory Signals" subtitle="Real-time 8-K / 10-Q NLP NLP highlights">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, height: 200, overflowY: "auto", paddingRight: 4 }}>
            {!signals?.length ? <div style={{ color: C.dim, fontSize: 11, textAlign: "center", marginTop: 20 }}>No signals detected.</div> :
              signals.map((sig, i) => (
                <div key={i} style={{
                  background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px",
                  borderLeft: `3px solid ${getGaugeColor(sig.score)}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.text }}>{sig.company}</span>
                    <span style={{ fontSize: 9, color: C.dim, backgroundColor: C.borderHi, padding: "2px 6px", borderRadius: 4 }}>{sig.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.4, opacity: 0.9 }}>
                    "{sig.text}"
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 9, color: C.dim }}>{sig.time}</span>
                    <span style={{ fontSize: 9, color: getGaugeColor(sig.score), fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>Impact: {sig.score}</span>
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>

        {/* 13F Institutional Heatmap */}
        <ChartCard title="Smart Money Positioning" subtitle="Top funds 13F quarterly changes">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, height: 200, overflowY: "auto", paddingRight: 4 }}>
            {!funds?.length ? <div style={{ color: C.dim, fontSize: 11, textAlign: "center", marginTop: 20 }}>No 13F movements detected.</div> :
              funds.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bgSub, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.dim }}>{f.fund}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{f.ticker}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: f.action === 'buy' ? C.green : C.red, textTransform: "uppercase", fontWeight: 700 }}>{f.action}</div>
                    <div style={{ fontSize: 11.5, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{f.size}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </ChartCard>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: CRYPTO & TREASURIES
   ═══════════════════════════════════════════════════════════════════════════ */

const CryptoSection = ({ treasuries }) => {
  if (!treasuries || !treasuries.length) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Fetching Bitcoin Treasuries...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ChartCard title="Public Bitcoin Holding Leaders" subtitle="Top 100 corporate treasuries">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderHi}`, textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase" }}>Rank</th>
                <th style={{ padding: "10px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase" }}>Company</th>
                <th style={{ padding: "10px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase" }}>Symbol</th>
                <th style={{ padding: "10px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase", textAlign: "right" }}>Total Holdings (BTC)</th>
                <th style={{ padding: "10px 12px", fontSize: 10, color: C.dim, fontWeight: 600, textTransform: "uppercase", textAlign: "right" }}>7-Day Chg</th>
              </tr>
            </thead>
            <tbody>
              {treasuries.map((t) => (
                <tr key={t.rank} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = C.bgSub} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>{t.rank}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>{t.symbol}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{t.btc_holdings.toLocaleString()}</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, textAlign: "right", color: t.price_change_7d.includes('-') ? C.red : (t.price_change_7d === "N/A" || t.price_change_7d === "0.00%") ? C.dim : C.green, fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.price_change_7d}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN TERMINAL
   ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "equities", label: "Equities", icon: "◇" },
  { id: "commodities", label: "Commodities", icon: "⬢" },
  { id: "bonds", label: "Bonds", icon: "◈" },
  { id: "forex", label: "Forex", icon: "¤" },
  { id: "economy", label: "US Economy", icon: "◆" },
  { id: "sentiment", label: "Sentiment", icon: "⌖" },
  { id: "crypto", label: "Crypto", icon: "₿" },
];

export default function NexusTerminal() {
  const [tab, setTab] = useState("equities");
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newsAlerts, setNewsAlerts] = useState([]);
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  // Sentiment specific states
  const [sentimentScores, setSentimentScores] = useState(null);
  const [sentimentFunds, setSentimentFunds] = useState([]);
  const [sentimentSignals, setSentimentSignals] = useState([]);

  // Crypto treasuries specific state
  const [cryptoTreasuries, setCryptoTreasuries] = useState([]);

  // Audio reference for the notification chime
  const audioContextRef = useRef(null);

  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Only play if not suspended (browsers require user interaction first usually, 
      // but we try anyway. If user clicked a tab already, it will work)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      // A pleasant high-pitched chime
      osc.frequency.setValueAtTime(880.0, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760.0, ctx.currentTime + 0.1); // Up to A6

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio play failed:", e);
    }
  };

  useEffect(() => {
    // 1. Fetch Initial Data
    const fetchData = async () => {
      try {
        const API_BASE = window.location.hostname === "localhost" ? "http://localhost:8000" : "";
        const response = await axios.get(`${API_BASE}/api/data`);
        if (response.data.error) {
          setError(response.data.error);
        } else {
          setApiData(response.data);
          if (response.data.news && response.data.news.length > 0) {
            setNewsAlerts(response.data.news.slice(0, 5));
          }
        }

        // Fetch new Sentiment APIs concurrently
        try {
          const API_BASE = window.location.hostname === "localhost" ? "http://localhost:8000" : "";
          const [scoresRes, fundsRes, signalsRes] = await Promise.all([
            axios.get(`${API_BASE}/api/sentiment/scores`),
            axios.get(`${API_BASE}/api/sentiment/funds`),
            axios.get(`${API_BASE}/api/sentiment/signals`)
          ]);
          setSentimentScores(scoresRes.data);
          setSentimentFunds(fundsRes.data);
          setSentimentSignals(signalsRes.data);
          // Fetch new Crypto APIs
          try {
            const API_BASE = window.location.hostname === "localhost" ? "http://localhost:8000" : "";
            const cryptoRes = await axios.get(`${API_BASE}/api/crypto/treasuries`);
            setCryptoTreasuries(cryptoRes.data);
          } catch (cryptErr) {
            console.warn("Crypto API failed:", cryptErr);
          }

        } catch (sentErr) {
          console.warn("Sentiment endpoints missing or failed:", sentErr);
        }

      } catch (err) {
        setError("Failed to fetch data from backend. Make sure the FastAPI backend is running!");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // 2. Setup HTTP Polling for News
    const fetchLatestNews = async () => {
      try {
        const API_BASE = window.location.hostname === "localhost" ? "http://localhost:8000" : "";
        const response = await axios.get(`${API_BASE}/api/data`); // We just re-fetch the dashboard data to get the latest DB news
        if (response.data && response.data.news) {
          setNewsAlerts(prev => {
            // If there's new news we play a sound, though it's tricky to check efficiently.
            // For simplicity we'll just keep the alerts in sync.
            return response.data.news.slice(0, 5);
          })
        }
      } catch (err) {
        console.warn("Failed to poll news updates:", err);
      }
    };

    // Poll every 2 minutes
    const pollInterval = setInterval(fetchLatestNews, 120000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const ts = apiData?.last_updated ? new Date(apiData.last_updated).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Updating...";

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        background: "linear-gradient(180deg, #0f1520 0%, #06090f 100%)",
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 20px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1440, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: "#111",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#e8e4df",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: 1,
              border: "1px solid #2a2a2a",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.15%22/%3E%3C/svg%3E')", backgroundSize: "cover", opacity: 0.6 }} />
              <span style={{ position: "relative", zIndex: 1 }}>HC</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>Haim Capital</div>
              <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 1.2, textTransform: "uppercase" }}>Haim Capital Data Center</div>
            </div>
          </div>

          {/* Tabs */}
          <nav style={{ display: "flex", gap: 2, background: C.bgSub, borderRadius: 6, padding: 3 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? C.borderHi : "transparent",
                  color: tab === t.id ? C.accent : C.dim,
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 12 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Timestamp */}
          <div style={{ textAlign: "right", minWidth: 140 }}>
            <div style={{ fontSize: 9.5, color: C.dim }}>Last updated</div>
            <div style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{ts}</div>
          </div>
        </div>
      </header>

      {/* ─── CONTENT ────────────────────────────────────────────────── */}
      <main style={{ padding: "18px 20px 32px", maxWidth: 1440, margin: "0 auto", position: "relative" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading Latest Financial Data...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", color: C.red, background: "rgba(251, 113, 133, 0.1)", borderRadius: 8 }}>{error}</div>
        ) : (
          <>
            {tab === "equities" && <EquitiesSection data={apiData.equities} />}
            {tab === "commodities" && <CommoditiesSection data={apiData.commodities} />}
            {tab === "bonds" && <BondsSection data={apiData.bonds} />}
            {tab === "forex" && <ForexSection data={apiData.forex} />}
            {tab === "economy" && <USEconomySection data={apiData.economy} />}
            {tab === "sentiment" && <SentimentSection scores={sentimentScores} funds={sentimentFunds} signals={sentimentSignals} />}
            {tab === "crypto" && <CryptoSection treasuries={cryptoTreasuries} />}
          </>
        )}
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: "10px 20px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9.5,
        color: C.dim,
        maxWidth: 1440,
        margin: "0 auto",
      }}>
        <span>Haim Capital · Sources: FRED · Binance API · Yahoo Finance</span>
        <span>Daily refresh sequence activated</span>
      </footer>

      {/* ─── NEWS NOTIFICATION MODAL ────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999 }}>
        {!isNewsOpen ? (
          <button
            onClick={() => setIsNewsOpen(true)}
            style={{
              background: "rgba(13, 18, 32, 0.95)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${C.accent}40`,
              borderRadius: 20,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              cursor: "pointer",
              transition: "all 0.2s",
              color: C.text,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: newsAlerts.length > 0 ? C.red : C.dim, boxShadow: newsAlerts.length > 0 ? `0 0 8px ${C.red}` : 'none', transition: "all 0.2s" }}></div>
            {newsAlerts.length > 0 ? `BREAKING NEWS (${newsAlerts.length})` : "NO NEWS"}
          </button>
        ) : (
          <div style={{
            width: 380,
            background: "rgba(13, 18, 32, 0.95)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${C.accent}40`,
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(124, 106, 255, 0.1)",
            overflow: "hidden",
            animation: "slideIn 0.3s ease-out forwards",
          }}>
            <div style={{
              background: `linear-gradient(90deg, ${C.accent}20, transparent)`,
              borderBottom: `1px solid ${C.border}`,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: newsAlerts.length > 0 ? C.red : C.dim, boxShadow: newsAlerts.length > 0 ? `0 0 8px ${C.red}` : 'none' }}></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 1 }}>{newsAlerts.length > 0 ? "BREAKING NEWS" : "NEWS CENTER"}</span>
              </div>
              <button
                onClick={() => setIsNewsOpen(false)}
                style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "center", height: 20 }}
                title="Minimize"
              >−</button>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto" }}>
              {newsAlerts.length > 0 ? newsAlerts.map(alert => (
                <a
                  key={alert.id}
                  href={alert.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    textDecoration: "none",
                    borderLeft: `2px solid ${C.accent}`,
                    paddingLeft: 10,
                    transition: "opacity 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 0.8}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                >
                  <div style={{ fontSize: 9.5, color: C.dim, marginBottom: 4 }}>
                    {alert.source} • {new Date(alert.published).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                    {alert.title}
                  </div>
                </a>
              )) : (
                <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: "20px 0", fontFamily: "'JetBrains Mono', monospace" }}>Quiet. Waiting for market action...</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        button:hover { filter: brightness(1.15); }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
