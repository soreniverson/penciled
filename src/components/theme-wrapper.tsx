'use client'

type Props = {
  children: React.ReactNode
}

export function ThemeWrapper({ children }: Props) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
