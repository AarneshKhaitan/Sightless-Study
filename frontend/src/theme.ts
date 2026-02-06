export const colors = {
  bg: {
    primary: "#0f0f1a",
    secondary: "#1a1a2e",
    tertiary: "#242442",
    card: "#1e1e36",
    elevated: "#2a2a4a",
  },
  text: {
    primary: "#f0f0f5",
    secondary: "#a0a0b8",
    muted: "#6a6a80",
    inverse: "#0f0f1a",
  },
  accent: {
    primary: "#4cc9f0",
    primaryGlow: "rgba(76, 201, 240, 0.25)",
    secondary: "#7209b7",
    secondaryGlow: "rgba(114, 9, 183, 0.25)",
    pink: "#f72585",
    pinkGlow: "rgba(247, 37, 133, 0.25)",
  },
  status: {
    success: "#00e676",
    warning: "#ffc107",
    error: "#ff5252",
    errorGlow: "rgba(255, 82, 82, 0.3)",
  },
  button: {
    next: "linear-gradient(135deg, #4cc9f0, #3aa8d0)",
    back: "linear-gradient(135deg, #555, #444)",
    repeat: "linear-gradient(135deg, #7209b7, #5c07a0)",
    help: "linear-gradient(135deg, #f72585, #d01e6f)",
  },
  graph: {
    line: "#4cc9f0",
    grid: "#2a2a44",
    axis: "#555",
    min: "#00e676",
    peak: "#ff5252",
    inflection: "#ffc107",
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const typography = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    md: "1.125rem",
    lg: "1.25rem",
    xl: "1.5rem",
    xxl: "2rem",
    display: "2.75rem",
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const shadows = {
  sm: "0 2px 8px rgba(0, 0, 0, 0.3)",
  md: "0 4px 16px rgba(0, 0, 0, 0.4)",
  lg: "0 8px 32px rgba(0, 0, 0, 0.5)",
  glow: (color: string) => `0 0 20px ${color}, 0 0 40px ${color}`,
  glowSm: (color: string) => `0 0 10px ${color}`,
} as const;

export const transitions = {
  fast: "0.15s ease",
  normal: "0.3s ease",
  slow: "0.5s ease",
} as const;
