import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

const Section = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <section>
    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, color: '#1C1B1A', marginTop: 48, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid hsl(var(--border))' }}>
      {number}. {title}
    </h2>
    {children}
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, lineHeight: 1.8, color: '#1C1B1A', marginBottom: 12 }}>{children}</p>
);

const Item = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, lineHeight: 1.8, color: '#1C1B1A', marginBottom: 4 }}>— {children}</p>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginTop: 16, marginBottom: 12 }}>
    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#1C1B1A', marginBottom: 4 }}>{title}</p>
    <div style={{ color: '#6B6560' }}>{children}</div>
  </div>
);

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, lineHeight: 1.8, color: '#6B6560', marginBottom: 4 }}>{children}</p>
);

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = 'Privacy Policy — AdDhoom Studio';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: '#FFFBF5' }} className="min-h-screen">
      <LandingNavbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px' }}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity mb-6">
          <ArrowLeft size={14} /> Back to AdDhoom Studio
        </Link>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 700, color: '#1C1B1A', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 13, color: '#6B6560', marginBottom: 48 }}>Last updated: March 2026</p>

        <Section number={1} title="Introduction">
          <P>AdDhoom Studio ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use AdDhoom Studio at addhoomstudio.com and its subdomains.</P>
          <P>By using AdDhoom Studio you agree to the collection and use of information as described in this policy.</P>
        </Section>

        <Section number={2} title="Information We Collect">
          <P>We collect the following information when you use AdDhoom Studio:</P>
          <Sub title="Account Information:">
            <Muted>Your name, email address, and password when you create an account.</Muted>
          </Sub>
          <Sub title="Payment Information:">
            <Muted>Payment transactions are processed by SSLCommerz. We do not store your card numbers or banking credentials. We store transaction IDs and payment status for billing records.</Muted>
          </Sub>
          <Sub title="Usage Information:">
            <Muted>Features you use, content you generate, credits you spend, and actions you take within the platform.</Muted>
          </Sub>
          <Sub title="Content You Upload:">
            <Muted>Product images, business information, and other content you upload to generate ads or set up your Shop DNA.</Muted>
          </Sub>
          <Sub title="Device and Technical Information:">
            <Muted>Browser type, device type, IP address, and general location (country/city level) for security and analytics purposes.</Muted>
          </Sub>
        </Section>

        <Section number={3} title="How We Use Your Information">
          <P>We use your information to:</P>
          <Item>Provide and operate AdDhoom Studio</Item>
          <Item>Process your payments and manage your subscription</Item>
          <Item>Generate AI-powered content on your behalf</Item>
          <Item>Send transactional emails (account verification, payment receipts, subscription renewal reminders)</Item>
          <Item>Improve our features and platform</Item>
          <Item>Prevent fraud and ensure security</Item>
          <Item>Respond to your support requests</Item>
          <P>&nbsp;</P>
          <P>We do not sell your personal information to third parties. We do not use your information for advertising purposes.</P>
        </Section>

        <Section number={4} title="AI-Generated Content">
          <P>AdDhoom Studio uses third-party AI services to generate content including images, ad copy, and videos.</P>
          <P>Your uploaded content is processed solely to fulfill your generation requests. We do not use your content to train AI models without your explicit consent.</P>
          <P>Content you generate using AdDhoom Studio is owned by you. We claim no ownership over your generated outputs.</P>
        </Section>

        <Section number={5} title="Data Storage and Security">
          <P>Your data is stored securely using industry-standard cloud infrastructure.</P>
          <P>We implement the following security measures:</P>
          <Item>Encrypted data transmission (HTTPS)</Item>
          <Item>Row-level security on all database tables</Item>
          <Item>Secure authentication</Item>
          <Item>API keys stored as encrypted secrets</Item>
          <P>&nbsp;</P>
          <P>While we take security seriously, no system is completely secure. We encourage you to use a strong password and keep your account credentials safe.</P>
        </Section>

        <Section number={6} title="Data Retention">
          <P>We retain your account data for as long as your account is active.</P>
          <P>If you delete your account:</P>
          <Item>Your personal information is soft-deleted immediately</Item>
          <Item>Permanently deleted after 30 days</Item>
          <Item>Generated content (images, videos, ad copy) is deleted within 30 days</Item>
          <Item>Billing records are retained for 7 years as required by financial regulations</Item>
        </Section>

        <Section number={7} title="Cookies">
          <P>We use essential cookies to:</P>
          <Item>Keep you logged in</Item>
          <Item>Remember your preferences</Item>
          <Item>Maintain your session security</Item>
          <P>&nbsp;</P>
          <P>We do not use advertising or tracking cookies.</P>
        </Section>

        <Section number={8} title="Third-Party Services">
          <P>AdDhoom Studio works with third-party services for payment processing, AI generation, and email delivery. We only share the minimum data necessary for each service to function.</P>
          <P>Each third-party service has its own privacy policy governing their use of your data.</P>
        </Section>

        <Section number={9} title="Your Rights">
          <P>You have the right to:</P>
          <Item>Access the personal data we hold about you</Item>
          <Item>Correct inaccurate data</Item>
          <Item>Request deletion of your data</Item>
          <Item>Export your data</Item>
          <Item>Withdraw consent at any time</Item>
          <P>&nbsp;</P>
          <P>To exercise any of these rights, contact us at: <a href="mailto:contact@addhoomstudio.com" className="text-primary hover:underline">contact@addhoomstudio.com</a></P>
        </Section>

        <Section number={10} title="Children's Privacy">
          <P>AdDhoom Studio is not intended for users under the age of 16. We do not knowingly collect personal information from children.</P>
        </Section>

        <Section number={11} title="Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice in the app.</P>
          <P>Continued use of AdDhoom Studio after changes constitutes acceptance of the updated policy.</P>
        </Section>

        <Section number={12} title="Contact">
          <P>For privacy-related questions:</P>
          <P><a href="mailto:contact@addhoomstudio.com" className="text-primary hover:underline">contact@addhoomstudio.com</a></P>
          <P>&nbsp;</P>
          <P>AdDhoom Studio<br />addhoomstudio.com</P>
        </Section>
      </div>
      <LandingFooter />
    </div>
  );
};

export default PrivacyPolicy;
