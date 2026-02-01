import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { formatDuration } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { MeetingForm } from './meeting-form'
import { MeetingActions } from './meeting-actions'
import type { Meeting } from '@/types/database'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .eq('provider_id', user.id)
    .order('created_at', { ascending: true })
    .returns<Meeting[]>()

  return (
    <div className="space-y-6 max-w-[780px] mx-auto">
      <PageHeader title="Meetings">
        <MeetingForm providerId={user.id}>
          <Button variant="outline" size="icon">
            <Plus className="size-4" />
          </Button>
        </MeetingForm>
      </PageHeader>

      {meetings && meetings.length > 0 ? (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className={!meeting.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{meeting.name}</h3>
                      {!meeting.is_active && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{formatDuration(meeting.duration_minutes)}</span>
                    {meeting.booking_mode === 'request' && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-yellow-600">Requires approval</span>
                      </>
                    )}
                  </div>
                  <MeetingActions meeting={meeting} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No meetings yet</p>
            <MeetingForm providerId={user.id}>
              <Button variant="link" className="mt-2">
                Create your first meeting
              </Button>
            </MeetingForm>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
