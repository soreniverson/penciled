'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createUntypedClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ArrowLeft, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'
import type { Service, Provider } from '@/types/database'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export default function NewLinkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentUser, setCurrentUser] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [members, setMembers] = useState<{ id: string; email: string; name: string | null; isRequired: boolean }[]>([])
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
        // Add current user as the first member (owner)
        setMembers([{
          id: provider.id,
          email: provider.email,
          name: provider.business_name || provider.name,
          isRequired: true,
        }])
      }

      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (servicesData) {
        setServices(servicesData as Service[])
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(generateSlug(value))
  }

  const addMember = async () => {
    if (!memberEmail.trim()) return

    setAddingMember(true)
    setMemberError(null)

    try {
      const supabase = createUntypedClient()

      // Look up provider by email
      const { data: provider, error } = await supabase
        .from('providers')
        .select('id, email, name, business_name')
        .eq('email', memberEmail.trim().toLowerCase())
        .single()

      if (error || !provider) {
        setMemberError('User not found. They must sign up for Penciled first.')
        return
      }

      // Check if already added
      if (members.some(m => m.id === provider.id)) {
        setMemberError('This member is already added.')
        return
      }

      setMembers(prev => [...prev, {
        id: provider.id,
        email: provider.email,
        name: provider.business_name || provider.name,
        isRequired: true,
      }])

      setMemberEmail('')
    } catch (err) {
      setMemberError('Failed to add member. Please try again.')
    } finally {
      setAddingMember(false)
    }
  }

  const removeMember = (id: string) => {
    // Don't allow removing the owner
    if (id === currentUser?.id) return
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const toggleMemberRequired = (id: string) => {
    // Owner must always be required
    if (id === currentUser?.id) return
    setMembers(prev => prev.map(m =>
      m.id === id ? { ...m, isRequired: !m.isRequired } : m
    ))
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim() || selectedServices.length === 0) {
      setError('Please fill in all required fields and select at least one service.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createUntypedClient()

      // Check if slug is unique
      const { data: existingLink } = await supabase
        .from('booking_links')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existingLink) {
        setError('This URL slug is already taken. Please choose a different one.')
        setSaving(false)
        return
      }

      // Create booking link
      const { data: newLink, error: linkError } = await supabase
        .from('booking_links')
        .insert({
          owner_id: currentUser?.id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          is_active: true,
        } as any)
        .select()
        .single()

      if (linkError || !newLink) {
        throw new Error('Failed to create booking link')
      }

      // Add members
      const memberInserts = members.map(m => ({
        booking_link_id: newLink.id,
        provider_id: m.id,
        is_required: m.isRequired,
      }))

      const { error: membersError } = await supabase
        .from('booking_link_members')
        .insert(memberInserts as any)

      if (membersError) {
        throw new Error('Failed to add members')
      }

      // Add services
      const serviceInserts = selectedServices.map(serviceId => ({
        booking_link_id: newLink.id,
        service_id: serviceId,
      }))

      const { error: servicesError } = await supabase
        .from('booking_link_services')
        .insert(serviceInserts as any)

      if (servicesError) {
        throw new Error('Failed to add services')
      }

      router.push('/dashboard/links')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
        <h1 className="text-2xl font-semibold tracking-tight">New Team Link</h1>
        <p className="text-muted-foreground mt-1">
          Create a booking link that checks availability for multiple team members.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Link Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Team Meeting"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
              Add team members whose availability will be checked for this link.
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
                        onCheckedChange={() => toggleMemberRequired(member.id)}
                        disabled={member.id === currentUser?.id}
                      />
                      Required
                    </label>
                    {member.id !== currentUser?.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.id)}
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

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="size-5" />
              Services
            </CardTitle>
            <CardDescription>
              Select which services are available on this booking link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No services found. <Link href="/dashboard/services" className="underline">Create a service</Link> first.
              </p>
            ) : (
              <div className="space-y-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration_minutes} min
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Create Link'}
          </Button>
          <Link href="/dashboard/links">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
