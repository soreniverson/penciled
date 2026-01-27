export type AccentColor = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

// Full theme palette - each theme has tinted versions of all UI colors
export type ThemePalette = {
  // Core palette
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

export const themes: Record<AccentColor, ThemePalette> = {
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
}

export const themeOptions: { value: AccentColor; label: string; color: string }[] = [
  { value: 'neutral', label: 'Neutral', color: '#fafafa' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
]

export function getThemeStyles(accentColor: AccentColor): React.CSSProperties {
  const palette = themes[accentColor]

  // For dark mode: use lighter shades for accents, darker for backgrounds
  return {
    // Override the neutral palette with theme colors
    '--neutral-50': palette[50],
    '--neutral-100': palette[100],
    '--neutral-200': palette[200],
    '--neutral-300': palette[300],
    '--neutral-400': palette[400],
    '--neutral-500': palette[500],
    '--neutral-600': palette[600],
    '--neutral-700': palette[700],
    '--neutral-800': palette[800],
    '--neutral-900': palette[900],
    '--neutral-950': palette[950],
    // Also override Tailwind color variables
    '--color-neutral-50': palette[50],
    '--color-neutral-100': palette[100],
    '--color-neutral-200': palette[200],
    '--color-neutral-300': palette[300],
    '--color-neutral-400': palette[400],
    '--color-neutral-500': palette[500],
    '--color-neutral-600': palette[600],
    '--color-neutral-700': palette[700],
    '--color-neutral-800': palette[800],
    '--color-neutral-900': palette[900],
    '--color-neutral-950': palette[950],
    // Dark mode semantic colors - accent colors affect primary/accent elements
    '--primary': palette[50],
    '--primary-light': palette[300],
    '--primary-foreground': palette[900],
    '--ring': palette[500],
    '--accent': palette[800],
    '--accent-foreground': palette[50],
    // Tailwind versions
    '--color-primary': palette[50],
    '--color-primary-light': palette[300],
    '--color-primary-foreground': palette[900],
    '--color-ring': palette[500],
    '--color-accent': palette[800],
    '--color-accent-foreground': palette[50],
  } as React.CSSProperties
}
