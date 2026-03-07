import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

const FinalCTA = () => {
  const { t } = useLanguage();
  const trustPills = [
    { bn: 'বাংলায় সাপোর্ট', en: 'Bangla Support' },
    { bn: 'bKash পেমেন্ট', en: 'bKash Payment' },
    { bn: '৩০ দিনের গ্যারান্টি', en: '30-Day Guarantee' },
    { bn: 'কার্ড লাগবে না', en: 'No Card Required' },
    { bn: 'যেকোনো সময় বাতিল', en: 'Cancel Anytime' },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-brand">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="text-4xl md:text-5xl font-heading-bn font-bold text-primary-foreground mb-4">
          {t('আজই শুরু করুন। বিনামূল্যে।', 'Start Today. For Free.')}
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 font-body-bn">
          {t('কোনো ক্রেডিট কার্ড লাগবে না। ৩০ সেকেন্ডে সেটআপ।', 'No credit card needed. Setup in 30 seconds.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link to="/dashboard" className="bg-card text-foreground rounded-full px-8 py-4 text-lg font-semibold hover:scale-[1.04] transition-transform shadow-warm-lg font-body-bn">
            {t('বিনামূল্যে শুরু করুন', 'Start for Free')}
          </Link>
          <button className="border-2 border-primary-foreground text-primary-foreground rounded-full px-8 py-4 text-lg font-semibold hover:bg-primary-foreground/10 transition-colors font-body-bn">
            {t('ডেমো দেখুন', 'Watch Demo')}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {trustPills.map(p => (
            <span key={p.en} className="bg-card/20 text-primary-foreground text-sm rounded-full px-4 py-2 font-body-bn backdrop-blur-sm">
              {t(p.bn, p.en)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
