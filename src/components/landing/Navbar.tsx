import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t('ফিচারসমূহ', 'Features'), href: '#features' },
    { label: t('কীভাবে কাজ করে', 'How It Works'), href: '#how-it-works' },
    { label: t('মূল্য', 'Pricing'), href: '#pricing' },
    { label: t('প্রশ্নোত্তর', 'FAQ'), href: '#faq' },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'bg-background/85 backdrop-blur-[20px] border-b border-border shadow-[0_4px_24px_rgba(0,0,0,0.04)]' : 'bg-transparent'}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="font-bn text-[18px] font-bold text-primary-foreground leading-none">আ</span>
            </div>
            <div className="flex flex-col">
              <span className="font-en text-[22px] font-[800] text-foreground tracking-[-0.02em] leading-tight">AdDhoom</span>
              <span className="hidden md:block font-body text-[9px] text-muted-foreground tracking-[0.05em]">by Bangladesh, for Bangladesh</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="font-body text-[14px] font-medium text-muted-foreground hover:text-primary transition-colors duration-200">{link.label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth" className="font-body text-[14px] font-medium text-muted-foreground border border-border rounded-full px-5 py-2 hover:border-primary hover:text-primary transition-all duration-200">{t('লগইন করুন', 'Login')}</Link>
            <Link to="/auth" className="font-body text-[14px] font-semibold text-primary-foreground bg-primary rounded-full px-6 py-2.5 shadow-orange-glow hover:bg-accent hover:-translate-y-0.5 transition-all duration-200">{t('শুরু করুন', 'Get Started')}</Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileOpen(true)}><Menu className="w-6 h-6 text-foreground" /></button>
        </div>
      </nav>
      <div className={`fixed inset-0 z-[200] bg-background transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-end p-6"><button onClick={() => setMobileOpen(false)}><X className="w-6 h-6 text-foreground" /></button></div>
        <div className="flex flex-col items-center gap-8 pt-12">
          {navLinks.map(link => (<a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="font-bn text-xl font-semibold text-foreground">{link.label}</a>))}
          <Link to="/auth" onClick={() => setMobileOpen(false)} className="font-body text-base font-medium text-muted-foreground border border-border rounded-full px-8 py-3">{t('লগইন করুন', 'Login')}</Link>
          <Link to="/auth" onClick={() => setMobileOpen(false)} className="font-body text-base font-semibold text-primary-foreground bg-primary rounded-full px-8 py-3 shadow-orange-glow">{t('শুরু করুন', 'Get Started')}</Link>
        </div>
      </div>
    </>
  );
};

export default Navbar;
