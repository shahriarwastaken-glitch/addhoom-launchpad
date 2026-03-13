import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy — AdDhoom Studio';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 13, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introduction</h2>
            <p>AdDhoom ("Company", "we", "us") operates AdDhoom Studio, an AI-powered advertising platform. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Information We Collect</h2>
            
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Information:</strong> Name, email address, phone number, and password when you register.</li>
              <li><strong>Profile Information:</strong> Avatar, language preference, and notification settings.</li>
              <li><strong>Business Information:</strong> Shop name, product descriptions, product images, brand details, and website URLs you provide for ad generation.</li>
              <li><strong>Payment Information:</strong> Billing details processed through SSLCommerz. We do not store your full payment card details on our servers.</li>
              <li><strong>Communications:</strong> Messages you send through our AI chat feature or customer support.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Usage Data:</strong> Features used, credits consumed, ads generated, timestamps of activity.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, screen resolution, timezone.</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URLs.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">2.3 AI-Generated Content</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>We process your inputs (product images, descriptions, prompts) through third-party AI services (Google Gemini, WaveSpeed AI, Fashn.ai) to generate content.</li>
              <li>Generated content (images, videos, ad copy) is stored in your account for your access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Provide the Service:</strong> Generate ad creatives, process payments, manage your account.</li>
              <li><strong>Improve the Service:</strong> Analyze usage patterns (in aggregate) to enhance features and performance.</li>
              <li><strong>Communications:</strong> Send transactional emails (payment confirmations, credit resets), and optional marketing updates (with your consent).</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and unauthorized access.</li>
              <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only in these circumstances:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>AI Service Providers:</strong> Your inputs (images, text prompts) are sent to Google Gemini, WaveSpeed AI, and Fashn.ai for content generation. These providers process data according to their own privacy policies.</li>
              <li><strong>Payment Processors:</strong> SSLCommerz processes your payment transactions in accordance with PCI-DSS standards.</li>
              <li><strong>Email Services:</strong> Resend processes transactional and notification emails on our behalf.</li>
              <li><strong>Infrastructure:</strong> Our backend is hosted on Supabase (cloud infrastructure). Data is stored securely with encryption at rest.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your data is stored on secure cloud infrastructure with encryption at rest and in transit.</li>
              <li>We implement row-level security policies to ensure users can only access their own data.</li>
              <li>Sensitive operations (credit transactions, plan changes) are protected by server-side validation.</li>
              <li>Admin access is protected by multi-factor authentication (OTP verification).</li>
              <li>We regularly review and update our security practices.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Data:</strong> Retained while your account is active and for 30 days after deletion.</li>
              <li><strong>Generated Content:</strong> Stored in your account until you delete it or your account is terminated.</li>
              <li><strong>Usage Logs:</strong> Retained for 12 months for analytics and audit purposes.</li>
              <li><strong>Payment Records:</strong> Retained for 7 years as required by financial regulations.</li>
              <li><strong>AI Chat History:</strong> Retained in your account until manually deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information through your Settings page.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
              <li><strong>Export:</strong> Download your generated content and ad history.</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications via notification preferences.</li>
              <li><strong>Restriction:</strong> Request that we limit processing of your data in certain circumstances.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:hello@addhoom.com" className="text-primary hover:underline">hello@addhoom.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Cookies & Local Storage</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>We use essential cookies and local storage for authentication, session management, and remembering your workspace preference.</li>
              <li>We use timezone detection to auto-select your preferred currency (BDT/USD).</li>
              <li>We do not use third-party tracking cookies or advertising cookies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Children's Privacy</h2>
            <p>The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If you believe a child has provided us with personal data, please contact us for immediate removal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. International Data Transfers</h2>
            <p>Your data may be processed in countries outside Bangladesh where our service providers operate. We ensure appropriate safeguards are in place for such transfers, including data processing agreements with our providers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. Material changes will be communicated via email or in-app notification at least 14 days before taking effect. The "Last updated" date at the top reflects the most recent revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Contact Us</h2>
            <p>For questions, concerns, or data requests related to this Privacy Policy:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Email: <a href="mailto:hello@addhoom.com" className="text-primary hover:underline">hello@addhoom.com</a></li>
              <li>WhatsApp: Available via our website</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
