'use client'

import { getThemeStyles, type AccentColor } from '@/lib/themes'

type Props = {
  accentColor: AccentColor
  children: React.ReactNode
}

export function ThemeWrapper({ accentColor, children }: Props) {
  const themeStyles = getThemeStyles(accentColor)

  return (
    <div style={themeStyles} className="min-h-screen">
      {children}
    </div>
  )
}
