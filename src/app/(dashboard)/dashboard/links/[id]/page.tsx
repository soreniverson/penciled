'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createUntypedClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowLeft, Users, Briefcase, Trash2, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Meeting, Provider, BookingLink, BookingLinkMember, BookingLinkMeeting } from '@/types/database'

type MemberWithProvider = BookingLinkMember & { providers: Provider }
type MeetingWithData = BookingLinkMeeting & { meetings: Meeting }
type BookingLinkWithRelations = BookingLink & {
  booking_link_members: MemberWithProvider[]
  booking_link_meetings: MeetingWithData[]
}

export default function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [bookingLink, setBookingLink] = useState<BookingLinkWithRelations | null>(null)
  const [currentUser, setCurrentUser] = useState<Provider | null>(null)
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([])

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [members, setMembers] = useState<{ id: string; memberId?: string; email: string; name: string | null; isRequired: boolean }[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const supabase = createUntypedClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Load current user's provider data
      const { data: provider } = await supabase
        .from('providers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (provider) {
        setCurrentUser(provider as Provider)
      }

      // Load booking link
      const { data: link, error: linkError } = await supabase
        .from('booking_links')
        .select(`
          *,
          booking_link_members (
            id,
            provider_id,
            is_required,
            providers:provider_id (*)
          ),
          booking_link_meetings (
            id,
            meeting_id,
            services:meeting_id (*)
          )
        `)
        .eq('id', resolvedParams.id)
        .eq('owner_id', user.id)
        .single()

      if (linkError || !link) {
        router.push('/dashboard/links')
        return
      }

      const typedLink = link as BookingLinkWithRelations
      setBookingLink(typedLink)
      setName(typedLink.name)
      setSlug(typedLink.slug)
      setDescription(typedLink.description || '')
      setIsActive(typedLink.is_active)

      // Set up members
      const memberList = (typedLink.booking_link_members as MemberWithProvider[]).map(m => ({
        id: m.provider_id,
        memberId: m.id,
        email: m.providers.email,
        name: m.providers.business_name || m.providers.name,
        isRequired: m.is_required,
      }))
      setMembers(memberList)

      // Set up selected meetings
      const meetingIds = (typedLink.booking_link_meetings as MeetingWithData[]).map(s => s.meeting_id)
      setSelectedMeetings(meetingIds)

      // Load all available meetings
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (meetingsData) {
        setAllMeetings(meetingsData as Meeting[])
      }

      setLoading(false)
    }

    loadData()
  }, [resolvedParams.id, router])

  const copyLink = async () => {
    const url = `${window.location.origin}/book/link/${slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addMember = async () => {
    if (!memberEmail.trim()) return

    setAddingMember(true)
    setMemberError(null)

    try {
      const supabase = createUntypedClient()

      // Look up provider by email
      const { data: providerData, error } = await supabase
        .from('providers')
        .select('id, email, name, business_name')
        .eq('email', memberEmail.trim().toLowerCase())
        .single()

      if (error || !providerData) {
        setMemberError('User not found. They must sign up for Penciled first.')
        return
      }

      const foundProvider = providerData as { id: string; email: string; name: string | null; business_name: string | null }

      // Check if already added
      if (members.some(m => m.id === foundProvider.id)) {
        setMemberError('This member is already added.')
        return
      }

      // Add to database
      const { data: newMember, error: insertError } = await supabase
        .from('booking_link_members')
        .insert({
          booking_link_id: resolvedParams.id,
          provider_id: foundProvider.id,
          is_required: true,
        } as any)
        .select()
        .single()

      if (insertError) throw insertError

      setMembers(prev => [...prev, {
        id: foundProvider.id,
        memberId: (newMember as { id: string } | null)?.id,
        email: foundProvider.email,
        name: foundProvider.business_name || foundProvider.name,
        isRequired: true,
      }])

      setMemberEmail('')
    } catch (err) {
      setMemberError('Failed to add member. Please try again.')
    } finally {
      setAddingMember(false)
    }
  }

  const removeMember = async (memberId: string | undefined, providerId: string) => {
    // Don't allow removing the owner
    if (providerId === currentUser?.id) return
    if (!memberId) return

    try {
      const supabase = createUntypedClient()
      await supabase
        .from('booking_link_members')
        .delete()
        .eq('id', memberId)

      setMembers(prev => prev.filter(m => m.id !== providerId))
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const toggleMemberRequired = async (memberId: string | undefined, providerId: string, currentRequired: boolean) => {
    // Owner must always be required
    if (providerId === currentUser?.id) return
    if (!memberId) return

    try {
      const supabase = createUntypedClient()
      await supabase
        .from('booking_link_members')
        .update({ is_required: !currentRequired } as any)
        .eq('id', memberId)

      setMembers(prev => prev.map(m =>
        m.id === providerId ? { ...m, isRequired: !currentRequired } : m
      ))
    } catch (err) {
      console.error('Failed to update member:', err)
    }
  }

  const toggleMeeting = async (meetingId: string) => {
    const supabase = createUntypedClient()
    const isSelected = selectedMeetings.includes(meetingId)

    try {
      if (isSelected) {
        // Remove meeting
        await supabase
          .from('booking_link_meetings')
          .delete()
          .eq('booking_link_id', resolvedParams.id)
          .eq('meeting_id', meetingId)

        setSelectedMeetings((prev: string[]) => prev.filter((id: string) => id !== meetingId))
      } else {
        // Add meeting
        await supabase
          .from('booking_link_meetings')
          .insert({
            booking_link_id: resolvedParams.id,
            meeting_id: meetingId,
          } as any)

        setSelectedMeetings((prev: string[]) => [...prev, meetingId])
      }
    } catch (err) {
      console.error('Failed to toggle meeting:', err)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createUntypedClient()

      // Check if slug is unique (excluding current link)
      if (slug !== bookingLink?.slug) {
        const { data: existingLink } = await supabase
          .from('booking_links')
          .select('id')
          .eq('slug', slug)
          .neq('id', resolvedParams.id)
          .single()

        if (existingLink) {
          setError('This URL slug is already taken. Please choose a different one.')
          setSaving(false)
          return
        }
      }

      // Update booking link
      const { error: updateError } = await supabase
        .from('booking_links')
        .update({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          is_active: isActive,
        })
        .eq('id', resolvedParams.id)

      if (updateError) throw updateError

      router.push('/dashboard/links')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this link? This cannot be undone.')) return

    setDeleting(true)

    try {
      const supabase = createUntypedClient()
      await supabase
        .from('booking_links')
        .delete()
        .eq('id', resolvedParams.id)

      router.push('/dashboard/links')
    } catch (err) {
      setError('Failed to delete link. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[600px] mx-auto">
      <div>
        <Link
          href="/dashboard/links"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to links
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Link</h1>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={copyLink}>
          {copied ? (
            <>
              <Check className="size-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
        <Link href={`/book/link/${slug}`} target="_blank">
          <Button variant="outline">
            <ExternalLink className="size-4 mr-2" />
            View Page
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Link Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Team Meeting"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/book/link/</span>
                <Input
                  id="slug"
                  placeholder="team-meeting"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Schedule a meeting with our team"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Team members whose availability will be checked for this link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current members */}
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary">
                  <div>
                    <p className="font-medium text-sm">{member.name || member.email}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={member.isRequired}
                        onCheckedChange={() => toggleMemberRequired(member.memberId, member.id, member.isRequired)}
                        disabled={member.id === currentUser?.id}
                      />
                      Required
                    </label>
                    {member.id !== currentUser?.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.memberId, member.id)}
                      >
                        Remove
                      </Button>
                    )}
                    {member.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground">Owner</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add member form */}
            <div className="flex gap-2">
              <Input
                placeholder="team@example.com"
                type="email"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value)
                  setMemberError(null)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addMember}
                disabled={addingMember || !memberEmail.trim()}
              >
                {addingMember ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            {memberError && (
              <p className="text-sm text-destructive">{memberError}</p>
            )}
          </CardContent>
        </Card>

        {/* Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="size-5" />
              Meetings
            </CardTitle>
            <CardDescription>
              Select which meetings are available on this booking link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No meetings found. <Link href="/dashboard/meetings" className="underline">Create a meeting</Link> first.
              </p>
            ) : (
              <div className="space-y-2">
                {allMeetings.map((meeting) => (
                  <label
                    key={meeting.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMeetings.includes(meeting.id)}
                      onCheckedChange={() => toggleMeeting(meeting.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{meeting.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {meeting.duration_minutes} min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete this link</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
          </Button>
          <Link href="/dashboard/links">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
