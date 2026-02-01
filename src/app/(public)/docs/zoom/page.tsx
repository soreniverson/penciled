import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Zoom Integration Guide',
  description: 'Learn how to connect and use Zoom with penciled.fyi',
}

export default function ZoomDocsPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Zoom Integration Guide</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <p className="text-muted-foreground">
              Connect your Zoom account to automatically create Zoom meeting links for your bookings.
              When a client books an appointment, a unique Zoom meeting will be created and the join link
              will be included in the confirmation email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Connecting Zoom</h2>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>Log in to your penciled.fyi dashboard</li>
              <li>Navigate to <strong>Settings → Integrations</strong></li>
              <li>Click <strong>&quot;Connect Zoom&quot;</strong></li>
              <li>You&apos;ll be redirected to Zoom to authorize the connection</li>
              <li>Click <strong>&quot;Allow&quot;</strong> to grant penciled.fyi access to create meetings</li>
              <li>You&apos;ll be redirected back to penciled.fyi with Zoom connected</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Using Zoom with Bookings</h2>
            <p className="text-muted-foreground mb-4">
              Once connected, Zoom meetings are automatically created when:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>A client books an appointment with you</li>
              <li>You create a booking via Quick Book</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              The Zoom meeting link will be included in confirmation emails sent to both you and your client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Meeting Updates</h2>
            <p className="text-muted-foreground">
              When a booking is rescheduled, the associated Zoom meeting is automatically updated
              with the new time. When a booking is cancelled, the Zoom meeting is deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Disconnecting Zoom</h2>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>Go to <strong>Settings → Integrations</strong></li>
              <li>Click the <strong>X</strong> button next to Zoom</li>
              <li>Confirm the disconnection</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              After disconnecting, new bookings will use Google Meet links instead (if Google Calendar is connected)
              or no video link. Existing Zoom meetings will not be affected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Permissions</h2>
            <p className="text-muted-foreground mb-4">
              penciled.fyi requests the following Zoom permissions:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>View your user information</strong> - To identify your Zoom account</li>
              <li><strong>Create and manage meetings</strong> - To create, update, and delete meetings for your bookings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground">
              If you encounter any issues with the Zoom integration, please contact us at{' '}
              <a href="mailto:support@penciled.fyi" className="text-primary hover:underline">
                support@penciled.fyi
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
