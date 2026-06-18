export const APP_THEMES = {
  orange: {
    '--accent': '#f97316',
    '--accent-light': '#fb923c',
    '--accent-glow': 'rgba(249, 115, 22, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
  },
  blue: {
    '--accent': '#3b82f6',
    '--accent-light': '#60a5fa',
    '--accent-glow': 'rgba(59, 130, 246, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
  },
  purple: {
    '--accent': '#8b5cf6',
    '--accent-light': '#a78bfa',
    '--accent-glow': 'rgba(139, 92, 246, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
  },
  green: {
    '--accent': '#10b981',
    '--accent-light': '#34d399',
    '--accent-glow': 'rgba(16, 185, 129, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
  },
  rose: {
    '--accent': '#f43f5e',
    '--accent-light': '#fb7185',
    '--accent-glow': 'rgba(244, 63, 94, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)'
  },
  red: {
    '--accent': '#ef4444',
    '--accent-light': '#f87171',
    '--accent-glow': 'rgba(239, 68, 68, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
  },
  amber: {
    '--accent': '#f59e0b',
    '--accent-light': '#fbbf24',
    '--accent-glow': 'rgba(245, 158, 11, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
  },
  yellow: {
    '--accent': '#eab308',
    '--accent-light': '#facc15',
    '--accent-glow': 'rgba(234, 179, 8, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #eab308 0%, #facc15 100%)'
  },
  lime: {
    '--accent': '#84cc16',
    '--accent-light': '#a3e635',
    '--accent-glow': 'rgba(132, 204, 22, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #84cc16 0%, #a3e635 100%)'
  },
  teal: {
    '--accent': '#14b8a6',
    '--accent-light': '#2dd4bf',
    '--accent-glow': 'rgba(20, 184, 166, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)'
  },
  cyan: {
    '--accent': '#06b6d4',
    '--accent-light': '#22d3ee',
    '--accent-glow': 'rgba(6, 182, 212, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)'
  },
  indigo: {
    '--accent': '#6366f1',
    '--accent-light': '#818cf8',
    '--accent-glow': 'rgba(99, 102, 241, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
  },
  pink: {
    '--accent': '#ec4899',
    '--accent-light': '#f472b6',
    '--accent-glow': 'rgba(236, 72, 153, 0.25)',
    '--accent-gradient': 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
  }
};

export const applyTheme = (themeName) => {
  const theme = APP_THEMES[themeName];
  if (!theme) return;
  
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};
