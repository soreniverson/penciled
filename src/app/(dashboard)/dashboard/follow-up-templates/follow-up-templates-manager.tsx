'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/page-header'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Mail, MessageSquare, Edit2 } from 'lucide-react'
import type { FollowUpTemplate } from '@/types/database'

type Meeting = {
  id: string
  name: string
}

type Props = {
  initialTemplates: FollowUpTemplate[]
  meetings: Meeting[]
}

type TemplateContent = {
  body?: string
  questions?: string[]
}

const DELAY_PRESETS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '1440', label: '1 day' },
  { value: '4320', label: '3 days' },
  { value: '10080', label: '1 week' },
]

export function FollowUpTemplatesManager({ initialTemplates, meetings }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FollowUpTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'email' | 'feedback_request'>('email')
  const [delayMinutes, setDelayMinutes] = useState('60')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  const resetForm = () => {
    setName('')
    setType('email')
    setDelayMinutes('60')
    setSubject('')
    setContent('')
    setSelectedMeetings([])
    setIsActive(true)
    setError(null)
  }

  const loadTemplate = (template: FollowUpTemplate) => {
    setName(template.name)
    setType(template.type)
    setDelayMinutes(String(template.delay_minutes))
    setSubject(template.subject || '')
    const templateContent = template.content as TemplateContent
    if (template.type === 'email') {
      setContent(templateContent?.body || '')
    } else {
      setContent(templateContent?.questions?.join('\n') || '')
    }
    setSelectedMeetings(template.apply_to_meetings || [])
    setIsActive(template.is_active)
  }

  const buildContentPayload = () => {
    if (type === 'email') {
      return { body: content }
    }
    return { questions: content.split('\n').filter(q => q.trim()) }
  }

  const formatDelay = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    if (minutes < 1440) return `${minutes / 60} hr`
    return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`
  }

  const handleCreate = async () => {
    setError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/follow-up-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          delay_minutes: parseInt(delayMinutes),
          subject: type === 'email' ? subject || null : null,
          content: buildContentPayload(),
          apply_to_meetings: selectedMeetings.length > 0 ? selectedMeetings : null,
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
      const response = await fetch(`/api/follow-up-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          delay_minutes: parseInt(delayMinutes),
          subject: type === 'email' ? subject || null : null,
          content: buildContentPayload(),
          apply_to_meetings: selectedMeetings.length > 0 ? selectedMeetings : null,
          is_active: isActive,
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
      const response = await fetch(`/api/follow-up-templates/${templateId}`, { method: 'DELETE' })

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId))
      }
    } catch {
      // Silent fail
    }
  }

  const openEditDialog = (template: FollowUpTemplate) => {
    loadTemplate(template)
    setEditingTemplate(template)
  }

  const toggleMeeting = (meetingId: string) => {
    setSelectedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    )
  }

  const FormContent = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Post-Meeting Thank You"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="feedback_request">Feedback Request</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="delay">Send After</Label>
        <Select value={delayMinutes} onValueChange={setDelayMinutes}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DELAY_PRESETS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Time after meeting ends to send the follow-up
        </p>
      </div>
      {type === 'email' && (
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Thank you for meeting with us"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="content">
          {type === 'email' ? 'Email Body' : 'Feedback Questions (one per line)'}
        </Label>
        <Textarea
          id="content"
          placeholder={type === 'email'
            ? "Thank you for taking the time to meet with us..."
            : "How was your experience?\nWould you recommend us?\nAny suggestions?"
          }
          value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          rows={type === 'email' ? 6 : 4}
        />
      </div>
      {meetings.length > 0 && (
        <div className="space-y-2">
          <Label>Apply to Meetings (optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Leave empty to apply to all meetings
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
            {meetings.map((meeting) => (
              <label key={meeting.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedMeetings.includes(meeting.id)}
                  onCheckedChange={() => toggleMeeting(meeting.id)}
                />
                <span className="text-sm">{meeting.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {editingTemplate && (
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Active</Label>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Follow-up Templates">
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Follow-up Template</DialogTitle>
              <DialogDescription>
                Automatically send follow-ups after meetings are completed
              </DialogDescription>
            </DialogHeader>
            <FormContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name || !content || saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <p className="text-muted-foreground">
        Automatically send follow-up emails or feedback requests after meetings are completed.
      </p>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setEditingTemplate(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Follow-up Template</DialogTitle>
          </DialogHeader>
          <FormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!name || !content || saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => {
            const templateContent = template.content as TemplateContent
            return (
              <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-lg flex items-center justify-center ${
                        template.type === 'email' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {template.type === 'email' ? (
                          <Mail className={`size-5 ${template.type === 'email' ? 'text-blue-600' : 'text-purple-600'}`} />
                        ) : (
                          <MessageSquare className="size-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {!template.is_active && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {template.type === 'email' ? 'Email' : 'Feedback Request'} · Sends {formatDelay(template.delay_minutes)} after meeting
                        </CardDescription>
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
                <CardContent>
                  <div className="text-sm">
                    {template.type === 'email' && template.subject && (
                      <p className="text-muted-foreground mb-1">Subject: {template.subject}</p>
                    )}
                    {template.type === 'email' && templateContent?.body && (
                      <p className="whitespace-pre-wrap line-clamp-2">{templateContent.body}</p>
                    )}
                    {template.type === 'feedback_request' && templateContent?.questions && (
                      <p className="text-muted-foreground">
                        {templateContent.questions.length} question{templateContent.questions.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {template.apply_to_meetings && template.apply_to_meetings.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Applied to {template.apply_to_meetings.length} meeting{template.apply_to_meetings.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="size-12 mx-auto mb-4 opacity-50" />
            <p>No follow-up templates yet.</p>
            <p className="text-sm">Create a template to automatically send follow-ups after meetings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
