'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Hook for managing delegate context - allows delegates to switch to managing
 * a principal's calendar.
 *
 * The context is stored in URL search params for deep-linking support.
 */
export function useDelegateContext() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentPrincipalId = searchParams.get('principal')

  const switchContext = useCallback((principalId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (principalId) {
      params.set('principal', principalId)
    } else {
      params.delete('principal')
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }, [searchParams, router, pathname])

  const clearContext = useCallback(() => {
    switchContext(null)
  }, [switchContext])

  return {
    currentPrincipalId,
    switchContext,
    clearContext,
    isActingAsDelegate: !!currentPrincipalId,
  }
}
