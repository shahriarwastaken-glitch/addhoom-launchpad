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

const TermsOfService = () => {
  useEffect(() => {
    document.title = 'Terms of Service — AdDhoom Studio';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: '#FFFBF5' }} className="min-h-screen">
      <LandingNavbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px' }}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity mb-6">
          <ArrowLeft size={14} /> Back to AdDhoom Studio
        </Link>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 700, color: '#1C1B1A', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: '#6B6560', marginBottom: 48 }}>Last updated: March 2026</p>

        <Section number={1} title="Acceptance of Terms">
          <P>By creating an account and using AdDhoom Studio you agree to these Terms of Service. If you do not agree, do not use AdDhoom Studio.</P>
          <P>These terms apply to all users of AdDhoom Studio including free and paid subscribers.</P>
        </Section>

        <Section number={2} title="Description of Service">
          <P>AdDhoom Studio is an AI-powered marketing platform that helps sellers create product images, ad copy, video ads, and other marketing content.</P>
          <P>We reserve the right to modify, suspend, or discontinue any feature at any time with reasonable notice.</P>
        </Section>

        <Section number={3} title="Account Responsibilities">
          <P>You are responsible for:</P>
          <Item>Maintaining the confidentiality of your account credentials</Item>
          <Item>All activity that occurs under your account</Item>
          <Item>Providing accurate information when creating your account</Item>
          <Item>Notifying us immediately of any unauthorized access</Item>
          <P>&nbsp;</P>
          <P>You must be at least 16 years old to create an account.</P>
          <P>One person or business may not maintain more than one free account.</P>
        </Section>

        <Section number={4} title="Subscriptions and Payments">
          <P><strong>Subscription Plans:</strong><br />AdDhoom Studio offers paid subscription plans (Starter, Pro, Agency) with monthly credit allocations.</P>
          <P><strong>Billing:</strong><br />Subscriptions are billed monthly. Payment is processed via SSLCommerz. You authorize us to charge your selected payment method.</P>
          <P>SSLCommerz does not support automatic recurring billing. You will receive a renewal reminder before your subscription expires. It is your responsibility to renew your subscription to maintain uninterrupted access.</P>
          <P><strong>Credits:</strong><br />Credits are allocated monthly with your subscription. Credits reset 30 days after each successful payment, not on a fixed calendar date. Unused credits do not roll over.</P>
          <P><strong>Credit Packs:</strong><br />Additional credits can be purchased as one-time credit packs. Credit pack credits never expire and stack on top of subscription credits.</P>
          <P><strong>Pricing:</strong><br />Prices are listed in USD and BDT. We reserve the right to change prices with 30 days notice to existing subscribers.</P>
        </Section>

        <Section number={5} title="Refund Policy">
          <P>All payments are final and non-refundable.</P>
          <P>We do not offer refunds on subscription payments or credit pack purchases.</P>
          <P>If you believe you have been charged in error, contact us at <a href="mailto:contact@addhoomstudio.com" className="text-primary hover:underline">contact@addhoomstudio.com</a> and we will review your case.</P>
        </Section>

        <Section number={6} title="Acceptable Use">
          <P>You agree NOT to use AdDhoom Studio to:</P>
          <Item>Create content that is illegal, harmful, threatening, or harassing</Item>
          <Item>Infringe on the intellectual property rights of others</Item>
          <Item>Generate misleading or deceptive advertising content</Item>
          <Item>Upload content you do not own or have rights to use</Item>
          <Item>Attempt to reverse engineer, hack, or disrupt the service</Item>
          <Item>Create multiple accounts to circumvent credit limits</Item>
          <Item>Resell access to AdDhoom Studio without written permission</Item>
          <P>&nbsp;</P>
          <P>We reserve the right to suspend or terminate accounts that violate these terms without refund.</P>
        </Section>

        <Section number={7} title="AI-Generated Content">
          <P><strong>Ownership:</strong><br />Content you generate using AdDhoom Studio is owned by you.</P>
          <P><strong>Responsibility:</strong><br />You are solely responsible for the content you generate and how you use it. AdDhoom Studio is a tool — we are not responsible for how generated content is used in advertising campaigns.</P>
          <P><strong>Accuracy:</strong><br />AI-generated content may contain errors, inaccuracies, or unintended outputs. Always review generated content before publishing or using in paid advertising.</P>
          <P><strong>No Guarantee of Results:</strong><br />AdDhoom Studio does not guarantee that AI-generated content will produce specific advertising results, sales, or business outcomes.</P>
        </Section>

        <Section number={8} title="Intellectual Property">
          <P>AdDhoom Studio, its logo, mascot, features, and underlying technology are owned by AdDhoom Studio and protected by intellectual property laws.</P>
          <P>You may not copy, reproduce, or distribute any part of AdDhoom Studio without written permission.</P>
        </Section>

        <Section number={9} title="Limitation of Liability">
          <P>AdDhoom Studio is not liable for indirect, incidental, or consequential damages resulting from your use of the platform. The service is provided "as-is" without warranties of any kind.</P>
          <P>Our total liability to you shall not exceed the amount you paid us in the 30 days preceding the claim.</P>
        </Section>

        <Section number={10} title="Service Availability">
          <P>We aim for high availability but do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance where possible.</P>
          <P>We are not liable for downtime caused by third-party service providers or payment processors.</P>
        </Section>

        <Section number={11} title="Termination">
          <P>You may cancel your account at any time from Settings → Billing.</P>
          <P>We may suspend or terminate your account if you violate these terms, engage in fraudulent activity, or abuse the service.</P>
          <P>Upon termination:</P>
          <Item>Your access to AdDhoom Studio ends</Item>
          <Item>Unused credits are forfeited</Item>
          <Item>Your data is handled per our Privacy Policy</Item>
        </Section>

        <Section number={12} title="Changes to Terms">
          <P>We may update these Terms of Service. Significant changes will be communicated by email with 14 days notice.</P>
          <P>Continued use after the effective date constitutes acceptance of updated terms.</P>
        </Section>

        <Section number={13} title="Governing Law">
          <P>These terms are governed by the laws of Bangladesh. Any disputes shall be resolved in the courts of Dhaka, Bangladesh.</P>
        </Section>

        <Section number={14} title="Contact">
          <P>For questions about these terms, billing, refunds, or general support:</P>
          <P><a href="mailto:contact@addhoomstudio.com" className="text-primary hover:underline">contact@addhoomstudio.com</a></P>
          <P>&nbsp;</P>
          <P>AdDhoom Studio<br />addhoomstudio.com</P>
        </Section>
      </div>
      <LandingFooter />
    </div>
  );
};

export default TermsOfService;
