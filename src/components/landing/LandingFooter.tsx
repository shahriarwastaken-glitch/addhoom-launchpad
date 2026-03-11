import { Link } from 'react-router-dom';
import { MessageCircle, Mail } from 'lucide-react';
import mascot from '@/assets/mascot.png';

const LandingFooter = () => {
  const productLinks = ['Image Generator', 'Ad Copy', 'Video Ads', 'Virtual Try-On', 'Studio', 'Dhoom Score'];
  const companyLinks = [
    { label: 'Pricing', href: '#pricing' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact', href: '#' },
  ];

  return (
    <footer style={{ background: '#161514', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={mascot} alt="AdDhoom Studio" className="h-9 w-auto object-contain" />
              <span className="font-heading-en text-lg font-semibold text-white">AdDhoom Studio</span>
            </div>
            <p className="mt-3 font-body-en text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>From product to published — in minutes.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-body-en text-[13px] font-semibold text-white tracking-[0.08em] uppercase mb-4">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map(l => (
                <li key={l}><Link to="/auth" className="font-body-en text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>{l}</Link></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-body-en text-[13px] font-semibold text-white tracking-[0.08em] uppercase mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map(l => (
                <li key={l.label}><a href={l.href} className="font-body-en text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-body-en text-[13px] font-semibold text-white tracking-[0.08em] uppercase mb-4">Connect</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="https://wa.me/880XXXXXXXXXX" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-body-en text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:hello@addhoom.com" className="flex items-center gap-2 font-body-en text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Mail size={14} /> Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 flex flex-wrap items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="font-body-en text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2025 AdDhoom Studio. All rights reserved.</span>
          <div className="flex gap-1">
            {['EN', 'বাংলা'].map(l => (
              <button key={l} className="font-body-en text-[13px] rounded-full px-3 py-1 transition-colors" style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
