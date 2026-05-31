import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SECTIONS = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `PitchIQ is an AI-powered sales training platform that lets users practice sales conversations, receive coaching, and improve their communication skills.

This Privacy Policy explains how PitchIQ collects, uses, stores, shares, and protects personal information when you use our website, platform, voice roleplays, coaching tools, and related services.

We do not sell your personal information. We do not sell your call recordings. We do not use your recordings for advertising. We use personal information only to provide PitchIQ, improve the product, keep the service secure, communicate with you, and comply with legal obligations.`
  },
  {
    id: 'what-we-collect',
    title: '2. Personal Information We Collect',
    content: `We may collect the following categories of personal information:

**Account information** — Name, email address, password or authentication information, organization name, role, account settings, subscription status, and communication preferences.

**Usage information** — Pages viewed, features used, session duration, roleplay activity, device information, browser type, IP address, error logs, and diagnostic information.

**Sales training information** — Information about what you sell, who you sell to, your goals, target customers, sales process, and roleplay preferences.

**Call, voice, transcript, and coaching data** — When you participate in voice-based roleplays or coaching sessions, PitchIQ processes your voice, audio input, transcripts, AI-generated responses, scoring data, coaching feedback, and related session analytics.

**Payment information** — If you purchase a subscription, payments are processed by a third-party payment provider. PitchIQ does not store full credit card numbers.

**Support communications** — If you contact us, we may collect your message, email address, support request, screenshots, attachments, or troubleshooting details.`
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Personal Information',
    content: `We use personal information to:

- Provide, operate, and maintain PitchIQ
- Create and manage user accounts
- Run AI roleplays and coaching sessions
- Generate feedback, scores, analytics, and recommendations
- Personalize practice experiences
- Improve the reliability, safety, quality, and usability of PitchIQ
- Debug technical issues and respond to support requests
- Process payments and manage subscriptions
- Send service-related messages and marketing communications where permitted
- Prevent fraud, misuse, abuse, or security incidents
- Comply with legal obligations

We will not use call recordings or transcripts for unrelated purposes without appropriate notice and consent.`
  },
  {
    id: 'call-recording',
    title: '4. Call Recording and Transcripts',
    content: `PitchIQ offers voice-based roleplays and coaching sessions. These sessions involve audio processing, transcription, AI-generated responses, and performance analysis. There are two distinct ways we handle your voice data:

**Real-time processing — required for the service to function**

To provide voice-based features, PitchIQ must process your audio and generate transcripts during a session. This real-time processing is necessary for the service to work. It includes speech-to-text conversion, AI response generation, sentiment analysis, and real-time coaching feedback. This processing happens in the moment and is not optional — you cannot use voice roleplays without it.

**Optional stored recordings — for product improvement only**

Separately, with your explicit consent, PitchIQ may store call recordings, transcripts, or related session data to improve the application, evaluate product quality, debug issues, improve coaching accuracy, and develop better roleplay experiences. This is entirely optional and never required to use the service.

You can control this setting in your account. If you opt out, PitchIQ will not store recordings or transcripts from future sessions for product improvement. Real-time processing will still occur during active sessions because it is necessary to provide the service.

**What we do not do**

- We do not sell call recordings, transcripts, or coaching data to advertisers, data brokers, or other third parties.
- We do not use call recordings for advertising, third-party resale, or unrelated profiling.
- We may use service providers to process audio, transcripts, AI responses, storage, analytics, or infrastructure. We require service providers to process personal information only for authorized purposes and under appropriate contractual protections.`
  },
  {
    id: 'consent',
    title: '5. Consent and Your Choices',
    content: `By using PitchIQ, you consent to the collection, use, and disclosure of your personal information as described in this Privacy Policy.

Where required, we will ask for separate consent for optional uses, including stored call recordings or certain analytics and marketing technologies.

You may withdraw consent where legally permitted. If you withdraw consent for information that is necessary to provide the service, some features may no longer work.

You may control certain settings in your account, including recording preferences, communication preferences, and other privacy-related options.`
  },
  {
    id: 'cookies',
    title: '6. Cookies and Tracking Technologies',
    content: `PitchIQ may use cookies, pixels, local storage, and similar technologies to keep you signed in, remember preferences, secure the service, understand product usage, improve performance, and measure marketing effectiveness where permitted.

Some cookies are necessary for the service to function. Other cookies, such as analytics or advertising cookies, may require consent depending on your location. You can control cookies through your browser settings and, where available, through PitchIQ's cookie settings.`
  },
  {
    id: 'sharing',
    title: '7. How We Share Personal Information',
    content: `We may share personal information with the following categories of recipients:

**Service providers** — Hosting providers, database providers, AI model providers, speech-to-text or text-to-speech providers, payment processors, analytics providers, email providers, and customer support tools.

**Business customers** — If your account is provided through an employer, school, team, or organization, certain account activity, progress, usage data, scores, or training results may be visible to that organization depending on the plan and settings.

**Legal and safety reasons** — We may disclose information if required by law, court order, legal process, or government request, or if we believe disclosure is necessary to protect PitchIQ, users, or others from fraud, abuse, security threats, or harm.

**Business transfers** — If PitchIQ is involved in a merger, acquisition, financing, reorganization, or sale of assets, personal information may be transferred as part of that transaction, subject to appropriate protections.

We do not sell personal information.`
  },
  {
    id: 'international',
    title: '8. International Data Transfers',
    content: `PitchIQ may process and store personal information in Canada, the United States, or other countries where our service providers operate. When personal information is transferred outside your province, territory, state, or country, it may be subject to the laws of that jurisdiction. We use contractual, technical, and organizational safeguards designed to protect personal information when it is transferred.`
  },
  {
    id: 'retention',
    title: '9. Retention',
    content: `We keep personal information only as long as reasonably necessary for the purposes described in this Privacy Policy, unless a longer period is required or permitted by law.

| Data Type | Retention Period |
|---|---|
| Account information | While your account is active, then deleted or anonymized within 30 days after account deletion unless legally required |
| Raw call recordings | Up to 90 days |
| Transcripts and coaching/session data | Up to 180 days |
| Billing and payment records | As required for tax, accounting, and legal purposes |
| Security logs | Up to 12 months |
| Aggregated or de-identified analytics | May be retained indefinitely |
| Support records | As long as needed to resolve issues and maintain business records |`
  },
  {
    id: 'security',
    title: '10. Security',
    content: `We use reasonable administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, loss, misuse, disclosure, alteration, or destruction.

These safeguards may include access controls, encryption, secure authentication, logging, vendor reviews, employee or contractor confidentiality obligations, and security monitoring. No system is perfectly secure. If we discover a privacy breach that creates a real risk of significant harm, we will notify affected individuals and regulators where required by law.`
  },
  {
    id: 'rights',
    title: '11. Your Privacy Rights',
    content: `Depending on where you live, you may have rights to:

- Access personal information we hold about you
- Correct inaccurate information
- Delete certain personal information
- Withdraw consent
- Object to or restrict certain processing
- Request a copy of your information
- Ask how your information has been used or disclosed
- File a complaint with a privacy regulator

To exercise your rights, contact us at privacy@pitchiq.ca. We may need to verify your identity before responding. We will respond within the time required by applicable law.`
  },
  {
    id: 'canada',
    title: '12. Canadian Users',
    content: `For Canadian users, PitchIQ aims to comply with applicable Canadian private-sector privacy laws, including PIPEDA and applicable provincial privacy laws. You may contact us to request access to or correction of your personal information, ask questions about our privacy practices, withdraw consent where applicable, or make a privacy complaint. If you are not satisfied with our response, you may contact the Office of the Privacy Commissioner of Canada or the applicable provincial privacy regulator.`
  },
  {
    id: 'quebec',
    title: '13. Quebec Users',
    content: `If you are located in Quebec, you may have additional rights under Quebec privacy law. PitchIQ will provide information about the purposes for collecting personal information, the means of collection, your rights of access and correction, your right to withdraw consent, categories of third parties who may receive personal information, whether personal information may be communicated outside Quebec, and the retention period where required.`
  },
  {
    id: 'europe',
    title: '14. European Users',
    content: `If GDPR applies to your use of PitchIQ, we process personal information under one or more of the following legal bases: your consent, performance of a contract, legitimate interests such as improving and securing the service, or compliance with legal obligations. Where we rely on consent, you may withdraw it at any time. European users may have rights to access, correction, deletion, restriction, objection, portability, and complaint to a supervisory authority.`
  },
  {
    id: 'california',
    title: '15. California Users',
    content: `PitchIQ does not sell personal information. If the California Consumer Privacy Act applies, California residents may have rights to know, delete, correct, opt out of sale or sharing, limit certain uses of sensitive personal information, and not be discriminated against for exercising privacy rights. To exercise these rights, contact privacy@pitchiq.ca.`
  },
  {
    id: 'marketing',
    title: '16. Marketing Communications',
    content: `We may send marketing emails or other commercial electronic messages where permitted by law. You can unsubscribe from marketing messages at any time by using the unsubscribe link in the message or contacting us. You may still receive service-related messages, such as account, billing, security, or legal notices.`
  },
  {
    id: 'children',
    title: '17. Children',
    content: `PitchIQ is not intended for children under 16. We do not knowingly collect personal information from children under 16 without appropriate consent. If you believe a child has provided personal information to PitchIQ, contact us at privacy@pitchiq.ca.`
  },
  {
    id: 'aggregated',
    title: '18. De-identified and Aggregated Information',
    content: `We may create aggregated or de-identified information from personal information. We may use this information to understand usage trends, improve PitchIQ, develop new features, and measure product performance. We will not attempt to re-identify de-identified information except where permitted by law for security, testing, or compliance purposes.`
  },
  {
    id: 'changes',
    title: '19. Changes to This Privacy Policy',
    content: `We may update this Privacy Policy from time to time. If we make material changes, we will provide notice through the website, application, email, or another appropriate method. If a change requires consent, we will request consent before the change applies.`
  },
  {
    id: 'contact',
    title: '20. Contact Us',
    content: `For privacy questions, requests, or complaints, contact:`
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream bg-noise">
      {/* Nav */}
      <nav className="w-full border-b border-cream-deep/60 bg-cream/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-8 h-8 object-contain" />
            <span className="font-display text-xl font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-[#5A5A5A] hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[800px] mx-auto px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-4">
            Legal
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-[1.1] mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#5A5A5A]">
            Last Updated: May 30, 2026
          </p>
        </motion.div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-[800px] mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-2xl border border-cream-deep p-6 sm:p-8 shadow-sm"
        >
          <h2 className="font-display text-lg font-bold text-[#1A1A1A] mb-4">Contents</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-[#5A5A5A] hover:text-brand-orange transition-colors py-1"
              >
                {section.title}
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Sections */}
      <div className="max-w-[800px] mx-auto px-6 pb-24 space-y-8">
        {SECTIONS.map((section, i) => (
          <motion.section
            key={section.id}
            id={section.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl border border-cream-deep p-6 sm:p-8 shadow-sm scroll-mt-24"
          >
            <h2 className="font-display text-xl font-bold text-[#1A1A1A] mb-4">
              {section.title}
            </h2>
            <div className="prose prose-sm max-w-none text-[#5A5A5A] leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {section.content}
              </ReactMarkdown>
            </div>
            {section.id === 'contact' && (
              <div className="mt-4 bg-cream rounded-xl p-5 border border-cream-deep">
                <p className="text-[#1A1A1A] font-medium mb-1">PitchIQ Privacy Contact</p>
                <a
                  href="mailto:privacy@pitchiq.ca"
                  className="inline-flex items-center gap-2 text-brand-orange hover:text-brand-amber transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  privacy@pitchiq.ca
                </a>
                <p className="text-[#5A5A5A] text-sm mt-1">https://pitchiq.ca</p>
              </div>
            )}
          </motion.section>
        ))}

        {/* Footer nav */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-cream-deep"
        >
          <p className="text-sm text-[#8A8A8A]">
            Questions? Reach us at{' '}
            <a href="mailto:privacy@pitchiq.ca" className="text-brand-orange hover:text-brand-amber transition-colors">
              privacy@pitchiq.ca
            </a>
          </p>
          <Link
            to="/terms"
            className="text-sm text-brand-orange hover:text-brand-amber transition-colors font-medium"
          >
            Terms of Service →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
