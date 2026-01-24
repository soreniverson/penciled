import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-semibold mb-8">Terms of Service</h1>
        <div className="prose prose-neutral max-w-none">
          <p className="text-muted-foreground">
            Last updated: January 2025
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using penciled.fyi (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground">
            penciled.fyi is a booking and scheduling platform that helps independent service providers manage their appointments. We provide tools for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Online appointment scheduling</li>
            <li>Calendar synchronization with Google Calendar</li>
            <li>Email notifications and reminders</li>
            <li>Client booking management</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">3. Account Registration</h2>
          <p className="text-muted-foreground mb-4">
            To use certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your account credentials secure and confidential</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">4. User Responsibilities</h2>
          <p className="text-muted-foreground mb-4">
            As a user of the Service, you agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Use the Service in compliance with all applicable laws and regulations</li>
            <li>Honor appointments made through the platform</li>
            <li>Communicate professionally with clients and other users</li>
            <li>Not use the Service for any illegal or unauthorized purpose</li>
            <li>Not interfere with or disrupt the Service or servers</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">5. Prohibited Uses</h2>
          <p className="text-muted-foreground mb-4">
            You may not use the Service to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Violate any laws, regulations, or third-party rights</li>
            <li>Send spam, unsolicited communications, or promotional material</li>
            <li>Impersonate another person or entity</li>
            <li>Collect or harvest user data without consent</li>
            <li>Transmit viruses, malware, or other harmful code</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Engage in any activity that interferes with other users&apos; experience</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">6. Service Availability</h2>
          <p className="text-muted-foreground">
            We strive to maintain high availability but cannot guarantee uninterrupted service. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">7. Intellectual Property</h2>
          <p className="text-muted-foreground">
            The Service and its original content, features, and functionality are owned by penciled.fyi and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service without express written permission.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">8. User Content</h2>
          <p className="text-muted-foreground">
            You retain ownership of content you submit to the Service. By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and display that content solely for the purpose of providing the Service. You are responsible for ensuring you have the right to submit any content you provide.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">9. Third-Party Services</h2>
          <p className="text-muted-foreground">
            The Service may integrate with third-party services (such as Google Calendar). Your use of these integrations is subject to the respective third party&apos;s terms of service. We are not responsible for the availability, accuracy, or content of third-party services.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">10. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">11. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PENCILED.FYI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">12. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify and hold harmless penciled.fyi and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of another party.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">13. Termination</h2>
          <p className="text-muted-foreground mb-4">
            We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Violation of these Terms</li>
            <li>Conduct that we believe is harmful to other users or the Service</li>
            <li>Upon your request to delete your account</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Upon termination, your right to use the Service will immediately cease. You may request deletion of your data in accordance with our Privacy Policy.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">14. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page with a new &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">15. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of the United States.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">16. Dispute Resolution</h2>
          <p className="text-muted-foreground">
            Before filing a legal claim, you agree to attempt to resolve any dispute informally by contacting us. If a dispute cannot be resolved informally, you agree that any legal action shall be filed in the courts located in the United States, and you consent to the personal jurisdiction of such courts.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">17. Severability</h2>
          <p className="text-muted-foreground">
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">18. Entire Agreement</h2>
          <p className="text-muted-foreground">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and penciled.fyi regarding your use of the Service and supersede any prior agreements.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">19. Contact</h2>
          <p className="text-muted-foreground">
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@penciled.fyi" className="underline">
              legal@penciled.fyi
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
