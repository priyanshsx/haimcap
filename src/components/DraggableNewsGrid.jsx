import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const C = {
  bgSub: "#0a0e18",
  card: "#0d1220",
  border: "#161e30",
  borderHi: "#1e2a42",
  text: "#dce4f0",
  dim: "#4a5a78",
  accent: "#7c6aff",
};

const CATEGORIES = ["Geopolitics", "Economy", "Commodities", "Equities", "Crypto", "Generic"];

export default function DraggableNewsGrid({ newsData }) {
  // 1. Initialize layout from local storage or default
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem("newsDashboardLayout");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length === 6) return parsed;
      } catch (e) { }
    }
    return CATEGORIES;
  });

  const [isEditing, setIsEditing] = useState(false);

  // Filter news roughly by category
  const categorizedNews = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = (newsData || []).filter(item => item.category === cat);
    return acc;
  }, {});

  // Save on change
  useEffect(() => {
    if (layout.length === 6) {
      localStorage.setItem("newsDashboardLayout", JSON.stringify(layout));
    }
  }, [layout]);

  const moveItem = (index, direction) => {
    const newLayout = [...layout];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newLayout.length) {
      const temp = newLayout[index];
      newLayout[index] = newLayout[targetIndex];
      newLayout[targetIndex] = temp;
      setLayout(newLayout);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Categorized News Feed</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            background: isEditing ? C.borderHi : "transparent",
            color: isEditing ? C.text : C.accent,
            border: `1px solid ${C.borderHi}`,
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          {isEditing ? "Done Editing" : "⚙️ Edit UI Layout"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {layout.map((category, index) => {
          const items = categorizedNews[category] || [];
          return (
            <div key={category} style={{
              background: C.card,
              border: `1px solid ${isEditing ? C.accent : C.border}`,
              borderRadius: 8,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              height: 320,
              position: "relative",
              transition: "all 0.2s ease"
            }}>
              {isEditing && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  display: "flex", gap: 4, zIndex: 10
                }}>
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    style={{ background: C.bgSub, border: `1px solid ${C.border}`, color: C.dim, padding: "2px 6px", borderRadius: 4, cursor: index === 0 ? "not-allowed" : "pointer" }}
                  >←</button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === 5}
                    style={{ background: C.bgSub, border: `1px solid ${C.border}`, color: C.dim, padding: "2px 6px", borderRadius: 4, cursor: index === 5 ? "not-allowed" : "pointer" }}
                  >→</button>
                </div>
              )}

              <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.5, textTransform: "uppercase" }}>{category}</div>
                <div style={{ fontSize: 9.5, color: C.dim }}>{items.length} updates in last 24h</div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
                {items.length === 0 ? (
                  <div style={{ color: C.dim, fontSize: 11, textAlign: "center", marginTop: 40, fontFamily: "'JetBrains Mono', monospace" }}>No recent news</div>
                ) : (
                  items.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", transition: "opacity 0.2s" }} onMouseOver={(e) => e.currentTarget.style.opacity = 0.8} onMouseOut={(e) => e.currentTarget.style.opacity = 1}>
                      <div style={{ fontSize: 9.5, color: C.dim, marginBottom: 2 }}>{item.source} • {new Date(item.published).toLocaleTimeString()}</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{item.title}</div>
                    </a>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
