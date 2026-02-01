'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    Relay?: {
      init: (config: { apiKey: string; endpoint: string }) => void
    }
  }
}

export function RelayFeedback() {
  useEffect(() => {
    // Don't load if script already exists
    if (document.querySelector('script[src="https://relay-rouge.vercel.app/sdk/relay.min.js"]')) {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://relay-rouge.vercel.app/sdk/relay.min.js'
    script.onload = () => {
      window.Relay?.init({
        apiKey: 'rly__mRYMVbmIu_JTKzbYT4nX1585jJ-ccHq',
        endpoint: 'https://api-production-6495.up.railway.app',
      })
    }
    document.head.appendChild(script)
    // No cleanup - Relay should persist across navigation
  }, [])

  return null
}
