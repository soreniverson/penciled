import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Own your calendar
          </h1>
          <p className="text-xl text-muted-foreground">
            Set availability, share links, get booked.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="gap-2 bg-neutral-50 hover:bg-neutral-200 text-neutral-900">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Free to use. No credit card required.
          </p>
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
