import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Stethoscope, CheckCircle, AlertTriangle, AlertOctagon, RefreshCw, Search, Loader2 } from 'lucide-react';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const AccountDoctor = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runDiagnostics = async () => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.accountDoctor({ workspace_id: activeWorkspace.id });
      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data) {
        setReport(response.data.report || response.data);
        toast.success(t('রিপোর্ট তৈরি হয়েছে!', 'Report generated!'));
      }
    } catch {
      toast.error(t('ডায়াগনস্টিক ব্যর্থ', 'Diagnostics failed'));
    } finally {
      setLoading(false);
    }
  };

  const score = report?.health_score ?? 0;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 71 ? 'stroke-brand-green' : score >= 41 ? 'stroke-brand-yellow' : 'stroke-destructive';

  const sections = [
    { type: 'good', title: { bn: 'যা ভালো চলছে', en: "What's Going Well" }, icon: CheckCircle, iconColor: 'text-brand-green', borderColor: 'border-l-brand-green', items: report?.good_items || [] },
    { type: 'warn', title: { bn: 'মনোযোগ দিন', en: 'Needs Attention' }, icon: AlertTriangle, iconColor: 'text-brand-yellow', borderColor: 'border-l-brand-yellow', items: report?.warning_items || [] },
    { type: 'urgent', title: { bn: 'এখনই ব্যবস্থা নিন', en: 'Take Action Now' }, icon: AlertOctagon, iconColor: 'text-destructive', borderColor: 'border-l-destructive', items: report?.critical_items || [] },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8 flex items-center gap-2">
        <Stethoscope size={24} className="text-primary" />
        {t('অ্যাকাউন্ট ডাক্তার', 'Account Doctor')}
      </h2>

      {!report ? (
        <div className="bg-card rounded-[20px] shadow-warm p-8 text-center">
          <Stethoscope size={48} className="text-primary mx-auto mb-4" />
          <h3 className="text-lg font-heading-bn font-semibold mb-2">{t('আপনার অ্যাকাউন্ট চেক করুন', 'Check Your Account')}</h3>
          <p className="text-sm text-muted-foreground font-body-bn mb-6">
            {t('AI আপনার ক্যাম্পেইন বিশ্লেষণ করে হেলথ স্কোর ও সাজেশন দেবে।', 'AI will analyze your campaigns and provide a health score & suggestions.')}
          </p>
          <button onClick={runDiagnostics} disabled={loading}
            className="bg-gradient-cta text-primary-foreground rounded-full px-8 py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn flex items-center gap-2 mx-auto">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> {t('বিশ্লেষণ চলছে...', 'Analyzing...')}</>
            ) : (
              <><Stethoscope size={16} /> {t('ডায়াগনস্টিক চালান', 'Run Diagnostics')}</>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Health Score */}
          <div className="bg-card rounded-[20px] shadow-warm p-8 text-center mb-8">
            <svg width="200" height="200" className="mx-auto">
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
              <circle cx="100" cy="100" r="80" fill="none" className={scoreColor} strokeWidth="12"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
              <text x="100" y="95" textAnchor="middle" className="font-mono font-bold" fontSize="40" fill="currentColor">
                {toBengali(score)}
              </text>
              <text x="100" y="120" textAnchor="middle" className="font-body-bn" fontSize="14" fill="hsl(var(--muted-foreground))">
                {t('হেলথ স্কোর', 'Health Score')}
              </text>
            </svg>
            <button onClick={runDiagnostics} disabled={loading} className="mt-4 text-sm text-primary hover:underline font-body-bn flex items-center gap-1 mx-auto">
              <RefreshCw size={14} /> {loading ? t('রিফ্রেশ হচ্ছে...', 'Refreshing...') : t('আবার চেক করুন', 'Check Again')}
            </button>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, i) => (
              section.items.length > 0 && (
                <div key={i}>
                  <h3 className="font-heading-bn font-bold text-foreground mb-3 flex items-center gap-2">
                    <section.icon size={18} className={section.iconColor} />
                    {t(section.title.bn, section.title.en)}
                  </h3>
                  <div className="space-y-3">
                    {section.items.map((item: string, j: number) => (
                      <div key={j} className={`bg-card rounded-xl shadow-warm p-4 border-l-4 ${section.borderColor} flex items-center justify-between`}>
                        <span className="text-sm text-foreground font-body-bn">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountDoctor;
