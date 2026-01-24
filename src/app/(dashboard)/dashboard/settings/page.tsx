'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { themeOptions, type AccentColor } from '@/lib/themes'
import { Loader2, Check, ExternalLink, LogOut } from 'lucide-react'
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

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [provider, setProvider] = useState<Provider | null>(null)

  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [timezone, setTimezone] = useState('')
  const [collectPhone, setCollectPhone] = useState(false)
  const [accentColor, setAccentColor] = useState<AccentColor>('sand')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  useEffect(() => {
    const loadProvider = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('providers')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(res => ({ ...res, data: res.data as Provider | null }))

      if (data) {
        setProvider(data)
        setName(data.name || '')
        setBusinessName(data.business_name || '')
        setSlug(data.slug || '')
        setTimezone(data.timezone || '')
        setCollectPhone(data.collect_phone ?? false)
        setAccentColor(data.accent_color || 'sand')
        setSlugAvailable(true)
      }

      setLoading(false)
    }

    loadProvider()
  }, [])

  // Check slug availability
  useEffect(() => {
    if (!slug || slug === provider?.slug) {
      setSlugAvailable(slug === provider?.slug ? true : null)
      return
    }

    const checkSlug = async () => {
      setCheckingSlug(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('slug', slug)
        .neq('id', provider?.id || '')
        .maybeSingle()

      setSlugAvailable(!data)
      setCheckingSlug(false)
    }

    const debounce = setTimeout(checkSlug, 500)
    return () => clearTimeout(debounce)
  }, [slug, provider])

  const handleSave = async () => {
    if (!provider || !slugAvailable) return

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
          accent_color: accentColor,
        })
        .eq('id', provider.id)

      if (error) {
        console.error('Supabase error:', error)
        alert(`Save failed: ${error.message}`)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const bookingUrl = slug ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${slug}` : null

  return (
    <div className="space-y-4 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <Button onClick={handleSave} disabled={saving || !slugAvailable}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="size-4 mr-2" />
          ) : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
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
              value={provider?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
            />
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
                penciled.fyi/book/
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
              <Link href={`/book/${slug}`} target="_blank">
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
          <Separator />
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label>Accent color</Label>
              <p className="text-xs text-muted-foreground">
                Choose a theme color for your booking page
              </p>
            </div>
            <div className="flex gap-2">
              {themeOptions.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => setAccentColor(theme.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    accentColor === theme.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: theme.color }}
                  title={theme.label}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/settings/integrations">
            <Button variant="outline">Manage Integrations</Button>
          </Link>
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
