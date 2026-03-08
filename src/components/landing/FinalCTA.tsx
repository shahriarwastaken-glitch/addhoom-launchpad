import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

const FinalCTA = () => {
  const { t } = useLanguage();
  const trustPills = [
    { bn: 'বাংলায় সাপোর্ট', en: 'Bangla Support' },
    { bn: 'bKash পেমেন্ট', en: 'bKash Payment' },
    { bn: '৩০ দিনের গ্যারান্টি', en: '30-Day Guarantee' },
    { bn: 'যেকোনো সময় বাতিল', en: 'Cancel Anytime' },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-brand">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="text-4xl md:text-5xl font-heading-bn font-bold text-primary-foreground mb-4">
          {t('আজই শুরু করুন', 'Start Today')}
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 font-body-bn">
          {t('৩০ সেকেন্ডে সেটআপ। ঝামেলা নেই।', 'Setup in 30 seconds. No hassle.')}
        </p>
        <div className="flex justify-center mb-10">
          <Link to="/auth" className="bg-card text-foreground rounded-full px-8 py-4 text-lg font-semibold hover:scale-[1.04] transition-transform shadow-warm-lg font-body-bn">
            {t('শুরু করুন', 'Get Started')}
          </Link>
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
