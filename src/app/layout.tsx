import type { Metadata } from "next"
import { Instrument_Sans } from "next/font/google"
import "./globals.css"

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "penciled.fyi - Simple team calendar management",
    template: "%s | penciled.fyi",
  },
  description:
    "A beautifully designed booking tool where providers set their availability, clients book appointments, and everyone gets notified. Simpler than Acuity, warmer than Calendly.",
  keywords: [
    "booking",
    "scheduling",
    "appointments",
    "calendar",
    "service providers",
    "tutors",
    "consultants",
    "freelancers",
  ],
  authors: [{ name: "penciled.fyi" }],
  creator: "penciled.fyi",
  openGraph: {
    title: "penciled.fyi - Simple team calendar management",
    description:
      "A beautifully designed booking tool where providers set their availability, clients book appointments, and everyone gets notified.",
    url: "/",
    siteName: "penciled.fyi",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "penciled.fyi - Simple Booking for Independent Providers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "penciled.fyi - Simple team calendar management",
    description:
      "A beautifully designed booking tool where providers set their availability, clients book appointments, and everyone gets notified.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when ready
    // google: "your-google-verification-code",
  },
}

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${APP_URL}/#webapp`,
      name: "penciled.fyi",
      url: APP_URL,
      description: "A beautifully designed booking tool where providers set their availability, clients book appointments, and everyone gets notified.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Online appointment scheduling",
        "Calendar integration",
        "Email notifications",
        "Client self-booking",
        "Customizable availability",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${APP_URL}/#organization`,
      name: "penciled.fyi",
      url: APP_URL,
      logo: `${APP_URL}/logo.png`,
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: APP_URL,
      name: "penciled.fyi",
      publisher: {
        "@id": `${APP_URL}/#organization`,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${APP_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "How does the free plan work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The free plan includes up to 20 bookings per month with one service type. No credit card required. You can upgrade anytime as your business grows."
          }
        },
        {
          "@type": "Question",
          name: "Can clients book without creating an account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Clients can book directly from your booking page with just their name and email. They receive a link to manage their booking without needing to log in."
          }
        },
        {
          "@type": "Question",
          name: "How does Google Calendar sync work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Once connected, bookings automatically appear in your Google Calendar. If a time is blocked in your calendar, it won't show as available to clients."
          }
        },
        {
          "@type": "Question",
          name: "What's the difference between instant and request booking?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Instant booking confirms appointments automatically. Request booking requires your approval first, giving you more control over who books with you."
          }
        },
        {
          "@type": "Question",
          name: "Can I cancel my subscription anytime?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, you can cancel anytime. Your account will remain active until the end of your billing period, and you can downgrade to the free plan."
          }
        },
        {
          "@type": "Question",
          name: "Do you offer refunds?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We offer a 14-day free trial on the Pro plan. If you're not satisfied within the first 30 days after your trial ends, contact us for a full refund."
          }
        }
      ]
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          defer
          data-domain="penciled.fyi"
          src="https://plausible.io/js/script.js"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${instrumentSans.variable} antialiased dark`}
      >
        {children}
      </body>
    </html>
  )
}
