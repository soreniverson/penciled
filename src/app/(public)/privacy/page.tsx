import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            penciled.fyi
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold mb-8">Privacy Policy</h1>
        <div className="prose prose-neutral max-w-none">
          <p className="text-muted-foreground">
            Last updated: January 2025
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Information We Collect</h2>
          <p>
            When you use penciled.fyi, we collect information necessary to provide our booking services:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Account information (name, email, business name)</li>
            <li>Booking information (appointments, services, availability)</li>
            <li>Google Calendar data (if you connect your calendar)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
          <p>
            We use your information to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Provide and improve our booking services</li>
            <li>Send booking confirmations and reminders</li>
            <li>Sync with your connected calendars</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">Data Security</h2>
          <p className="text-muted-foreground">
            We use industry-standard security measures to protect your data. Your data is stored securely and encrypted in transit.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Your Data Rights</h2>
          <p className="text-muted-foreground mb-4">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Right to Deletion:</strong> Request deletion of your personal data</li>
            <li><strong>Right to Portability:</strong> Request your data in a portable format</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@penciled.fyi" className="underline">
              privacy@penciled.fyi
            </a>
            . We will respond to your request within 30 days.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Analytics and Cookies</h2>
          <p className="text-muted-foreground mb-4">
            We use <strong>Plausible Analytics</strong>, a privacy-focused analytics service that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Does not use cookies</li>
            <li>Does not collect personal data</li>
            <li>Is fully GDPR compliant</li>
            <li>Does not track users across websites</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            We only use essential cookies required for authentication and maintaining your session. These cookies are necessary for the service to function and cannot be disabled.
          </p>
          <p className="text-muted-foreground mt-2">
            Because we use Plausible Analytics and only essential cookies, no cookie consent banner is required.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
          <p className="text-muted-foreground">
            For privacy-related questions, contact us at{' '}
            <a href="mailto:privacy@penciled.fyi" className="underline">
              privacy@penciled.fyi
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
