'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generateSlug } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { Loader2, Check, X, ImageIcon, ChevronRight, Pencil } from 'lucide-react'
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
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Current values (for display)
  const [currentName, setCurrentName] = useState(initialProvider.name || '')
  const [currentBusinessName, setCurrentBusinessName] = useState(initialProvider.business_name || '')
  const [currentSlug, setCurrentSlug] = useState(initialProvider.slug || '')
  const [currentTimezone, setCurrentTimezone] = useState(initialProvider.timezone || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(initialProvider.logo_url || null)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editTimezone, setEditTimezone] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(true)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Check slug availability when editing
  useEffect(() => {
    if (!editModalOpen) return
    if (!editSlug || editSlug === currentSlug) {
      setSlugAvailable(editSlug === currentSlug ? true : null)
      return
    }

    const checkSlug = async () => {
      setCheckingSlug(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('id')
        .eq('slug', editSlug)
        .neq('id', initialProvider.id)
        .maybeSingle()

      setSlugAvailable(!data)
      setCheckingSlug(false)
    }

    const debounce = setTimeout(checkSlug, 500)
    return () => clearTimeout(debounce)
  }, [editSlug, currentSlug, initialProvider.id, editModalOpen])

  const openEditModal = () => {
    setEditName(currentName)
    setEditBusinessName(currentBusinessName)
    setEditSlug(currentSlug)
    setEditTimezone(currentTimezone)
    setSlugAvailable(true)
    setEditModalOpen(true)
  }

  const saveSettings = useCallback(async () => {
    if (!slugAvailable) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('providers')
        // @ts-ignore - Supabase types not inferring correctly
        .update({
          name: editName || null,
          business_name: editBusinessName || null,
          slug: editSlug || null,
          timezone: editTimezone,
        })
        .eq('id', initialProvider.id)

      if (!error) {
        setCurrentName(editName)
        setCurrentBusinessName(editBusinessName)
        setCurrentSlug(editSlug)
        setCurrentTimezone(editTimezone)
        setEditModalOpen(false)
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
  }, [editName, editBusinessName, editSlug, editTimezone, slugAvailable, initialProvider.id])

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Account</CardTitle>
            <Button variant="ghost" size="sm" onClick={openEditModal}>
              <Pencil className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Logo */}
            <label className="block shrink-0">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo || !!logoUrl}
                className="hidden"
              />
              {logoUrl ? (
                <div className="relative group size-14 cursor-default">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={56}
                    height={56}
                    className="size-14 rounded-lg object-contain bg-muted"
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
                <div className="size-14 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
                  {uploadingLogo ? (
                    <Loader2 className="size-5 text-muted-foreground/50 animate-spin" />
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground/50" />
                  )}
                </div>
              )}
            </label>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-medium truncate">{currentName || 'No name set'}</p>
              <p className="text-sm text-muted-foreground truncate">{initialProvider.email}</p>
              {(currentBusinessName || currentSlug) && (
                <p className="text-sm text-muted-foreground truncate">
                  {currentBusinessName}
                  {currentBusinessName && currentSlug && <span className="mx-1.5">·</span>}
                  {currentSlug && <>penciled.fyi/{currentSlug}</>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Company</Label>
              <Input
                id="businessName"
                value={editBusinessName}
                onChange={(e) => setEditBusinessName(e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Link</Label>
              <div className="flex items-center">
                <span className="px-2 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground shrink-0">
                  penciled.fyi/
                </span>
                <Input
                  id="slug"
                  className="rounded-l-none"
                  value={editSlug}
                  onChange={(e) => setEditSlug(generateSlug(e.target.value))}
                />
              </div>
              {!checkingSlug && slugAvailable === false && (
                <p className="text-xs text-destructive">Taken</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={editTimezone} onValueChange={setEditTimezone}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={saving || slugAvailable === false}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
