import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using PitchIQ's website, platform, voice roleplays, coaching tools, and related services (collectively, "PitchIQ" or the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, you may not access or use the Service.

These Terms apply to all visitors, users, and others who access or use the Service. By using PitchIQ, you represent and warrant that you are at least 16 years of age and have the legal capacity to enter into these Terms.`
  },
  {
    id: 'changes',
    title: '2. Changes to Terms',
    content: `We may modify these Terms at any time. If we make material changes, we will provide notice through the Service, by email, or by other means. Your continued use of PitchIQ after changes become effective constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service.`
  },
  {
    id: 'accounts',
    title: '3. Accounts and Registration',
    content: `To access certain features of PitchIQ, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.

You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.

We reserve the right to suspend or terminate your account if any information provided during registration or thereafter proves to be inaccurate, false, or misleading.`
  },
  {
    id: 'subscription',
    title: '4. Subscriptions and Payments',
    content: `PitchIQ may offer free and paid subscription plans. By selecting a paid plan, you agree to pay all applicable fees as described on our pricing page.

**Billing.** Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your selection). You authorize us to charge your selected payment method for all applicable fees.

**Renewal and Cancellation.** Subscriptions automatically renew unless you cancel before the renewal date. You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. No refunds will be provided for partial months.

**Price Changes.** We may change subscription fees at any time. We will provide reasonable notice of any price changes before they take effect.

**Free Trials.** If you sign up for a free trial, you will not be charged during the trial period. At the end of the trial, your subscription will automatically convert to a paid plan unless you cancel before the trial ends.`
  },
  {
    id: 'use-of-service',
    title: '5. Use of the Service',
    content: `PitchIQ grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or internal business purposes, subject to these Terms.

You agree not to:

- Use the Service for any illegal purpose or in violation of any local, state, national, or international law
- Violate or infringe other people's intellectual property, privacy, publicity, or other legal rights
- Reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code of the Service
- Interfere with or disrupt the Service or servers or networks connected to the Service
- Use any robot, spider, scraper, or other automated means to access the Service
- Circumvent any security measure or access control on the Service
- Upload or transmit viruses, malware, or other harmful code
- Impersonate any person or entity, or misrepresent your affiliation with any person or entity
- Use the Service to generate, store, or distribute content that is defamatory, obscene, abusive, or otherwise objectionable`
  },
  {
    id: 'voice-data',
    title: '6. Voice Data and Roleplay Sessions',
    content: `PitchIQ's core functionality involves voice-based roleplays and coaching sessions. By using these features, you acknowledge and agree to the following:

**Real-time processing is required.** To provide voice-based roleplays, PitchIQ must process your audio input and generate transcripts in real time during active sessions. This processing is necessary for the Service to function and is not optional.

**Optional storage.** With your explicit consent, PitchIQ may store call recordings, transcripts, and related session data to improve the product, debug issues, and develop better coaching experiences. You can control this setting in your account. If you opt out, PitchIQ will not store recordings or transcripts from future sessions for product improvement, though real-time processing will still occur during active sessions.

**Your content.** You retain ownership of any content you provide during roleplay sessions. By using the Service, you grant PitchIQ a limited license to use that content solely to provide, improve, and secure the Service.

**Accuracy.** PitchIQ's AI-generated feedback, scores, transcripts, and coaching recommendations are provided for training and educational purposes. They do not constitute professional legal, financial, or medical advice. We do not guarantee the accuracy or completeness of AI-generated outputs.`
  },
  {
    id: 'intellectual-property',
    title: '7. Intellectual Property',
    content: `PitchIQ and its licensors own all right, title, and interest in and to the Service, including all software, code, designs, text, graphics, logos, trademarks, and other content (excluding User Content). These are protected by copyright, trademark, and other intellectual property laws.

You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent. The PitchIQ name, logo, and related marks are trademarks of PitchIQ and may not be used without permission.`
  },
  {
    id: 'user-content',
    title: '8. User Content',
    content: `"User Content" means any information, text, audio, data, or other materials that you upload, transmit, or otherwise make available through the Service.

You retain ownership of your User Content. You grant PitchIQ a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display your User Content solely for the purposes of operating, providing, improving, and securing the Service.

You represent and warrant that you have all necessary rights to your User Content and that it does not violate any third-party rights or applicable laws. We reserve the right to remove any User Content that violates these Terms or that we find objectionable.`
  },
  {
    id: 'termination',
    title: '9. Termination',
    content: `We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice, effective immediately.

You may terminate your account at any time by contacting us or using the account deletion feature in your settings.

Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`
  },
  {
    id: 'disclaimers',
    title: '10. Disclaimers',
    content: `The Service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.

PitchIQ does not warrant that:

- The Service will function uninterrupted, secure, or available at any particular time or location
- Any errors or defects will be corrected
- The Service is free of viruses or other harmful components
- The results of using the Service will meet your requirements

AI-generated feedback, scores, transcripts, and coaching recommendations are provided for training purposes only and do not replace professional advice.`
  },
  {
    id: 'limitation',
    title: '11. Limitation of Liability',
    content: `To the maximum extent permitted by applicable law, PitchIQ and its directors, employees, partners, agents, suppliers, or affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, use, goodwill, or other intangible losses, resulting from:

- Your access to or use of or inability to access or use the Service
- Any conduct or content of any third party on the Service
- Any content obtained from the Service
- Unauthorized access, use, or alteration of your transmissions or content

In no event shall PitchIQ's total liability exceed the amount you paid to PitchIQ in the twelve months preceding the claim, or one hundred Canadian dollars (CAD $100), whichever is greater.`
  },
  {
    id: 'indemnification',
    title: '12. Indemnification',
    content: `You agree to defend, indemnify, and hold harmless PitchIQ and its licensors and service providers, and their respective officers, directors, employees, contractors, agents, licensors, and suppliers, from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of the Service.`
  },
  {
    id: 'governing-law',
    title: '13. Governing Law',
    content: `These Terms and your use of the Service shall be governed by and construed in accordance with the laws of the Province of Alberta and the federal laws of Canada applicable therein, without regard to its conflict of law provisions.

Any legal action or proceeding arising out of or relating to these Terms shall be brought exclusively in the courts located in Edmonton, Alberta. You consent to the personal jurisdiction and venue of such courts.`
  },
  {
    id: 'dispute-resolution',
    title: '14. Dispute Resolution',
    content: `Before filing any claim against PitchIQ, you agree to try to resolve the dispute informally by contacting us at privacy@pitchiq.ca. We will attempt to resolve the dispute informally within 60 days.

If we are unable to resolve the dispute informally, you and PitchIQ agree to resolve any dispute through binding arbitration administered by the ADR Institute of Canada, Inc. (ADRIC) under its arbitration rules. The arbitration will be conducted in Edmonton, Alberta, in English. The arbitrator's decision will be final and binding.`
  },
  {
    id: 'export',
    title: '15. Export Control',
    content: `You may not use, export, or re-export the Service except as authorized by Canadian law and the laws of the jurisdiction in which the Service was obtained. You represent and warrant that you are not located in any country subject to a Canadian or U.S. government embargo or designated as a "terrorist supporting" country, and that you are not listed on any Canadian or U.S. government list of prohibited or restricted parties.`
  },
  {
    id: 'severability',
    title: '16. Severability',
    content: `If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if modification is not possible, severed from these Terms. The remaining provisions shall continue in full force and effect.`
  },
  {
    id: 'entire-agreement',
    title: '17. Entire Agreement',
    content: `These Terms, together with the Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and PitchIQ regarding the Service and supersede all prior or contemporaneous agreements, understandings, or representations, whether written or oral.`
  },
  {
    id: 'contact',
    title: '18. Contact Us',
    content: `If you have any questions about these Terms, please contact us:`
  },
];

export default function TermsPage() {
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
            Terms of Service
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
        {SECTIONS.map((section) => (
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
                <p className="text-[#1A1A1A] font-medium mb-1">PitchIQ</p>
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
            to="/privacy"
            className="text-sm text-brand-orange hover:text-brand-amber transition-colors font-medium"
          >
            Privacy Policy →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
