import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = { title: "Privacy Policy — Guilded" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2.5 mb-8">
          <Shield size={18} className="text-gold" />
          <Link href="/" className="text-sm font-bold text-white">Guilded</Link>
        </div>

        <h1 className="text-2xl font-semibold text-slate-100">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: May 2026</p>

        <Section title="1. Information We Collect">
          <p><strong className="text-slate-300">Account information:</strong> Name, email address, and hashed password when you register.</p>
          <p><strong className="text-slate-300">Credit report data:</strong> The text content of PDF credit reports you upload for analysis. We extract account information to provide our services. We do not retain the raw PDF after processing.</p>
          <p><strong className="text-slate-300">Usage data:</strong> AI interactions, academy progress, audit history, and XP activity. This data powers your personalized recovery experience.</p>
          <p><strong className="text-slate-300">Payment information:</strong> Billing is handled by Stripe. We receive transaction confirmations but never store payment card details.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use your information to: provide and improve the Guilded service, personalize your recovery experience, process billing transactions, communicate service updates, and troubleshoot technical issues.</p>
          <p>We do not sell your personal information. We do not share your credit data or financial information with advertisers or third-party marketers.</p>
        </Section>

        <Section title="3. Credit Report Data">
          <p>Credit report PDFs you upload are processed to extract account data. Extracted account data is stored in our database to power your audit history and recommendations. Raw PDF files are deleted after text extraction is complete.</p>
          <p>This data is accessible only to you and authorized Guilded personnel for technical support purposes.</p>
        </Section>

        <Section title="4. AI and Third-Party Services">
          <p>AI responses are generated using OpenAI's API. Your prompts and our responses are transmitted to OpenAI for processing. Review OpenAI's privacy policy at openai.com/privacy for how they handle this data.</p>
          <p>We use Stripe for payment processing and NextAuth for authentication session management.</p>
        </Section>

        <Section title="5. Data Security">
          <p>We use industry-standard security measures including encrypted data transmission (TLS), hashed passwords (Argon2), and access controls. However, no internet transmission is completely secure, and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>Account data is retained while your account is active. You may request deletion of your account and associated data by contacting support. Some data may be retained as required by law or for legitimate business purposes (e.g., billing records).</p>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to access, correct, or delete your personal information. Contact us at <a href="mailto:support@guilded.finance" className="text-gold hover:underline">support@guilded.finance</a> to exercise these rights. Residents of certain states (California, Virginia, etc.) may have additional rights under applicable privacy law.</p>
        </Section>

        <Section title="8. Contact">
          <p>Privacy questions or requests: <a href="mailto:support@guilded.finance" className="text-gold hover:underline">support@guilded.finance</a></p>
        </Section>

        <div className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-600">
          <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
          {" · "}
          <Link href="/ai-disclaimer" className="hover:text-slate-400">AI Disclaimer</Link>
        </div>
      </div>
    </div>
  );
}
