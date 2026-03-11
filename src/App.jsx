import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, ReferenceLine, Cell
} from "recharts";
import DraggableNewsGrid from "./components/DraggableNewsGrid";

import { useTheme } from "./context/ThemeContext";

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
  const { C } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.bgSub, border: `1px solid ${C.borderHi}`, borderRadius: C.radius, padding: "7px 11px", fontSize: 10.5, fontFamily: C.monoFont, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
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

const RangeToggle = ({ range, setRange, options }) => {
  const { C } = useTheme();
  return (
  <div style={{ display: "flex", gap: 2, background: C.bgSub, borderRadius: C.radius - 1, padding: 2 }}>
    {(options || RANGES).map((r) => {
      const k = r.key || r;
      return (
        <button key={k} onClick={() => setRange(k)} style={{
          background: range === k ? C.borderHi : "transparent",
          color: range === k ? C.text : C.dim,
          border: "none", borderRadius: Math.max(0, C.radius - 2), padding: "3px 9px", fontSize: 9.5,
          fontWeight: 600, cursor: "pointer", fontFamily: C.monoFont,
          transition: "all 0.15s",
        }}>{k}</button>
      );
    })}
  </div>
)};

const ChartCard = ({ title, subtitle, children, headerRight, wide }) => {
  const { C } = useTheme();
  return (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: C.radius,
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
)};

const PriceLabel = ({ data, color, prefix = "", suffix = "" }) => {
  const { C, activeThemeId } = useTheme();
  color = color || C.accent;
  if (!data || data.length === 0) return null;
  const last = data[data.length - 1]?.value;
  const prev = data[data.length - 2]?.value;
  const ch = prev ? ((last - prev) / prev * 100).toFixed(2) : 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
      <span style={{ fontSize: activeThemeId === 'bloomberg' ? 20 : 18, fontWeight: 700, color, fontFamily: C.monoFont }}>
        {prefix}{last?.toLocaleString(undefined, { maximumFractionDigits: 4 })}{suffix}
      </span>
      <span style={{ fontSize: 11, color: ch >= 0 ? C.green : C.red, fontFamily: C.monoFont }}>
        {ch >= 0 ? "+" : ""}{ch}%
      </span>
    </div>
  );
};

const SmallAreaChart = ({ data, color, height = 130, yDomain }) => {
  const { C } = useTheme();
  color = color || C.accent;
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

const StatPill = ({ label, value, color }) => {
  const { C } = useTheme();
  return (
  <div style={{
    background: C.bgSub,
    border: `1px solid ${C.border}`,
    borderRadius: Math.max(0, C.radius - 1),
    padding: "10px 14px",
    textAlign: "center",
    minWidth: 0,
  }}>
    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color: color || C.text, fontFamily: C.monoFont }}>{value || "-"}</div>
  </div>
)};


/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: EQUITIES
   ═══════════════════════════════════════════════════════════════════════════ */

const EquitiesSection = ({ data }) => {
  const { C } = useTheme();
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
  const { C } = useTheme();
  return (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
    {(data?.metals || []).map((m, i) => (
      <ChartCard key={i} title={m.symbol} subtitle={m.name} headerRight={<PriceLabel data={m.history} />}>
        <SmallAreaChart data={m.history} color={C.lines[i % C.lines.length]} />
      </ChartCard>
    ))}
    <ChartCard title="Energy Markets" wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, height: "100%" }}>
        {(data?.energy || []).map((e, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{e.name}</div>
            <SmallAreaChart data={e.history} color={C.orange} height={100} />
          </div>
        ))}
      </div>
    </ChartCard>
    <ChartCard title="Agriculture" wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {(data?.agriculture || []).map((a, i) => (
          <StatPill key={i} label={a.name} value={a.history?.[a.history.length - 1]?.value?.toFixed(2)} />
        ))}
      </div>
    </ChartCard>
  </div>
)};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: BONDS
   ═══════════════════════════════════════════════════════════════════════════ */

const BondsSection = ({ data }) => {
  const { C } = useTheme();
  return (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
    <ChartCard title="US Yield Curve" subtitle="Treasury Rates" wide>
      <div style={{ height: 220, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data?.yield_curve || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="maturity" stroke={C.dim} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={C.dim} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<TT suf="%" />} />
            <Bar dataKey="rate" fill={C.bgSub} radius={[C.radius, C.radius, 0, 0]} />
            <Line type="monotone" dataKey="rate" stroke={C.accent} strokeWidth={2} dot={{ r: 4, fill: C.bg, stroke: C.accent, strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ChartCard title="Global 10Y Yields">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {(data?.global_yields || []).map((y, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.bgSub, borderRadius: C.radius, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{y.country}</span>
              <span style={{ fontSize: 14, fontFamily: C.monoFont, fontWeight: 700, color: C.text }}>{y.yield.toFixed(3)}%</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  </div>
)};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: FOREX
   ═══════════════════════════════════════════════════════════════════════════ */

const ForexSection = ({ data }) => {
  const { C } = useTheme();
  return (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ChartCard title="DXY Dollar Index" subtitle="Base Currency Strength">
        <div style={{ fontSize: 32, fontWeight: 700, color: C.text, fontFamily: C.monoFont, marginTop: 10, textAlign: "center" }}>
          {data?.dxy?.history?.[data.dxy.history.length - 1]?.value?.toFixed(2) || "104.25"}
        </div>
        <SmallAreaChart data={data?.dxy?.history} color={C.green} height={80} yDomain={[100, 107]} />
      </ChartCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatPill label="EUR/USD" value="1.0824" />
        <StatPill label="GBP/USD" value="1.2650" />
        <StatPill label="USD/JPY" value="150.32" />
        <StatPill label="USD/CHF" value="0.8810" />
      </div>
    </div>
    <ChartCard title="Major Crosses" wide>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {(data?.pairs || []).map((p, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>{p.pair}</div>
            <SmallAreaChart data={p.history} color={C.lines[i % C.lines.length]} height={80} />
          </div>
        ))}
      </div>
    </ChartCard>
  </div>
)};

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION: US ECONOMY
   ═══════════════════════════════════════════════════════════════════════════ */

const USEconomySection = ({ data }) => {
  const { C } = useTheme();

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
    { label: "NFP (Latest)", value: `+${getLatest('nfp')}K`, color: C.green },
    { label: "Unemployment", value: `${getLatest('unemp').toFixed(1)}%`, color: C.purple },
    { label: "Fed Funds", value: `${getLatest('fedfunds').toFixed(2)}%`, color: C.accent },
    { label: "Core PCE", value: `${getLatest('corepce').toFixed(1)}%`, color: C.purple },
    { label: "30Y Mortgage", value: `${getLatest('mortgage30').toFixed(2)}%`, color: C.pink },
    { label: "Initial Claims", value: `${getLatest('claims').toFixed(0)}K`, color: C.blue },
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
  const { C } = useTheme(); // Added C here
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
  const { C } = useTheme(); // Added C here
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
  { id: "news", label: "News", icon: "≣" },
];

export default function NexusTerminal() {
  const { C, activeThemeId, THEMES, toggleTheme } = useTheme();
  const [tab, setTab] = useState("equities");
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newsAlerts, setNewsAlerts] = useState([]);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isNewsSettingsOpen, setIsNewsSettingsOpen] = useState(false);
  
  // Breaking news customizations
  const [breakingNewsPrefs, setBreakingNewsPrefs] = useState(() => {
    const saved = localStorage.getItem("breakingNewsPrefs");
    return saved ? JSON.parse(saved) : ["Geopolitics", "Economy", "Commodities", "Equities", "Crypto", "Generic"];
  });

  // Sentiment specific states
  const [sentimentScores, setSentimentScores] = useState(null);
  const [sentimentFunds, setSentimentFunds] = useState([]);
  const [sentimentSignals, setSentimentSignals] = useState([]);

  // Crypto treasuries specific state
  const [cryptoTreasuries, setCryptoTreasuries] = useState([]);

  useEffect(() => {
    localStorage.setItem("breakingNewsPrefs", JSON.stringify(breakingNewsPrefs));
  }, [breakingNewsPrefs]);

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
            // Apply filtering logic here too! 
            const filteredNews = response.data.news.filter(n => breakingNewsPrefs.includes(n.category));
            setNewsAlerts(filteredNews.slice(0, 5));
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
            // Apply user preferences filter!
            const filteredNews = response.data.news.filter(n => breakingNewsPrefs.includes(n.category));
            return filteredNews.slice(0, 5);
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
  }, [breakingNewsPrefs]);  // Add breakingNewsPrefs so polling is refreshed with new toggles

  const ts = apiData?.last_updated ? new Date(apiData.last_updated).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Updating...";

  return (
    <div style={{ fontFamily: C.font, background: C.bg, color: C.text, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        background: activeThemeId === 'haim' ? "linear-gradient(180deg, #0f1520 0%, #06090f 100%)" : C.bgSub,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 20px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1440, margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: C.radius,
              background: activeThemeId === 'haim' ? "#111" : C.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: activeThemeId === 'haim' ? "#e8e4df" : C.bg,
              fontFamily: C.monoFont,
              letterSpacing: 1,
              border: activeThemeId === 'haim' ? "1px solid #2a2a2a" : "none",
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
          <nav style={{ display: "flex", gap: 2, background: C.bgSub, borderRadius: C.radius, padding: 3, border: `1px solid ${C.border}` }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? C.card : "transparent",
                  color: tab === t.id ? C.accent : C.dim,
                  border: tab === t.id ? `1px solid ${C.borderHi}` : "1px solid transparent",
                  padding: "7px 14px",
                  borderRadius: Math.max(0, C.radius - 2),
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

          {/* Theme & Timestamp */}
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <select 
              value={activeThemeId}
              onChange={(e) => toggleTheme(e.target.value)}
              style={{
                background: C.bgSub,
                color: C.text,
                border: `1px solid ${C.border}`,
                padding: "4px 8px",
                borderRadius: C.radius,
                fontSize: 11,
                fontFamily: C.font,
                cursor: "pointer",
                outline: "none"
              }}
            >
              {Object.values(THEMES).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            
            <div style={{ textAlign: "right", minWidth: 140 }}>
              <div style={{ fontSize: 9.5, color: C.dim }}>Last updated</div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: C.monoFont }}>{ts}</div>
            </div>
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
            {tab === "news" && <DraggableNewsGrid newsData={apiData.news} />}
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
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 1 }}>{isNewsSettingsOpen ? "NEWS PREFERENCES" : (newsAlerts.length > 0 ? "BREAKING NEWS" : "NEWS CENTER")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setIsNewsSettingsOpen(!isNewsSettingsOpen)}
                  style={{ background: "transparent", border: "none", color: isNewsSettingsOpen ? C.text : C.dim, cursor: "pointer", fontSize: 14, padding: "0 4px" }}
                  title="Settings"
                >⚙️</button>
                <button
                  onClick={() => setIsNewsOpen(false)}
                  style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "center", height: 20 }}
                  title="Minimize"
                >−</button>
              </div>
            </div>

            {isNewsSettingsOpen ? (
              <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Select the categories for Breaking News.</div>
                {["Geopolitics", "Economy", "Commodities", "Equities", "Crypto", "Generic"].map(cat => (
                  <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={breakingNewsPrefs.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBreakingNewsPrefs(prev => [...prev, cat]);
                        } else {
                          setBreakingNewsPrefs(prev => prev.filter(p => p !== cat));
                        }
                      }}
                      style={{ accentColor: C.accent, cursor: "pointer", width: 14, height: 14 }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            ) : (
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
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 9.5, color: C.dim }}>{alert.source} • {new Date(alert.published).toLocaleTimeString()}</span>
                      <span style={{ fontSize: 9.5, color: C.accent, background: `${C.accent}20`, padding: "2px 6px", borderRadius: 4 }}>{alert.category || 'News'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                      {alert.title}
                    </div>
                  </a>
                )) : (
                  <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: "20px 0", fontFamily: "'JetBrains Mono', monospace" }}>Quiet. Waiting for market action...</div>
                )}
              </div>
            )}
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
