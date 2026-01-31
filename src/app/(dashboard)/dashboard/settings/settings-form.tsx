'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { generateSlug } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Loader2, Check, ExternalLink, LogOut, Upload, X, ImageIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'
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

  const [name, setName] = useState(initialProvider.name || '')
  const [businessName, setBusinessName] = useState(initialProvider.business_name || '')
  const [slug, setSlug] = useState(initialProvider.slug || '')
  const [timezone, setTimezone] = useState(initialProvider.timezone || '')
  const [collectPhone, setCollectPhone] = useState(initialProvider.collect_phone ?? false)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialProvider.logo_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(true)
  const [checkingSlug, setCheckingSlug] = useState(false)

  // Mark initial load complete after first render
  useEffect(() => {
    const timer = setTimeout(() => { isInitialLoad.current = false }, 100)
    return () => clearTimeout(timer)
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
          collect_phone: collectPhone,
        })
        .eq('id', initialProvider.id)

      if (!error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }, [name, businessName, slug, timezone, collectPhone, slugAvailable, initialProvider.id])

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (isInitialLoad.current) return
    if (!slugAvailable) return

    const timeout = setTimeout(() => {
      saveSettings()
    }, 800)

    return () => clearTimeout(timeout)
  }, [name, businessName, slug, timezone, collectPhone, saveSettings, slugAvailable])

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

  const bookingUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${slug}` : null

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
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={initialProvider.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
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
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Displayed on your booking page. Max 2MB.
            </p>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="size-16 rounded-lg object-contain bg-muted"
                  />
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    disabled={uploadingLogo}
                    className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <div className="size-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <ImageIcon className="size-6 text-muted-foreground/50" />
                </div>
              )}
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  asChild
                >
                  <span className="cursor-pointer">
                    {uploadingLogo ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="size-4 mr-2" />
                    )}
                    {logoUrl ? 'Change' : 'Upload'}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <div className="flex items-center gap-0">
              <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                penciled.fyi/
              </span>
              <Input
                id="slug"
                className="rounded-l-none"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
              />
            </div>
            {checkingSlug && (
              <p className="text-sm text-muted-foreground">Checking availability...</p>
            )}
            {!checkingSlug && slugAvailable === true && slug && (
              <p className="text-sm text-green-600">This URL is available</p>
            )}
            {!checkingSlug && slugAvailable === false && (
              <p className="text-sm text-destructive">This URL is taken</p>
            )}
          </div>
          {bookingUrl && (
            <div className="flex items-center gap-4">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
                {bookingUrl}
              </code>
              <Link href={`/${slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-1">
                  Open <ExternalLink className="size-3" />
                </Button>
              </Link>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="collectPhone">Collect phone number</Label>
              <p className="text-xs text-muted-foreground">
                Ask clients for their phone number when booking
              </p>
            </div>
            <Switch
              id="collectPhone"
              checked={collectPhone}
              onCheckedChange={setCollectPhone}
            />
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
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors border-b"
            >
              <div>
                <p className="font-medium text-sm">Integrations</p>
                <p className="text-xs text-muted-foreground">Google Calendar, Zoom</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/settings/delegates"
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors border-b"
            >
              <div>
                <p className="font-medium text-sm">Delegates</p>
                <p className="text-xs text-muted-foreground">Let others manage your bookings</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/pools"
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors border-b"
            >
              <div>
                <p className="font-medium text-sm">Resource Pools</p>
                <p className="text-xs text-muted-foreground">Team scheduling groups</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/templates"
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors border-b"
            >
              <div>
                <p className="font-medium text-sm">Meeting Templates</p>
                <p className="text-xs text-muted-foreground">Reusable agendas and notes</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/follow-up-templates"
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-medium text-sm">Follow-up Templates</p>
                <p className="text-xs text-muted-foreground">Automated post-meeting emails</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
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
