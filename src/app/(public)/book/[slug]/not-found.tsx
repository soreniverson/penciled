import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

export default function BookingNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Calendar className="size-16 text-muted-foreground mb-6" />
      <h1 className="text-2xl font-semibold mb-2">Booking page not found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        This booking page doesn&apos;t exist. The provider may have changed their URL or deactivated their account.
      </p>
      <Link href="/">
        <Button>Back to penciled.fyi</Button>
      </Link>
    </div>
  )
}
