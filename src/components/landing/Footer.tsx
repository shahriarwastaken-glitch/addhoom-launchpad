import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

const Footer = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  return (
    <footer className="px-6 pt-16 pb-10" style={{ background: '#161513' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr] gap-10 lg:gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"><span className="font-bn text-[18px] font-bold text-primary-foreground leading-none">আ</span></div><span className="font-en text-[22px] font-[800] text-primary-foreground tracking-[-0.02em]">AdDhoom</span></Link>
            <p className="mt-3 font-bn text-lg font-bold text-primary-foreground">{t('বিজ্ঞাপন দাও। ধুম তোলো।', 'Advertise. Explode.')}</p>
            <p className="mt-2 font-bn text-sm text-primary-foreground/50 max-w-[260px]">{t('বাংলাদেশের ই-কমার্স উদ্যোক্তাদের জন্য AI-চালিত বিজ্ঞাপন টুল।', 'AI-powered ad tool for BD e-commerce.')}</p>
            <div className="flex gap-2 mt-6">{['F','I','L'].map(s => (<a key={s} href="#" className="w-9 h-9 rounded-full bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center text-primary-foreground/70 hover:bg-primary/20 hover:border-primary hover:text-primary-foreground transition-all text-xs font-bold">{s}</a>))}</div>
            <div className="mt-7"><span className="text-[11px] text-primary-foreground/30 uppercase tracking-[0.08em]">{t('কাজ করে যেসব প্ল্যাটফর্মে', 'Works on')}</span><div className="flex flex-wrap gap-1.5 mt-2">{['Facebook','Daraz','Instagram','Google','TikTok'].map(p => (<span key={p} className="text-[10px] text-primary-foreground/40 border border-primary-foreground/10 rounded-full px-2.5 py-0.5">{p}</span>))}</div></div>
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-primary-foreground/40 uppercase tracking-[0.1em] mb-5">{t('পণ্য', 'Product')}</h4>
            {[t('ফিচারসমূহ','Features'), t('মূল্য পরিকল্পনা','Pricing'), t('ধুম স্কোর','Dhoom Score'), 'API', t('পরিবর্তন লগ','Changelog')].map(l => (<a key={l} href="#" className="block font-bn text-sm text-primary-foreground/55 mb-3 hover:text-primary-foreground hover:pl-1 transition-all duration-200">{l}</a>))}
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-primary-foreground/40 uppercase tracking-[0.1em] mb-5">{t('কোম্পানি', 'Company')}</h4>
            {[t('আমাদের সম্পর্কে','About'), t('ব্লগ','Blog'), t('ক্যারিয়ার','Careers'), t('যোগাযোগ','Contact'), t('গোপনীয়তা নীতি','Privacy')].map(l => (<a key={l} href="#" className="block font-bn text-sm text-primary-foreground/55 mb-3 hover:text-primary-foreground hover:pl-1 transition-all duration-200">{l}</a>))}
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-primary-foreground/40 uppercase tracking-[0.1em] mb-5">{t('যোগাযোগ', 'Contact')}</h4>
            <p className="text-sm text-primary-foreground/55 mb-2">hello@addhoom.com</p>
            <p className="text-sm text-primary-foreground/55 mb-6 font-bn">{t('ঢাকা, বাংলাদেশ', 'Dhaka, Bangladesh')}</p>
            <p className="text-sm font-semibold text-primary-foreground mb-3">{t('আপডেট পান', 'Get Updates')}</p>
            <div className="relative"><input type="email" placeholder={t('আপনার ইমেইল','Your email')} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-primary-foreground/[0.06] border border-primary-foreground/10 rounded-full py-2.5 pl-5 pr-28 text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary focus:outline-none transition-colors" /><button className="absolute right-1 top-1 bottom-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full px-4 hover:bg-accent transition-colors">{t('সাবস্ক্রাইব','Subscribe')}</button></div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-primary-foreground/[0.06] flex flex-col sm:flex-row justify-between items-center gap-2 text-[13px] text-primary-foreground/30">
          <span>© ২০২৫ AdDhoom. {t('সর্বস্বত্ব সংরক্ষিত।','All rights reserved.')}</span>
          <span>🇧🇩 Made with ❤️ in Bangladesh</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
