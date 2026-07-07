export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = { title: "Terms of Service — Plutus" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <Shield size={18} className="text-gold" />
          <Link href="/" className="text-sm font-bold text-white">Plutus</Link>
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: May 2026</p>

        <Section title="1. Service Description">
          <p>Plutus is an educational platform providing structured tools, guidance, and resources to help individuals understand and improve their credit health. All content is provided for informational and educational purposes only.</p>
          <p>Plutus is not a law firm, credit repair organization, financial institution, or licensed financial advisor. Nothing provided through the platform constitutes legal advice, financial advice, or professional credit counseling.</p>
        </Section>

        <Section title="2. Educational Use Only">
          <p>All dispute letters, templates, recommendations, and AI-generated content are educational examples only. You are solely responsible for any documents you submit to credit bureaus, creditors, or other third parties.</p>
          <p>We strongly recommend consulting a licensed attorney or financial advisor before taking action based on information provided by this platform.</p>
        </Section>

        <Section title="3. No Guarantee of Results">
          <p>Plutus makes no representations or guarantees regarding outcomes of any credit repair, dispute, or negotiation activities. Credit scores and credit report changes depend on many factors outside our control, including the responses of credit bureaus, creditors, and individual financial history.</p>
          <p>Past results described in educational content are illustrative only and not indicative of future results.</p>
        </Section>

        <Section title="4. Account Responsibilities">
          <p>You are responsible for maintaining the security of your account credentials. You agree to provide accurate information and to notify us of any unauthorized use of your account. You must be at least 18 years of age to use this service.</p>
        </Section>

        <Section title="5. Subscription and Billing">
          <p>Paid subscription tiers are billed monthly or annually as selected at checkout. Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time through your account settings. Refunds are not provided for partial billing periods except where required by applicable law.</p>
          <p>Billing is processed by Stripe. Plutus does not store payment card information.</p>
        </Section>

        <Section title="6. Data and Privacy">
          <p>Credit report documents you upload are used solely to provide the services you request. We do not sell, rent, or share your personal financial information with third parties for marketing purposes. See our <Link href="/privacy" className="text-gold hover:underline">Privacy Policy</Link> for complete details.</p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>To the maximum extent permitted by law, Plutus&apos;s total liability for any claim arising from or related to the service is limited to the amount you paid for the service in the 30 days preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </Section>

        <Section title="8. Changes to Terms">
          <p>We may update these terms from time to time. Continued use of the service after changes are posted constitutes acceptance of the updated terms. Material changes will be communicated via email or platform notification.</p>
        </Section>

        <div className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-600">
          Questions? Contact us at{" "}
          <a href="mailto:guilded@jesseboudreau.com" className="text-gold hover:underline">guilded@jesseboudreau.com</a>
          {" · "}
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          {" · "}
          <Link href="/ai-disclaimer" className="hover:text-slate-400">AI Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
