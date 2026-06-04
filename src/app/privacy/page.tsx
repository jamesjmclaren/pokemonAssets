"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors mb-12"
          style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1
          className="text-3xl md:text-4xl mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 300, lineHeight: 1.2 }}
        >
          Privacy Policy
        </h1>
        <p className="text-text-muted text-sm mb-12" style={{ fontFamily: "Inter, sans-serif" }}>
          West Investments Ltd &ndash; Privacy Policy
        </p>

        <div className="space-y-10 text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          <p className="text-text-muted text-xs" style={{ letterSpacing: "0.05em" }}>
            Effective date: 1 January 2026<br />
            Controller: West Investments Ltd, a company incorporated in England and Wales under company number 10317202, with registered office at 70 Royston Avenue, London, E4 9DF (&ldquo;West Investments&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;).
          </p>

          <p>West Investments is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, store, and share personal data when you visit our website, contact us, or otherwise interact with us.</p>
          <p>This Privacy Policy should be read together with our <Link href="/terms" className="text-accent hover:underline">Website Terms of Use</Link> and Cookie Notice.</p>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>1. Important information</h2>
            <p>For the purposes of UK data protection law, including the UK GDPR and the Data Protection Act 2018, West Investments Ltd is the controller of your personal data.</p>
            <p className="mt-3">If you have any questions about this Privacy Policy or how we use your personal data, please contact us at:</p>
            <p className="mt-2 pl-4">
              Email: <a href="mailto:info@west.investments" className="text-accent hover:underline">info@west.investments</a><br />
              Postal address: 70 Royston Avenue, London, E4 9DF
            </p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>2. The personal data we collect</h2>
            <p>We may collect, use, store, and transfer the following categories of personal data:</p>
            <ul className="mt-3 space-y-3 pl-4">
              <li><strong>Identity Data:</strong> Such as your name, title, and company or organisation name.</li>
              <li><strong>Contact Data:</strong> Such as your email address, telephone number, postal address, and any contact details you provide when completing forms or corresponding with us.</li>
              <li><strong>Professional Data:</strong> Such as your job title, employer, business interests, investor classification details, and information you provide in a professional or business capacity.</li>
              <li><strong>Technical Data:</strong> Such as internet protocol (IP) address, browser type and version, device type, time zone setting, operating system, referral source, and website usage information.</li>
              <li><strong>Usage Data:</strong> Such as information about how you use our website, pages viewed, time spent on pages, and interactions with website features.</li>
              <li><strong>Communications Data:</strong> Such as the content of enquiries, messages, correspondence, and records of communications between you and West Investments.</li>
              <li><strong>Marketing and Preferences Data:</strong> Such as your preferences in receiving communications from us and your consent choices where applicable.</li>
            </ul>
            <p className="mt-3">We do not intentionally collect special category personal data through this website, and we ask that you do not send sensitive personal data unless specifically requested and lawful to do so.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>3. How we collect personal data</h2>
            <p>We may collect personal data:</p>
            <ul className="mt-3 space-y-2 pl-4 list-disc">
              <li>directly from you when you complete a contact form, email us, call us, or otherwise contact us;</li>
              <li>automatically when you use our website, through cookies and similar technologies;</li>
              <li>from publicly available sources, professional networks, or third parties where lawful and appropriate for business-related purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>4. How we use your personal data</h2>
            <p>We may use your personal data for the following purposes:</p>
            <ul className="mt-3 space-y-3 pl-4">
              <li><strong>To operate and maintain our website:</strong> Including website administration, security, troubleshooting, analytics, and performance monitoring.</li>
              <li><strong>To respond to enquiries:</strong> Including handling requests, responding to messages, and communicating with you about your enquiry.</li>
              <li><strong>To manage business relationships:</strong> Including maintaining records of communications, assessing whether a business relationship may be appropriate, and corresponding in a professional context.</li>
              <li><strong>To improve our website and services:</strong> Including understanding how visitors use the website and improving content, functionality, and user experience.</li>
              <li><strong>To send relevant communications:</strong> Including updates, business communications, or responses to requests, where lawful to do so.</li>
              <li><strong>To protect our legal rights and comply with legal obligations:</strong> Including enforcing our legal terms, complying with applicable law, responding to lawful requests, and protecting against misuse of the website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>5. Our lawful bases for processing</h2>
            <p>Depending on the circumstances, we rely on one or more of the following lawful bases:</p>
            <ul className="mt-3 space-y-3 pl-4">
              <li><strong>Legitimate interests:</strong> Where processing is necessary for our legitimate interests in operating, protecting, and improving our website, managing professional relationships, responding to enquiries, and administering our business, provided those interests are not overridden by your rights and interests.</li>
              <li><strong>Consent:</strong> Where you have given clear consent, for example in relation to non-essential cookies or where you request certain communications and consent is the appropriate lawful basis.</li>
              <li><strong>Contract:</strong> Where processing is necessary to take steps at your request before entering into a contract, or to perform a contract with you.</li>
              <li><strong>Legal obligation:</strong> Where processing is necessary for compliance with legal or regulatory obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>6. Marketing communications</h2>
            <p>We do not send unsolicited electronic marketing in breach of applicable law. Where required, we will seek your consent before sending marketing communications. You may opt out of marketing communications at any time by using the unsubscribe link in an email or by contacting us directly.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>7. Cookies and similar technologies</h2>
            <p>We may use cookies and similar technologies on our website for essential website functionality, security, performance, analytics, and user preference purposes.</p>
            <p className="mt-3">Further details are set out in our Cookie Notice, including how you can manage your preferences.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>8. Disclosure of your personal data</h2>
            <p>We may share your personal data with:</p>
            <ul className="mt-3 space-y-2 pl-4 list-disc">
              <li>website hosting providers and IT service providers;</li>
              <li>analytics, security, and website support providers;</li>
              <li>professional advisers, including lawyers, accountants, auditors, and insurers;</li>
              <li>regulators, law enforcement agencies, courts, or public authorities where required by law or to protect our legal rights;</li>
              <li>carefully selected service providers who process data on our behalf under appropriate contractual protections.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>9. International transfers</h2>
            <p>Where we use service providers located outside the UK, your personal data may be transferred outside the UK. Where this happens, we will take appropriate steps to ensure that your personal data is protected in accordance with applicable data protection law, including by using lawful transfer mechanisms where required.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>10. Data security</h2>
            <p>We have implemented appropriate technical and organisational measures designed to protect personal data from accidental loss, unauthorised access, disclosure, alteration, or destruction.</p>
            <p className="mt-3">However, no transmission of information over the internet can be guaranteed to be completely secure. You use the website and submit information at your own risk.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>11. Data retention</h2>
            <p>We retain personal data only for as long as reasonably necessary for the purposes for which it was collected, including for the purposes of satisfying legal, regulatory, tax, accounting, reporting, and record-keeping requirements.</p>
            <p className="mt-3">In general:</p>
            <ul className="mt-2 space-y-2 pl-4 list-disc">
              <li>enquiry and correspondence data may be retained for up to 24 months after our last substantive contact;</li>
              <li>technical and analytics data may be retained in accordance with our analytics and cookie settings;</li>
              <li>records required for legal, compliance, or dispute-resolution purposes may be retained for longer where necessary.</li>
            </ul>
            <p className="mt-3">Where retention periods are not fixed, we determine them by reference to the nature of the data, the purpose of processing, legal obligations, and the need to protect our legal interests.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>12. Your legal rights</h2>
            <p>Subject to applicable law, you may have the right to:</p>
            <ul className="mt-3 space-y-2 pl-4 list-disc">
              <li>request access to your personal data;</li>
              <li>request correction of inaccurate or incomplete personal data;</li>
              <li>request erasure of your personal data;</li>
              <li>request restriction of processing;</li>
              <li>object to processing carried out on the basis of legitimate interests;</li>
              <li>request transfer of your personal data to you or a third party, where applicable;</li>
              <li>withdraw consent at any time where we rely on consent.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please contact us using the details above.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>13. Complaints</h2>
            <p>If you have concerns about how we use your personal data, we would appreciate the opportunity to address them first.</p>
            <p className="mt-3">You also have the right to complain to the Information Commissioner&apos;s Office (&ldquo;ICO&rdquo;), the UK supervisory authority for data protection matters.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>14. Third-party links</h2>
            <p>This website may contain links to third-party websites, services, or content. We do not control those third-party websites and are not responsible for their privacy practices. You should review their privacy notices separately.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>15. Children</h2>
            <p>This website is not intended for children, and we do not knowingly collect personal data from children through the website.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>16. Changes to this Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.</p>
          </section>

          <section className="mt-12 pt-8 border-t border-border/20">
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>Contact form notice</h2>
            <p className="text-text-muted">By submitting this form, you acknowledge that West Investments Ltd may process your personal data to respond to your enquiry and manage ongoing communications in accordance with its Privacy Policy.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border/20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
