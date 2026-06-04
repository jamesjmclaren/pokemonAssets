"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="text-text-muted text-sm mb-12" style={{ fontFamily: "Inter, sans-serif" }}>
          West Investments Ltd &ndash; Website Terms of Use and Regulatory Notice
        </p>

        <div className="space-y-10 text-text-secondary text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          <p className="text-text-muted text-xs" style={{ letterSpacing: "0.05em" }}>
            Effective date: 1 January 2026<br />
            Operator: West Investments Ltd, a company incorporated in England and Wales under company number 10317202, with registered office at Companies House (&ldquo;West Investments&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;).
          </p>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>1. About this website</h2>
            <p>This website is provided for general information purposes only in relation to West Investments and its activities, areas of interest, and market commentary concerning collectible assets, including but not limited to trading card games, comics, books, and memorabilia.</p>
            <p className="mt-3">The content on this website is intended solely to provide background information about our business and the sectors in which we operate. It is not directed at the general public for the purpose of inviting or inducing any person to engage in investment activity.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>2. No offer, no solicitation</h2>
            <p>Nothing on this website constitutes, or is intended to constitute:</p>
            <ol className="list-none mt-3 space-y-2 pl-4">
              <li>(a) an offer to sell or issue any security, unit, participation, interest, or financial instrument;</li>
              <li>(b) an invitation, solicitation, recommendation, or inducement to engage in investment activity;</li>
              <li>(c) financial promotion for the purposes of section 21 of the Financial Services and Markets Act 2000 (&ldquo;FSMA&rdquo;);</li>
              <li>(d) investment advice, legal advice, tax advice, accounting advice, or a personal recommendation; or</li>
              <li>(e) an offer to participate in any collective investment scheme, alternative investment fund, pooled vehicle, managed account, or similar arrangement.</li>
            </ol>
            <p className="mt-3">Any investment opportunity, if made available at all, would be made only by means of separate, private, confidential documentation and only to persons to whom such material may lawfully be communicated.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>3. Investor and jurisdiction restrictions</h2>
            <p>This website is not intended for, and must not be relied upon by, any person in any jurisdiction where access to or use of the website, or receipt of its contents, would be contrary to applicable law or regulation.</p>
            <p className="mt-3">West Investments does not represent that any content on this website is appropriate for use in all jurisdictions. Persons who access this website do so on their own initiative and are responsible for compliance with all applicable local laws and regulations.</p>
            <p className="mt-3">Without limitation, this website is not directed at retail investors where doing so would contravene applicable financial promotion or distribution restrictions.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>4. Professional use only</h2>
            <p>Unless expressly stated otherwise in separate written materials, this website is intended only for persons acting in a professional, business, or investment capacity. It is not intended to form the basis of any decision by a retail investor.</p>
            <p className="mt-3">If you are not a professional adviser, professional client, eligible counterparty, institutional investor, or other person who may lawfully receive this type of information, you should not act on or rely on any content on this website.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>5. No regulated advice or arranging activity through the website</h2>
            <p>West Investments does not provide regulated investment advice, personal recommendations, or arranging services through this website.</p>
            <p className="mt-3">No information on this website should be interpreted as advice on the merits of buying, selling, subscribing for, or holding any investment, nor as an invitation to enter into any transaction. Any engagement with West Investments is subject to separate review, eligibility checks, legal documentation, and applicable law.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>6. Alternative assets and collectible assets</h2>
            <p>Collectible assets are specialist assets. Their value may rise or fall, they may be illiquid, pricing may be subjective, and past performance is not a reliable indicator of future results.</p>
            <p className="mt-3">Statements made on this website regarding collectible assets, market trends, rarity, provenance, condition, historic demand, or potential appreciation are general observations only and must not be relied upon as forecasts, valuations, or guarantees of performance.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>7. Illustrative information only</h2>
            <p>Any portfolio examples, case studies, figures, valuations, prices, returns, timeframes, or market references shown on this website are provided for illustrative purposes only unless expressly stated otherwise.</p>
            <p className="mt-3">Such examples may be based on assumptions, estimates, opinions, or historic information and do not represent actual product prices, recent sale values, realised returns, or the performance of any actual investment or portfolio.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>8. No reliance</h2>
            <p>While we aim to ensure that the information on this website is accurate and up to date, we make no representation, warranty, or undertaking, express or implied, as to the accuracy, completeness, currency, or fitness for purpose of any content on this website.</p>
            <p className="mt-3">The content is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. You should not rely on this website as the sole basis for any investment, commercial, legal, tax, or other decision.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>9. Third-party information</h2>
            <p>This website may contain references to third-party data, auction results, market sources, grading standards, specialist marketplaces, or external websites. Such information is provided for convenience only.</p>
            <p className="mt-3">West Investments does not accept responsibility for the content, accuracy, or availability of third-party materials and does not endorse any third party unless expressly stated.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>10. Confidential and restricted materials</h2>
            <p>Any confidential materials, investor communications, presentations, decks, or private information memoranda made available by West Investments are subject to separate confidentiality obligations, access restrictions, and legal notices.</p>
            <p className="mt-3">Access to any such materials may be withdrawn at any time and may be subject to eligibility verification, investor classification, and regulatory restrictions.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>11. Intellectual property</h2>
            <p>All content on this website, including text, branding, graphics, logos, design, photographs, layouts, and underlying materials, is owned by or licensed to West Investments unless otherwise stated.</p>
            <p className="mt-3">You may view this website for lawful personal or internal business use only. You may not reproduce, distribute, modify, republish, transmit, store, or exploit any content without our prior written consent.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>12. Prohibited use</h2>
            <p>You must not:</p>
            <ol className="list-none mt-3 space-y-2 pl-4">
              <li>(a) use this website in any way that breaches applicable law or regulation;</li>
              <li>(b) use this website to market, distribute, or circulate our content in a manner that could constitute an unlawful financial promotion;</li>
              <li>(c) attempt to gain unauthorised access to the website or related systems;</li>
              <li>(d) copy, scrape, or harvest content or data from the website without permission; or</li>
              <li>(e) misrepresent your identity, investor status, or eligibility when communicating with us.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>13. Limitation of liability</h2>
            <p>To the fullest extent permitted by law, West Investments excludes all liability for any direct, indirect, incidental, consequential, special, or punitive loss or damage arising out of or in connection with:</p>
            <ol className="list-none mt-3 space-y-2 pl-4">
              <li>(a) access to, use of, or inability to use this website;</li>
              <li>(b) reliance on any information contained on this website;</li>
              <li>(c) any errors, omissions, interruptions, delays, viruses, or technical failures; or</li>
              <li>(d) any decision made or action taken based on the website content.</li>
            </ol>
            <p className="mt-3">Nothing in these Terms excludes liability that cannot lawfully be excluded under English law.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>14. Privacy and data protection</h2>
            <p>Use of this website is also subject to our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> and Cookie Notice, which explain how we collect, use, and process personal data.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>15. Amendments</h2>
            <p>We may amend these Terms at any time without notice. The latest version will be posted on this website and will take effect from the stated effective date.</p>
          </section>

          <section>
            <h2 className="text-lg mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>16. Governing law and jurisdiction</h2>
            <p>These Terms and any dispute or claim arising out of or in connection with them or their subject matter shall be governed by and construed in accordance with the laws of England and Wales.</p>
            <p className="mt-3">The courts of England and Wales shall have exclusive jurisdiction, unless applicable law requires otherwise.</p>
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
