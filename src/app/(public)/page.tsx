'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Calendar,
  Clock,
  Bell,
  Users,
  Zap,
  Shield,
  Check,
} from 'lucide-react'

const roles = ['photographers', 'trainers', 'consultants', 'tutors', 'coaches']

function HowItWorksSection({ steps }: { steps: { number: string; title: string; description: string }[] }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const section = sectionRef.current
      const rect = section.getBoundingClientRect()
      const sectionHeight = section.offsetHeight
      const viewportHeight = window.innerHeight

      const startOffset = viewportHeight * 0.2
      const scrolled = startOffset - rect.top
      const totalScrollable = sectionHeight - viewportHeight * 0.2
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable))

      const stepProgress = progress * steps.length
      const newActiveStep = Math.min(Math.floor(stepProgress), steps.length - 1)
      setActiveStep(newActiveStep)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [steps.length])

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-neutral-800 border-y border-neutral-700">
      <div className="max-w-[1080px] mx-auto px-10 md:px-16">
        <div className="text-center pt-16 pb-10">
          <h2 className="text-3xl font-bold mb-2 text-foreground tracking-tight">Up and running in minutes</h2>
          <p className="text-muted-foreground">No tutorials needed. No learning curve.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-12 pb-16">
          {/* Left side - Steps that accumulate */}
          <div className="flex-1 space-y-6">
            {steps.map((step, index) => {
              const isActive = index === activeStep
              const isPast = index < activeStep
              const isFuture = index > activeStep

              return (
                <div
                  key={step.number}
                  className="flex items-start gap-5 transition-all duration-500"
                  style={{
                    opacity: isFuture ? 0.3 : isPast ? 0.5 : 1,
                    transform: isFuture ? 'translateY(10px)' : 'translateY(0)',
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-700 border border-neutral-600 flex items-center justify-center">
                    <span className="text-sm font-mono font-medium text-neutral-300">{step.number}</span>
                  </div>
                  <div className="pt-1.5">
                    <h3 className="font-semibold text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right side - Visual representation */}
          <div className="flex-1 relative hidden md:block">
            <div className="sticky top-32">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-700 shadow-sm bg-neutral-800 flex items-center justify-center">
                <div className="text-center p-8">
                  <div
                    className="transition-all duration-500"
                    style={{
                      opacity: activeStep === 0 ? 1 : 0,
                      position: activeStep === 0 ? 'relative' : 'absolute',
                    }}
                  >
                    <Calendar className="size-16 text-neutral-500 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-muted-foreground text-sm">Set your weekly schedule</p>
                  </div>
                  <div
                    className="transition-all duration-500"
                    style={{
                      opacity: activeStep === 1 ? 1 : 0,
                      position: activeStep === 1 ? 'relative' : 'absolute',
                    }}
                  >
                    <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600 max-w-xs mx-auto">
                      <p className="text-neutral-200 font-medium text-sm">penciled.fyi/your-name</p>
                    </div>
                    <p className="text-muted-foreground text-sm mt-4">Share your personalized link</p>
                  </div>
                  <div
                    className="transition-all duration-500"
                    style={{
                      opacity: activeStep === 2 ? 1 : 0,
                      position: activeStep === 2 ? 'relative' : 'absolute',
                    }}
                  >
                    <Bell className="size-16 text-neutral-500 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-muted-foreground text-sm">Both get notified instantly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CurvedMarquee({ testimonials }: { testimonials: { quote: string; author: string; role: string }[] }) {
  const [scrollX, setScrollX] = useState(0)
  const cardWidth = 336

  useEffect(() => {
    let animationId: number
    let lastTime = 0
    const speed = 0.5

    const animate = (time: number) => {
      if (lastTime) {
        setScrollX((prev) => {
          const newScroll = prev + speed
          const resetPoint = testimonials.length * cardWidth
          return newScroll >= resetPoint ? 0 : newScroll
        })
      }
      lastTime = time
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [testimonials.length])

  const allTestimonials = [...testimonials, ...testimonials]

  return (
    <div
      className="flex pt-4 pb-20"
      style={{ transform: `translateX(calc(-${scrollX}px - 168px))` }}
    >
      {allTestimonials.map((testimonial, index) => {
        const cardCenter = index * cardWidth + cardWidth / 2 - scrollX
        const viewportCenter = 540
        const normalizedDistance = (cardCenter - viewportCenter) / viewportCenter
        const rotation = normalizedDistance * 5
        const yOffset = Math.pow(Math.abs(normalizedDistance), 1.5) * 40

        return (
          <div
            key={`${testimonial.author}-${index}`}
            className="flex-shrink-0 w-[320px] mx-2 p-5 rounded-xl border border-neutral-700 bg-neutral-800 flex flex-col justify-between h-[180px] shadow-sm"
            style={{
              transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
            }}
          >
            <p className="text-neutral-200 text-sm">&ldquo;{testimonial.quote}&rdquo;</p>
            <div>
              <p className="text-sm font-medium text-neutral-200">{testimonial.author}</p>
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function HomePage() {
  const [roleIndex, setRoleIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: Calendar,
      title: 'Simple Scheduling',
      description: 'Set your availability once, let clients book when it works for both of you.',
    },
    {
      icon: Clock,
      title: 'Buffer Time',
      description: 'Automatic breaks between appointments so you never feel rushed.',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Email confirmations and reminders for you and your clients.',
    },
    {
      icon: Users,
      title: 'Client-Friendly',
      description: 'A beautiful booking page that works on any device.',
    },
    {
      icon: Zap,
      title: 'Google Calendar Sync',
      description: 'Two-way sync keeps everything in one place.',
    },
    {
      icon: Shield,
      title: 'No Double Bookings',
      description: 'We check your calendar so conflicts never happen.',
    },
  ]

  const testimonials = [
    {
      quote: "Finally, a booking tool that doesn't feel like enterprise software.",
      author: 'Sarah K.',
      role: 'Photography',
    },
    {
      quote: 'My clients love how easy it is to book. Setup took 5 minutes.',
      author: 'Marcus T.',
      role: 'Personal Training',
    },
    {
      quote: 'The Google Calendar sync is flawless. No more double bookings.',
      author: 'Jamie L.',
      role: 'Tutoring',
    },
    {
      quote: "Switched from Calendly and it's so much simpler.",
      author: 'Alex R.',
      role: 'Consulting',
    },
    {
      quote: 'The booking page is beautiful. Clients always compliment it.',
      author: 'Dana W.',
      role: 'Coaching',
    },
    {
      quote: 'Best value for money. Does everything I need.',
      author: 'Chris M.',
      role: 'Music Lessons',
    },
  ]

  const steps = [
    { number: '01', title: 'Set your availability', description: 'Tell us when you work. Morning person? Night owl? We adapt to you.' },
    { number: '02', title: 'Share your link', description: 'Get a personalized booking page like penciled.fyi/your-name.' },
    { number: '03', title: 'Get booked', description: 'Clients pick a time, you both get notified. That simple.' },
  ]

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Fixed vertical gridlines */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="max-w-[1080px] mx-auto h-full relative px-6">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-neutral-800" />
          <div className="absolute right-6 top-0 bottom-0 w-px bg-neutral-800" />
        </div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1080px] mx-auto px-6 flex h-16 items-center justify-between">
          <Link href="/" className="ml-4 text-xl font-semibold tracking-tight text-foreground">
            penciled.fyi
          </Link>
          <nav className="flex items-center gap-4 mr-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Link href="/login">
              <Button className="bg-neutral-50 hover:bg-neutral-200 text-neutral-900">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 relative">
        {/* Hero Section */}
        <section className="py-24 md:py-32">
          <div className="max-w-[1080px] mx-auto px-10">
            <div className="flex flex-col items-center text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl text-balance text-foreground">
                Booking made simple for independent providers
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl text-balance">
                Set your availability, share your link, get booked.
                Simpler than Acuity, warmer than Calendly, cheaper than both.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2 bg-neutral-50 hover:bg-neutral-200 text-neutral-900">
                    Start for free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-neutral-600 text-neutral-200 hover:bg-neutral-800 hover:text-foreground">
                    See how it works
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                No credit card required. Free plan available.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 border-t border-neutral-800">
          <div className="max-w-[1080px] mx-auto px-10 md:px-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Everything you need, nothing you don&apos;t</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built for people who want to focus on their work, not their calendar.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="p-5 rounded-xl border border-neutral-700 bg-neutral-800 hover:border-neutral-600 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-neutral-700 border border-neutral-600 flex items-center justify-center mb-4">
                    <feature.icon className="h-4 w-4 text-neutral-300" />
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <HowItWorksSection steps={steps} />

        {/* Testimonials */}
        <section className="py-20">
          <div className="max-w-[1080px] mx-auto px-10">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">
                Loved by{' '}
                <span className="inline-block min-w-[140px] text-left">
                  <span key={roleIndex} className="animate-fade-in">{roles[roleIndex]}</span>
                </span>
              </h2>
            </div>
          </div>
          <div className="max-w-[1080px] mx-auto px-6 relative">
            <div className="absolute inset-y-0 left-6 right-6 overflow-hidden">
              <CurvedMarquee testimonials={testimonials} />
            </div>
            <div className="h-[280px]" />
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 border-t border-neutral-800">
          <div className="max-w-[1080px] mx-auto px-10 md:px-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Simple, transparent pricing</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                No hidden fees. No credit card required to start.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div className="p-6 rounded-xl border border-neutral-700 bg-neutral-800">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-foreground">Free</h3>
                  <p className="text-muted-foreground text-sm">Perfect for getting started</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Up to 20 bookings/month
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    1 service type
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Email notifications
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Basic availability settings
                  </li>
                </ul>
                <Link href="/login">
                  <Button variant="outline" className="w-full border-neutral-600 text-neutral-200 hover:bg-neutral-700">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="p-6 rounded-xl border-2 border-neutral-50 bg-neutral-800 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-50 text-neutral-900 text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-foreground">Pro</h3>
                  <p className="text-muted-foreground text-sm">For growing businesses</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">$12</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Unlimited bookings
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Unlimited services
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Google Calendar sync
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Reminder emails
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Custom accent colors
                  </li>
                  <li className="flex items-center gap-2 text-neutral-200">
                    <Check className="size-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
                <Link href="/login">
                  <Button className="w-full bg-neutral-50 hover:bg-neutral-200 text-neutral-900">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-neutral-800 bg-neutral-900">
          <div className="max-w-[1080px] mx-auto px-10 md:px-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Frequently asked questions</h2>
            </div>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">How does the free plan work?</h3>
                <p className="text-muted-foreground text-sm">
                  The free plan includes up to 20 bookings per month with one service type. No credit card required. You can upgrade anytime as your business grows.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">Can clients book without creating an account?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes! Clients can book directly from your booking page with just their name and email. They receive a link to manage their booking without needing to log in.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">How does Google Calendar sync work?</h3>
                <p className="text-muted-foreground text-sm">
                  Once connected, bookings automatically appear in your Google Calendar. If a time is blocked in your calendar, it won&apos;t show as available to clients.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">What&apos;s the difference between instant and request booking?</h3>
                <p className="text-muted-foreground text-sm">
                  Instant booking confirms appointments automatically. Request booking requires your approval first, giving you more control over who books with you.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">Can I cancel my subscription anytime?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, you can cancel anytime. Your account will remain active until the end of your billing period, and you can downgrade to the free plan.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-neutral-800 border border-neutral-700">
                <h3 className="font-semibold text-foreground mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground text-sm">
                  We offer a 14-day free trial on the Pro plan. If you&apos;re not satisfied within the first 30 days after your trial ends, contact us for a full refund.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-4 border-t border-neutral-800">
          <div className="max-w-[1080px] mx-auto px-10">
            <div className="relative overflow-hidden rounded-lg bg-neutral-800 py-16 px-8">
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, var(--neutral-600) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--neutral-600) 1px, transparent 1px)
                  `,
                  backgroundSize: '14px 14px'
                }}
              />
              <div className="text-center relative z-10">
                <h2 className="text-3xl font-bold mb-3 text-foreground tracking-tight">Ready to simplify your booking?</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Join independent providers who&apos;ve reclaimed their time.
                </p>
                <Link href="/login">
                  <Button size="lg" className="gap-2 bg-neutral-50 hover:bg-neutral-200 text-neutral-900">
                    Get started for free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 pt-12 pb-8 bg-background relative overflow-hidden">
        <div className="max-w-[1080px] mx-auto px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-xl font-semibold tracking-tight text-foreground">penciled.fyi</p>
              <p className="text-sm text-muted-foreground mt-1">Simple scheduling</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-3">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Get started</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-3">Company</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:hello@penciled.fyi" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-800 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} penciled.fyi. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
