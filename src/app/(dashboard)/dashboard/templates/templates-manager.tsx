'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, FileText, Edit2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { MeetingTemplate } from '@/types/database'

type Props = {
  initialTemplates: MeetingTemplate[]
}

export function TemplatesManager({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agenda, setAgenda] = useState('')
  const [preMeetingNotes, setPreMeetingNotes] = useState('')
  const [postMeetingNotes, setPostMeetingNotes] = useState('')

  const resetForm = () => {
    setName('')
    setDescription('')
    setAgenda('')
    setPreMeetingNotes('')
    setPostMeetingNotes('')
    setError(null)
  }

  const loadTemplate = (template: MeetingTemplate) => {
    setName(template.name)
    setDescription(template.description || '')
    setAgenda(template.agenda || '')
    setPreMeetingNotes(template.pre_meeting_notes || '')
    setPostMeetingNotes(template.post_meeting_notes || '')
  }

  const handleCreate = async () => {
    setError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          agenda: agenda || null,
          pre_meeting_notes: preMeetingNotes || null,
          post_meeting_notes: postMeetingNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create template')
        return
      }

      setTemplates([data.template, ...templates])
      setShowCreateDialog(false)
      resetForm()
    } catch {
      setError('Failed to create template')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingTemplate) return

    setError(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          agenda: agenda || null,
          pre_meeting_notes: preMeetingNotes || null,
          post_meeting_notes: postMeetingNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update template')
        return
      }

      setTemplates(templates.map(t => t.id === editingTemplate.id ? data.template : t))
      setEditingTemplate(null)
      resetForm()
    } catch {
      setError('Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' })

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId))
      }
    } catch {
      // Silent fail
    }
  }

  const openEditDialog = (template: MeetingTemplate) => {
    loadTemplate(template)
    setEditingTemplate(template)
  }

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Templates">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="size-4 mr-1" />
              Settings
            </Button>
          </Link>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4 mr-1" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Client Onboarding"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Initial meeting with new clients"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda (optional)</Label>
                <Textarea
                  id="agenda"
                  placeholder="1. Introductions&#10;2. Review goals&#10;3. Discuss timeline&#10;4. Q&A"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preMeetingNotes">Pre-Meeting Notes (optional)</Label>
                <Textarea
                  id="preMeetingNotes"
                  placeholder="Notes to prepare before the meeting"
                  value={preMeetingNotes}
                  onChange={(e) => setPreMeetingNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postMeetingNotes">Post-Meeting Notes (optional)</Label>
                <Textarea
                  id="postMeetingNotes"
                  placeholder="Follow-up actions after the meeting"
                  value={postMeetingNotes}
                  onChange={(e) => setPostMeetingNotes(e.target.value)}
                  rows={3}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name || saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PageHeader>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setEditingTemplate(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-agenda">Agenda</Label>
              <Textarea
                id="edit-agenda"
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preMeetingNotes">Pre-Meeting Notes</Label>
              <Textarea
                id="edit-preMeetingNotes"
                value={preMeetingNotes}
                onChange={(e) => setPreMeetingNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postMeetingNotes">Post-Meeting Notes</Label>
              <Textarea
                id="edit-postMeetingNotes"
                value={postMeetingNotes}
                onChange={(e) => setPostMeetingNotes(e.target.value)}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!name || saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                      <Edit2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {template.agenda && (
                <CardContent>
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground mb-1">Agenda</p>
                    <p className="whitespace-pre-wrap text-sm">{template.agenda}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="size-12 mx-auto mb-4 opacity-50" />
            <p>No templates yet.</p>
            <p className="text-sm">Create a template to standardize your meeting agendas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
