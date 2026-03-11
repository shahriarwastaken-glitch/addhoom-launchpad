import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import mascot from '@/assets/mascot.png';

const LandingNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 bg-background ${scrolled ? 'border-b border-border shadow-[0_1px_8px_rgba(0,0,0,0.04)]' : ''}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={mascot} alt="AdDhoom Studio" className="h-10 w-auto object-contain" />
            <span className="font-heading-en text-lg font-semibold text-foreground tracking-tight">AdDhoom Studio</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="font-body-en text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">{link.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="font-body-en text-sm font-medium text-muted-foreground border border-border rounded-[10px] px-5 py-2.5 hover:border-primary hover:text-primary transition-all duration-200">Sign In</Link>
            <Link to="/auth" className="font-body-en text-sm font-semibold text-primary-foreground bg-primary rounded-[10px] px-5 py-2.5 hover:opacity-90 hover:scale-[1.02] transition-all duration-200">Get Started →</Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute top-0 right-0 bottom-0 w-[280px] bg-background shadow-2xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-end p-4">
            <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-foreground" /></button>
          </div>
          <div className="flex flex-col px-6 gap-6 pt-4">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="font-body-en text-base font-semibold text-foreground">{link.label}</a>
            ))}
          </div>
          <div className="flex flex-col gap-3 px-6 mt-10">
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-center font-body-en text-sm font-medium text-muted-foreground border border-border rounded-[10px] px-5 py-3">Sign In</Link>
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-center font-body-en text-sm font-semibold text-primary-foreground bg-primary rounded-[10px] px-5 py-3">Get Started →</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingNavbar;
