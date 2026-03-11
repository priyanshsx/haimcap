import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the three core themes
export const THEMES = {
  haim: {
    id: "haim",
    name: "Haim Capital",
    // Base colors
    bg: "#05070d",
    bgSub: "#0a0e18",
    card: "#0d1220",
    border: "#161e30",
    borderHi: "#1e2a42",
    text: "#dce4f0",
    dim: "#4a5a78",
    
    // Accents
    accent: "#7c6aff",
    green: "#6ee7b7",
    red: "#fb7185",
    orange: "#c4b5fd",
    purple: "#a78bfa",
    pink: "#c084fc",
    blue: "#818cf8",
    
    // Chart lines
    lines: ["#7c6aff", "#818cf8", "#a78bfa", "#c084fc", "#6ee7b7", "#60a5fa", "#c4b5fd", "#93c5fd"],
    
    // Structural styling
    radius: 8,
    cardBorder: "1px solid",
    font: "'IBM Plex Sans', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', monospace",
  },
  
  bloomberg: {
    id: "bloomberg",
    name: "Terminal",
    // Pitch black and high contrast
    bg: "#000000",
    bgSub: "#000000",
    card: "#000000",
    border: "#333333",
    borderHi: "#555555",
    text: "#ffb703", // Classic Bloomberg Amber
    dim: "#885a00", 
    
    // Harsh neon accents
    accent: "#ffb703",
    green: "#00ff00",
    red: "#ff0000",
    orange: "#ff5500",
    purple: "#ffb703",
    pink: "#ffb703",
    blue: "#00aaff",
    
    // High contrast chart lines
    lines: ["#ffb703", "#00aaff", "#ffffff", "#00ff00", "#ff00ff", "#ff5500", "#ffff00"],
    
    // Structural styling (hard edges, thin lines)
    radius: 0,
    cardBorder: "1px solid",
    font: "monospace, 'Courier New', Courier",
    monoFont: "monospace, 'Courier New', Courier",
  },
  
  minimal: {
    id: "minimal",
    name: "Corporate Minimal",
    // Bright white and grays
    bg: "#f3f4f6", // very light gray bg
    bgSub: "#e5e7eb",
    card: "#ffffff", // pure white cards
    border: "#e5e7eb",
    borderHi: "#d1d5db",
    text: "#111827", // almost black
    dim: "#6b7280", // standard gray
    
    // Muted corporate accents
    accent: "#3b82f6", // trustworthy blue
    green: "#10b981", 
    red: "#ef4444",
    orange: "#f59e0b",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#3b82f6",
    
    // Muted chart lines
    lines: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#6366f1", "#ec4899"],
    
    // Structural styling
    radius: 4,
    cardBorder: "1px solid",
    font: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    monoFont: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Try to load saved theme from LocalStorage, default to "haim"
  const [activeThemeId, setActiveThemeId] = useState(() => {
    const saved = localStorage.getItem('terminal_theme');
    return (saved && THEMES[saved]) ? saved : 'haim';
  });

  // Save on change
  useEffect(() => {
    localStorage.setItem('terminal_theme', activeThemeId);
    
    // Inject the theme's background color directly into the document body to prevent white flashes
    document.body.style.backgroundColor = THEMES[activeThemeId].bg;
    
    // Add logic to disable the cosmos canvas if it's not the haim theme
    const cosmosCanvas = document.getElementById('cosmos-canvas');
    if (cosmosCanvas) {
      if (activeThemeId !== 'haim') {
        cosmosCanvas.style.display = 'none';
      } else {
        cosmosCanvas.style.display = 'block';
      }
    }
  }, [activeThemeId]);

  const toggleTheme = (themeId) => {
    if (THEMES[themeId]) {
      setActiveThemeId(themeId);
    }
  };

  const C = THEMES[activeThemeId];

  return (
    <ThemeContext.Provider value={{ C, activeThemeId, toggleTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
