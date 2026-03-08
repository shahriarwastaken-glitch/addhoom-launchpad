import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

const Footer = () => {
  const { t } = useLanguage();
  const columns = [
    { title: { bn: 'পণ্য', en: 'Product' }, links: [
      { bn: 'AI বিজ্ঞাপন', en: 'AI Ads' }, { bn: 'ভিডিও অ্যাড', en: 'Video Ads' },
      { bn: 'ধুম স্কোর', en: 'Dhoom Score' }, { bn: 'শপ DNA', en: 'Shop DNA' },
    ]},
    { title: { bn: 'রিসোর্স', en: 'Resources' }, links: [
      { bn: 'ব্লগ', en: 'Blog' }, { bn: 'টিউটোরিয়াল', en: 'Tutorials' },
      { bn: 'API ডকুমেন্টেশন', en: 'API Docs' }, { bn: 'হেল্প সেন্টার', en: 'Help Center' },
    ]},
    { title: { bn: 'কোম্পানি', en: 'Company' }, links: [
      { bn: 'আমাদের সম্পর্কে', en: 'About Us' }, { bn: 'ক্যারিয়ার', en: 'Careers' },
      { bn: 'যোগাযোগ', en: 'Contact' }, { bn: 'প্রেস', en: 'Press' },
    ]},
    { title: { bn: 'আইনি', en: 'Legal' }, links: [
      { bn: 'প্রাইভেসি পলিসি', en: 'Privacy' }, { bn: 'শর্তাবলী', en: 'Terms' },
      { bn: 'রিফান্ড পলিসি', en: 'Refund' },
    ]},
  ];

  return (
    <footer id="contact" className="border-t border-border py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-bold font-heading-en">
              <span className="text-foreground">Ad</span><span className="text-primary">Dhoom</span><Zap size={16} className="text-brand-yellow inline" />
            </Link>
            <p className="text-sm text-muted-foreground mt-3 font-body-bn">
              {t('বাংলাদেশের ই-কমার্সের জন্য AI মার্কেটিং', 'AI Marketing for Bangladesh E-commerce')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Dhaka, Bangladesh 🇧🇩</p>
          </div>
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-foreground text-sm mb-4 font-heading-bn">{t(col.title.bn, col.title.en)}</h4>
              <div className="space-y-2">
                {col.links.map((link, j) => (
                  <a key={j} href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors font-body-bn">
                    {t(link.bn, link.en)}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© ২০২৫ AdDhoom. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
