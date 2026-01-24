export type AccentColor = 'sand' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

// Full theme palette - each theme has tinted versions of all UI colors
export type ThemePalette = {
  // Core palette (like sand-50 through sand-900)
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
  sand: {
    50: '#fdfcf9',
    100: '#f9f7f3',
    200: '#f2efe8',
    300: '#e5e1d7',
    400: '#c9c4b7',
    500: '#a8a292',
    600: '#7d7869',
    700: '#5c584b',
    800: '#3a3832',
    900: '#262520',
    950: '#171612',
  },
  blue: {
    50: '#f0f7ff',
    100: '#e0efff',
    200: '#c7e0ff',
    300: '#a3cdff',
    400: '#75b1ff',
    500: '#4a8fe8',
    600: '#3b7dd9',
    700: '#2d66b8',
    800: '#1e4a8a',
    900: '#1a3a6b',
    950: '#0f2440',
  },
  green: {
    50: '#f0fdf6',
    100: '#dcfce9',
    200: '#bbf7d4',
    300: '#86efb4',
    400: '#4ade8a',
    500: '#22c564',
    600: '#16a34f',
    700: '#158041',
    800: '#166536',
    900: '#14532e',
    950: '#0a2e19',
  },
  orange: {
    50: '#fff8f0',
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
  { value: 'sand', label: 'Sand', color: '#262520' },
  { value: 'blue', label: 'Blue', color: '#1a3a6b' },
  { value: 'green', label: 'Green', color: '#14532e' },
  { value: 'orange', label: 'Orange', color: '#7c2d12' },
  { value: 'red', label: 'Red', color: '#7f1d1d' },
  { value: 'purple', label: 'Purple', color: '#581c87' },
]

export function getThemeStyles(accentColor: AccentColor): React.CSSProperties {
  const palette = themes[accentColor]

  return {
    // Override the full sand palette with theme colors
    '--sand-50': palette[50],
    '--sand-100': palette[100],
    '--sand-200': palette[200],
    '--sand-300': palette[300],
    '--sand-400': palette[400],
    '--sand-500': palette[500],
    '--sand-600': palette[600],
    '--sand-700': palette[700],
    '--sand-800': palette[800],
    '--sand-900': palette[900],
    '--sand-950': palette[950],
    // Also override Tailwind color variables
    '--color-sand-50': palette[50],
    '--color-sand-100': palette[100],
    '--color-sand-200': palette[200],
    '--color-sand-300': palette[300],
    '--color-sand-400': palette[400],
    '--color-sand-500': palette[500],
    '--color-sand-600': palette[600],
    '--color-sand-700': palette[700],
    '--color-sand-800': palette[800],
    '--color-sand-900': palette[900],
    '--color-sand-950': palette[950],
    // Override semantic colors that reference the palette
    '--background': palette[50],
    '--foreground': palette[900],
    '--primary': palette[900],
    '--primary-light': palette[700],
    '--primary-foreground': palette[50],
    '--border': palette[200],
    '--input': palette[200],
    '--ring': palette[400],
    '--muted': palette[100],
    '--muted-foreground': palette[600],
    '--accent': palette[100],
    '--accent-foreground': palette[900],
    '--secondary': palette[100],
    '--secondary-foreground': palette[900],
    '--card-foreground': palette[900],
    '--popover-foreground': palette[900],
    // Tailwind versions
    '--color-background': palette[50],
    '--color-foreground': palette[900],
    '--color-primary': palette[900],
    '--color-primary-light': palette[700],
    '--color-primary-foreground': palette[50],
    '--color-border': palette[200],
    '--color-input': palette[200],
    '--color-ring': palette[400],
    '--color-muted': palette[100],
    '--color-muted-foreground': palette[600],
    '--color-accent': palette[100],
    '--color-accent-foreground': palette[900],
    '--color-secondary': palette[100],
    '--color-secondary-foreground': palette[900],
    '--color-card-foreground': palette[900],
    '--color-popover-foreground': palette[900],
  } as React.CSSProperties
}
