import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function WaitlistPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            You're on the list
          </h1>
          <p className="text-muted-foreground mt-3">
            We're currently in closed beta. We'll let you know when it's your turn.
          </p>
          <div className="mt-8">
            <Link href="/">
              <Button variant="outline">
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
