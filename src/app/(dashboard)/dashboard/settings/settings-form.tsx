'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateSlug } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Loader2, Check, ExternalLink, LogOut, X, ImageIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { Provider } from '@/types/database'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

type Props = {
  provider: Provider
}

export function SettingsForm({ provider: initialProvider }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isInitialLoad = useRef(true)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [name, setName] = useState(initialProvider.name || '')
  const [businessName, setBusinessName] = useState(initialProvider.business_name || '')
  const [slug, setSlug] = useState(initialProvider.slug || '')
  const [timezone, setTimezone] = useState(initialProvider.timezone || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(initialProvider.logo_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(true)
  const [checkingSlug, setCheckingSlug] = useState(false)

  // Mark initial load complete after first render and cleanup timeouts
  useEffect(() => {
    const timer = setTimeout(() => { isInitialLoad.current = false }, 100)
    return () => {
      clearTimeout(timer)
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Check slug availability
  useEffect(() => {
    if (!slug || slug === initialProvider.slug) {
      setSlugAvailable(slug === initialProvider.slug ? true : null)
      return
    }

    const checkSlug = async () => {
      setCheckingSlug(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('slug', slug)
        .neq('id', initialProvider.id)
        .maybeSingle()

      setSlugAvailable(!data)
      setCheckingSlug(false)
    }

    const debounce = setTimeout(checkSlug, 500)
    return () => clearTimeout(debounce)
  }, [slug, initialProvider.slug, initialProvider.id])

  // Auto-save function
  const saveSettings = useCallback(async () => {
    if (!slugAvailable) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({
          name: name || null,
          business_name: businessName || null,
          slug: slug || null,
          timezone,
        })
        .eq('id', initialProvider.id)

      if (!error) {
        setSaved(true)
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current)
        }
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }, [name, businessName, slug, timezone, slugAvailable, initialProvider.id])

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (isInitialLoad.current) return
    if (!slugAvailable) return

    const timeout = setTimeout(() => {
      saveSettings()
    }, 800)

    return () => clearTimeout(timeout)
  }, [name, businessName, slug, timezone, saveSettings, slugAvailable])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload logo')
      }

      const { url } = await response.json()
      setLogoUrl(url)
    } catch (error) {
      console.error('Logo upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoRemove = async () => {
    setUploadingLogo(true)

    try {
      const response = await fetch('/api/upload/logo', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove logo')
      }

      setLogoUrl(null)
    } catch (error) {
      console.error('Logo remove error:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Settings">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saved && <><Check className="size-4 text-green-500" /> Saved</>}
        </div>
      </PageHeader>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                value={initialProvider.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-xs text-muted-foreground">Company</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-xs text-muted-foreground">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs text-muted-foreground">Link</Label>
              <div className="relative">
                <div className="flex items-center">
                  <span className="px-2 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground shrink-0">
                    penciled.fyi/
                  </span>
                  <Input
                    id="slug"
                    className="rounded-l-none pr-9"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                  />
                </div>
                {slug && (
                  <Link href={`/${slug}`} target="_blank" className="absolute right-2 top-1/2 -translate-y-1/2">
                    <ExternalLink className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                )}
              </div>
              {!checkingSlug && slugAvailable === false && (
                <p className="text-xs text-destructive">Taken</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Logo</Label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo || !!logoUrl}
                  className="hidden"
                />
                {logoUrl ? (
                  <div className="relative group size-10 cursor-default">
                    <Image
                      src={logoUrl}
                      alt="Logo"
                      width={40}
                      height={40}
                      className="size-10 rounded-lg object-contain bg-muted"
                      unoptimized={logoUrl.startsWith('data:')}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleLogoRemove(); }}
                      disabled={uploadingLogo}
                      className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="size-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="size-10 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
                    {uploadingLogo ? (
                      <Loader2 className="size-4 text-muted-foreground/50 animate-spin" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground/50" />
                    )}
                  </div>
                )}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advanced</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <nav className="flex flex-col">
            <Link
              href="/dashboard/settings/integrations"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f]"
            >
              <span className="text-sm">Integrations</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
            <Link
              href="/dashboard/links"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f]"
            >
              <span className="text-sm">Team</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
            <Link
              href="/dashboard/settings/delegates"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f]"
            >
              <span className="text-sm">Delegates</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
            <Link
              href="/dashboard/pools"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f]"
            >
              <span className="text-sm">Pools</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
            <Link
              href="/dashboard/templates"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors border-b border-[#1f1f1f]"
            >
              <span className="text-sm">Templates</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
            <Link
              href="/dashboard/follow-up-templates"
              className="flex items-center justify-between px-6 py-3 hover:bg-[#1f1f1f] transition-colors"
            >
              <span className="text-sm">Follow-Ups</span>
              <ChevronRight className="size-4 text-[#525252]" />
            </Link>
          </nav>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <div className="pt-4">
        <form action="/api/auth/logout" method="POST">
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
            <LogOut className="size-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
