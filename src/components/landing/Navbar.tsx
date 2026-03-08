import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/hooks/useTheme';
import { Link } from 'react-router-dom';
import { Menu, X, Moon, Sun } from 'lucide-react';

const Navbar = () => {
  const { lang, toggle, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { bn: 'ফিচারসমূহ', en: 'Features', href: '#features' },
    { bn: 'মূল্য', en: 'Pricing', href: '#pricing' },
    { bn: 'কেন আমরা', en: 'Why Us', href: '#why-us' },
    { bn: 'FAQ', en: 'FAQ', href: '#faq' },
    { bn: 'যোগাযোগ', en: 'Contact', href: '#contact' },
  ];

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border transition-all duration-300 ${scrolled ? 'shadow-[0_2px_24px_rgba(255,81,0,0.08)]' : ''}`}
        style={{ height: scrolled ? 60 : 72 }}>
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-0.5 text-xl font-bold font-heading-en">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            <span className="text-brand-yellow">⚡</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <a key={item.en} href={item.href} onClick={e => handleAnchor(e, item.href)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t(item.bn, item.en)}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="flex items-center bg-secondary rounded-full px-3 py-1.5 text-xs font-semibold">
              <span className={lang === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
              <span className="text-muted-foreground mx-1">|</span>
              <span className={lang === 'bn' ? 'text-primary' : 'text-muted-foreground'}>বাং</span>
            </button>
            <Link to="/dashboard" className="hidden md:inline-block bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.04] transition-transform font-body-bn">
              {t('শুরু করুন', 'Get Started')}
            </Link>
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-card flex flex-col items-center justify-center gap-6">
          <Link to="/" className="text-2xl font-bold font-heading-en mb-8">
            <span className="text-foreground">Ad</span>
            <span className="text-primary">Dhoom</span>
            <span className="text-brand-yellow">⚡</span>
          </Link>
          {navItems.map((item, i) => (
            <a key={item.en} href={item.href} onClick={e => handleAnchor(e, item.href)}
              className="text-lg font-medium text-foreground animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}>
              {t(item.bn, item.en)}
            </a>
          ))}
          <button onClick={toggle} className="flex items-center bg-secondary rounded-full px-4 py-2 text-sm font-semibold mt-4">
            <span className={lang === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
            <span className="text-muted-foreground mx-1">|</span>
            <span className={lang === 'bn' ? 'text-primary' : 'text-muted-foreground'}>বাং</span>
          </button>
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}
            className="bg-gradient-cta text-primary-foreground rounded-full px-8 py-3 text-base font-semibold shadow-orange-glow w-4/5 text-center mt-4 font-body-bn">
            {t('শুরু করুন', 'Get Started')}
          </Link>
        </div>
      )}
    </>
  );
};

export default Navbar;
