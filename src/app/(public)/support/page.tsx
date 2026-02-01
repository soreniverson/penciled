import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with penciled.fyi',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Support</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              Need help with penciled.fyi? We&apos;re here to assist you.
            </p>
            <p className="text-muted-foreground">
              Email: <a href="mailto:support@penciled.fyi" className="text-primary hover:underline">support@penciled.fyi</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Common Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">How do I connect my calendar?</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Go to Dashboard → Settings → Integrations and click &quot;Connect Google Calendar&quot; to sync your availability.
                </p>
              </div>
              <div>
                <h3 className="font-medium">How do I set up Zoom integration?</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Go to Dashboard → Settings → Integrations and click &quot;Connect Zoom&quot;. Once connected, Zoom links will be automatically created for your bookings.
                </p>
              </div>
              <div>
                <h3 className="font-medium">How do I disconnect an integration?</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Go to Dashboard → Settings → Integrations and click the X button next to the integration you want to disconnect.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Response Time</h2>
            <p className="text-muted-foreground">
              We typically respond to support requests within 24 hours during business days.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
