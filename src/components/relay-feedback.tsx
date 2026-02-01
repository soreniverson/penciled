'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    Relay?: {
      init: (config: { apiKey: string; apiUrl: string }) => void
    }
  }
}

export function RelayFeedback() {
  useEffect(() => {
    // Don't load if already loaded
    if (window.Relay) return

    const script = document.createElement('script')
    script.src = 'https://relay-rouge.vercel.app/sdk/relay.min.js'
    script.onload = () => {
      window.Relay?.init({
        apiKey: 'rly__mRYMVbmIu_JTKzbYT4nX1585jJ-ccHq',
        apiUrl: 'https://relay-rouge.vercel.app/api/trpc',
      })
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount if needed
      const existingScript = document.querySelector(
        'script[src="https://relay-rouge.vercel.app/sdk/relay.min.js"]'
      )
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return null
}
