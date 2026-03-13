import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FeatureTooltip from '@/components/ui/FeatureTooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Loader2, X, Check, Sparkles,
  Calendar as CalendarIcon, List, Layers, Zap, Filter,
  Search, Edit3, Trash2, AlertTriangle, Keyboard, ChevronDown, PartyPopper
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useCreditGate } from '@/hooks/useCreditGate';

// ── Helpers ──
const toBn = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  product_ad: { bg: 'bg-primary', text: 'text-primary-foreground' },
  educational: { bg: 'bg-[hsl(var(--brand-purple))]', text: 'text-white' },
  social_proof: { bg: 'bg-[hsl(var(--brand-green))]', text: 'text-white' },
  festival: { bg: 'bg-[hsl(var(--brand-yellow))]', text: 'text-foreground' },
};

const TYPE_BORDER: Record<string, string> = {
  product_ad: 'border-l-primary',
  educational: 'border-l-[hsl(var(--brand-purple))]',
  social_proof: 'border-l-[hsl(var(--brand-green))]',
  festival: 'border-l-[hsl(var(--brand-yellow))]',
};

const TYPE_LABELS: Record<string, { bn: string; en: string }> = {
  product_ad: { bn: 'পণ্য বিজ্ঞাপন', en: 'Product Ad' },
  educational: { bn: 'শিক্ষামূলক', en: 'Educational' },
  social_proof: { bn: 'সামাজিক প্রমাণ', en: 'Social Proof' },
  festival: { bn: 'উৎসব/মৌসুমী', en: 'Festival' },
};

const STATUS_LABELS: Record<string, { bn: string; en: string; class: string }> = {
  planned: { bn: 'পরিকল্পিত', en: 'Planned', class: 'bg-secondary text-muted-foreground' },
  confirmed: { bn: 'নিশ্চিত ✓', en: 'Confirmed ✓', class: 'bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))]' },
  generating: { bn: 'তৈরি হচ্ছে...', en: 'Generating...', class: 'bg-primary/10 text-primary' },
  generated: { bn: 'তৈরি হয়েছে', en: 'Generated', class: 'bg-primary/10 text-primary' },
  skipped: { bn: 'বাদ দেওয়া হয়েছে', en: 'Skipped', class: 'bg-destructive/10 text-destructive' },
  overdue: { bn: 'অতিক্রান্ত', en: 'Overdue', class: 'bg-destructive/10 text-destructive' },
  completed: { bn: 'সম্পন্ন ✓', en: 'Completed ✓', class: 'bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))]' },
};

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const BD_FESTIVALS = [
  { name: 'পহেলা বৈশাখ', en: 'Pohela Boishakh', month: 4, day: 14, color: '#E53E3E' },
  { name: 'বিজয় দিবস', en: 'Victory Day', month: 12, day: 16, color: '#276749' },
  { name: 'ভালোবাসা দিবস', en: "Valentine's Day", month: 2, day: 14, color: '#E53E3E' },
  { name: 'মাতৃ দিবস', en: "Mother's Day", month: 5, day: 11, color: '#D53F8C' },
  { name: 'ঈদুল ফিতর', en: 'Eid ul-Fitr', month: 3, day: 31, color: '#276749' },
  { name: 'ঈদুল আযহা', en: 'Eid ul-Adha', month: 6, day: 7, color: '#276749' },
  { name: 'রমজান', en: 'Ramadan', month: 3, day: 1, color: '#553C9A' },
  { name: 'দুর্গা পূজা', en: 'Durga Puja', month: 10, day: 2, color: '#D53F8C' },
];

function getFestivalForDate(dateStr: string): typeof BD_FESTIVALS[0] | null {
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return BD_FESTIVALS.find(f => f.month === m && f.day === day) || null;
}

function getUpcomingFestivals90(startDate: Date) {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 90);
  const results: Array<typeof BD_FESTIVALS[0] & { date: Date; daysUntil: number }> = [];
  for (const f of BD_FESTIVALS) {
    for (const yOff of [0, 1]) {
      const y = startDate.getFullYear() + yOff;
      const fd = new Date(y, f.month - 1, f.day);
      if (fd >= startDate && fd <= end) {
        results.push({ ...f, date: fd, daysUntil: Math.ceil((fd.getTime() - startDate.getTime()) / 86400000) });
      }
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

type CalendarEntry = {
  id: string;
  workspace_id: string;
  date: string;
  day_of_week: string | null;
  content_type: string;
  platform: string | null;
  title: string | null;
  content_idea: string | null;
  hook: string | null;
  occasion: string | null;
  priority: string | null;
  status: string | null;
  batch_id: string | null;
  recommended_framework: string | null;
  recommended_tone: string | null;
  festival_theme: string | null;
};

// ── MAIN COMPONENT ──
const ContentCalendar = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'swipe' | 'list'>('month');
  const [showGenModal, setShowGenModal] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('content_calendar')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('date', { ascending: true });
    if (!error && data) {
      // Mark overdue items
      const today = new Date().toISOString().split('T')[0];
      const processed = (data as CalendarEntry[]).map(e => {
        if (e.date < today && (e.status === 'planned' || e.status === 'confirmed')) {
          return { ...e, status: 'overdue' };
        }
        return e;
      });
      setEntries(processed);
      setHasExisting(processed.length > 0);
    }
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Count overdue
  const overdueCount = entries.filter(e => e.status === 'overdue').length;

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {([
              { key: 'month', icon: CalendarIcon, bn: 'মাস দেখুন', en: 'Month' },
              { key: 'swipe', icon: Layers, bn: 'সুইপ ভিউ', en: 'Swipe' },
              { key: 'list', icon: List, bn: 'তালিকা দেখুন', en: 'List' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  view === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={14} />
                {t(tab.bn, tab.en)}
              </button>
            ))}
          </div>
          {overdueCount > 0 && (
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full"
            >
              <AlertTriangle size={12} />
              {lang === 'bn' ? `${toBn(overdueCount)}টি অতিক্রান্ত` : `${overdueCount} overdue`}
            </button>
          )}
        </div>
        <FeatureTooltip tooltipKey="calendar_generate" position="bottom">
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => setShowGenModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                hasExisting
                  ? 'border border-border text-foreground hover:bg-secondary'
                  : 'bg-gradient-cta text-primary-foreground shadow-orange-glow hover:scale-[1.02]'
              }`}
            >
              <Sparkles size={16} />
              {hasExisting
                ? t('পুনরায় তৈরি করুন', 'Regenerate')
                : t('৯০ দিনের পরিকল্পনা তৈরি করুন', 'Generate 90-Day Plan')
              }
            </button>
            <span className="text-[11px] font-body" style={{ color: '#9E9E9E' }}>· 500 {t('ক্রেডিট', 'credits')}</span>
          </div>
        </FeatureTooltip>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState t={t} onGenerate={() => setShowGenModal(true)} />
        ) : view === 'month' ? (
          <MonthView entries={entries} setEntries={setEntries} t={t} lang={lang} navigate={navigate} isMobile={isMobile} />
        ) : view === 'swipe' ? (
          <SwipeView entries={entries} setEntries={setEntries} t={t} lang={lang} navigate={navigate} isMobile={isMobile} />
        ) : (
          <ListView entries={entries} setEntries={setEntries} t={t} lang={lang} navigate={navigate} isMobile={isMobile} />
        )}
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenModal && (
          <GenerateModal
            t={t}
            lang={lang}
            activeWorkspace={activeWorkspace}
            hasExisting={hasExisting}
            onClose={() => setShowGenModal(false)}
            onComplete={() => { setShowGenModal(false); loadEntries(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── EMPTY STATE ──
function EmptyState({ t, onGenerate }: { t: any; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <CalendarIcon size={36} className="text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 font-bn">
        {t('কোনো কনটেন্ট পরিকল্পনা নেই', 'No content plan yet')}
      </h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm font-bn">
        {t(
          'AI দিয়ে ৯০ দিনের কনটেন্ট পরিকল্পনা তৈরি করুন। বাংলাদেশের উৎসব ও আপনার শপের উপর ভিত্তি করে।',
          'Generate a 90-day content plan powered by AI, tailored to BD festivals and your shop DNA.'
        )}
      </p>
      <button
        onClick={onGenerate}
        className="bg-gradient-cta text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform flex items-center gap-2"
      >
        <Sparkles size={18} />
        {t('৯০ দিনের পরিকল্পনা তৈরি করুন', 'Generate 90-Day Plan')}
      </button>
    </div>
  );
}

// ── GENERATE MODAL ──
function GenerateModal({ t, lang, activeWorkspace, hasExisting, onClose, onComplete }: any) {
  const [step, setStep] = useState<'config' | 'loading' | 'success'>('config');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [postsPerWeek, setPostsPerWeek] = useState(4);
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [mix, setMix] = useState({ product_ads: 40, educational: 25, social_proof: 20, festival: 15 });
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [festivalsCovered, setFestivalsCovered] = useState<string[]>([]);

  const upcomingFests = useMemo(() => getUpcomingFestivals90(new Date(startDate)), [startDate]);

  const loadingMsgs = [
    t('বাংলাদেশের উৎসব ক্যালেন্ডার দেখছি...', 'Checking BD festival calendar...'),
    t('আপনার শপের তথ্য বিশ্লেষণ করছি...', 'Analyzing your shop data...'),
    t('কনটেন্ট ধরন সাজাচ্ছি...', 'Organizing content types...'),
    t('ফাইনাল পরিকল্পনা তৈরি হচ্ছে...', 'Building final plan...'),
  ];

  useEffect(() => {
    if (step !== 'loading') return;
    const interval = setInterval(() => setLoadingMsg(p => (p + 1) % loadingMsgs.length), 2000);
    return () => clearInterval(interval);
  }, [step]);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const adjustMix = (key: string, val: number) => {
    const others = Object.keys(mix).filter(k => k !== key);
    const remaining = 100 - val;
    const currentOthersTotal = others.reduce((s, k) => s + mix[k as keyof typeof mix], 0);
    const newMix = { ...mix, [key]: val };
    if (currentOthersTotal > 0) {
      others.forEach(k => {
        newMix[k as keyof typeof mix] = Math.round((mix[k as keyof typeof mix] / currentOthersTotal) * remaining);
      });
    }
    // Ensure sum = 100
    const sum = Object.values(newMix).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      const diff = 100 - sum;
      newMix[others[0] as keyof typeof mix] += diff;
    }
    setMix(newMix);
  };

  const handleGenerate = async () => {
    if (!activeWorkspace) return;
    setStep('loading');
    try {
      const res = await api.generateContentCalendar({
        workspace_id: activeWorkspace.id,
        start_date: startDate,
        posts_per_week: postsPerWeek,
        platforms,
        content_mix: mix,
        regenerate: hasExisting,
        language: lang,
      });
      if (res.error) {
        toast.error(t(res.error.message_bn, res.error.message_en));
        setStep('config');
      } else {
        setTotalItems(res.data?.total_items || 0);
        setFestivalsCovered(res.data?.festivals_covered || []);
        setStep('success');
      }
    } catch {
      toast.error(t('পরিকল্পনা তৈরিতে সমস্যা', 'Failed to generate plan'));
      setStep('config');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-[20px] shadow-warm-lg w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {step === 'config' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-1 font-bn">
              {t('কনটেন্ট পরিকল্পনা সেটআপ', 'Content Plan Setup')}
            </h3>

            {/* Upcoming festivals hint */}
            {upcomingFests.length > 0 && (
              <p className="text-xs text-primary mb-4 font-bn">
                {t('আগামী ৯০ দিনে: ', 'In next 90 days: ')}
                {upcomingFests.map(f => `${lang === 'bn' ? f.name : f.en} (${lang === 'bn' ? `${toBn(f.daysUntil)} দিন বাকি` : `${f.daysUntil} days`})`).join(', ')}
              </p>
            )}

            {/* Start date */}
            <label className="block text-sm font-medium text-foreground mb-1 mt-3 font-bn">{t('পরিকল্পনা শুরু হবে', 'Start date')}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" />

            {/* Posts per week */}
            <label className="block text-sm font-medium text-foreground mb-1 mt-4 font-bn">{t('সপ্তাহে কতটি পোস্ট?', 'Posts per week')}</label>
            <div className="flex gap-2">
              {[3, 4, 5, 7].map(n => (
                <button key={n} onClick={() => setPostsPerWeek(n)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${postsPerWeek === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
                >{lang === 'bn' ? toBn(n) : n}</button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-bn">{t('৪-৫টি পোস্ট সপ্তাহে সেরা ফল দেয়', '4-5 posts/week works best')}</p>

            {/* Platforms */}
            <label className="block text-sm font-medium text-foreground mb-1 mt-4 font-bn">{t('কোন প্ল্যাটফর্ম?', 'Platforms')}</label>
            <div className="flex gap-2 flex-wrap">
              {['facebook', 'instagram', 'daraz'].map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${platforms.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                >{p}</button>
              ))}
            </div>

            {/* Content mix */}
            <label className="block text-sm font-medium text-foreground mb-2 mt-4 font-bn">{t('কনটেন্ট মিশ্রণ', 'Content Mix')}</label>
            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              <div className="bg-primary transition-all" style={{ width: `${mix.product_ads}%` }} />
              <div className="bg-[hsl(var(--brand-purple))] transition-all" style={{ width: `${mix.educational}%` }} />
              <div className="bg-[hsl(var(--brand-green))] transition-all" style={{ width: `${mix.social_proof}%` }} />
              <div className="bg-[hsl(var(--brand-yellow))] transition-all" style={{ width: `${mix.festival}%` }} />
            </div>
            {([
              { key: 'product_ads', bn: 'পণ্য বিজ্ঞাপন', en: 'Product Ads', color: 'bg-primary' },
              { key: 'educational', bn: 'শিক্ষামূলক', en: 'Educational', color: 'bg-[hsl(var(--brand-purple))]' },
              { key: 'social_proof', bn: 'সামাজিক প্রমাণ', en: 'Social Proof', color: 'bg-[hsl(var(--brand-green))]' },
              { key: 'festival', bn: 'উৎসব/মৌসুমী', en: 'Festival', color: 'bg-[hsl(var(--brand-yellow))]' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center gap-3 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                <span className="text-xs text-foreground w-28 font-bn">{t(item.bn, item.en)}</span>
                <input type="range" min={0} max={80} value={mix[item.key]} onChange={e => adjustMix(item.key, parseInt(e.target.value))}
                  className="flex-1 h-1.5 accent-primary" />
                <span className="text-xs text-muted-foreground w-8 text-right">{mix[item.key]}%</span>
              </div>
            ))}

            <div className="flex gap-3 mt-6">
              <button onClick={handleGenerate} disabled={platforms.length === 0}
                className="flex-1 bg-gradient-cta text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Sparkles size={16} />
                {t('পরিকল্পনা তৈরি করুন', 'Generate Plan')}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary">
                {t('বাতিল', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CalendarIcon size={28} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 font-bn">
              {t('AI ৯০ দিনের পরিকল্পনা তৈরি করছে...', 'AI is building your 90-day plan...')}
            </h3>
            <AnimatePresence mode="wait">
              <motion.p key={loadingMsg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="text-sm text-muted-foreground font-bn">
                {loadingMsgs[loadingMsg]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 flex flex-col items-center text-center">
            {/* CSS confetti */}
            <div className="relative w-16 h-16 mb-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div key={i}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 0, x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120, scale: 0 }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                  style={{ background: ['#FF5100', '#6C3FE8', '#00B96B', '#FFB800'][i % 4] }}
                />
              ))}
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--brand-green))]/10 flex items-center justify-center">
                <Check size={28} className="text-[hsl(var(--brand-green))]" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 font-bn">
              {t('পরিকল্পনা তৈরি হয়েছে!', 'Plan generated!')}
            </h3>
            <p className="text-sm text-muted-foreground mb-1 font-bn">
              {lang === 'bn' ? `মোট ${toBn(totalItems)}টি কনটেন্ট আইটেম।` : `Total ${totalItems} content items.`}
            </p>
            {festivalsCovered.length > 0 && (
              <p className="text-xs text-primary mb-4 font-bn">
                {t('উৎসব: ', 'Festivals: ')}{festivalsCovered.join(', ')}
              </p>
            )}
            <button onClick={onComplete}
              className="bg-gradient-cta text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold">
              {t('ক্যালেন্ডার দেখুন', 'View Calendar')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── MONTH VIEW ──
function MonthView({ entries, setEntries, t, lang, navigate, isMobile }: {
  entries: CalendarEntry[]; setEntries: any; t: any; lang: string; navigate: any; isMobile: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = new Date().toISOString().split('T')[0];
  const weekdays = lang === 'bn' ? WEEKDAYS_BN : WEEKDAYS_EN;

  const entriesByDate = useMemo(() => {
    const m: Record<string, CalendarEntry[]> = {};
    entries.forEach(e => { if (!m[e.date]) m[e.date] = []; m[e.date].push(e); });
    return m;
  }, [entries]);

  const buildDate = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];

  const goToday = () => setCurrentMonth(new Date());

  const handleSwipeAction = async (id: string, action: 'confirm' | 'skip' | 'generate') => {
    const res = await api.swipeAction({ item_id: id, action });
    if (res.error) { toast.error(t(res.error.message_bn, res.error.message_en)); return; }
    if (action === 'generate' && res.data?.prefill) {
      const params = new URLSearchParams(res.data.prefill);
      navigate(`/dashboard/generate?${params.toString()}`);
      return;
    }
    setEntries((prev: CalendarEntry[]) => prev.map(e =>
      e.id === id ? { ...e, status: action === 'confirm' ? 'confirmed' : 'skipped' } : e
    ));
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData('text/plain', entryId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(entryId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setDraggingId(null);
    const entryId = e.dataTransfer.getData('text/plain');
    if (!entryId) return;
    const entry = entries.find((en: CalendarEntry) => en.id === entryId);
    if (!entry || entry.date === targetDate) return;

    // Optimistic update
    setEntries((prev: CalendarEntry[]) => prev.map(en =>
      en.id === entryId ? { ...en, date: targetDate } : en
    ));
    toast.success(t('তারিখ পরিবর্তন হয়েছে', 'Date updated'));

    // Persist to backend
    const res = await api.updateCalendarItem({ item_id: entryId, date: targetDate });
    if (res.error) {
      // Revert on failure
      setEntries((prev: CalendarEntry[]) => prev.map(en =>
        en.id === entryId ? { ...en, date: entry.date } : en
      ));
      toast.error(t(res.error.message_bn, res.error.message_en));
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-lg font-en">
              {lang === 'bn' ? `${MONTHS_BN[month]} ${toBn(year)}` : `${new Date(year, month).toLocaleString('en', { month: 'long' })} ${year}`}
            </h3>
            <button onClick={goToday} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {t('আজকে', 'Today')}
            </button>
          </div>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight size={18} /></button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr overflow-auto">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = buildDate(day);
            const dayEntries = entriesByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate === dateStr;
            const isPast = dateStr < todayStr;
            const festival = getFestivalForDate(dateStr);
            const isWeekend = new Date(dateStr + 'T00:00:00').getDay() === 5 || new Date(dateStr + 'T00:00:00').getDay() === 6;
            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                onDragOver={e => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, dateStr)}
                className={`rounded-xl border cursor-pointer transition-all ${isMobile ? 'min-h-[52px] p-1' : 'min-h-[80px] p-1.5'} relative flex flex-col ${
                  isDragOver ? 'border-primary border-dashed bg-primary/10 ring-2 ring-primary/30' :
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :
                  isToday ? 'border-primary/30 bg-primary/[0.04]' :
                  isPast ? 'border-border/50 bg-muted/30' :
                  'border-border hover:border-primary/20 hover:bg-secondary/30'
                }`}
                style={festival ? { animation: 'festivalGlow 3s ease-in-out infinite' } : undefined}
              >
                {/* Festival banner - hide text on mobile */}
                {festival && !isMobile && (
                  <div className="text-[9px] text-white text-center rounded-md py-0.5 px-1 mb-1 truncate"
                    style={{ background: `linear-gradient(135deg, ${festival.color}, ${festival.color}88)` }}>
                    {lang === 'bn' ? festival.name : festival.en}
                  </div>
                )}
                {festival && isMobile && (
                  <div className="w-full h-1 rounded-full mb-0.5" style={{ background: festival.color }} />
                )}
                {/* Date number */}
                <div className={`leading-none mb-0.5 ${isMobile ? 'text-[10px]' : 'text-xs'} ${
                  isToday ? 'w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold' :
                  isWeekend ? 'text-muted-foreground' : 'text-foreground/70'
                }`}>
                  {lang === 'bn' ? toBn(day) : day}
                </div>
                {/* Content indicators */}
                {isMobile ? (
                  /* Mobile: colored dots only */
                  <div className="flex flex-wrap gap-[3px] mt-auto">
                    {dayEntries.slice(0, 4).map(e => {
                      const tc = TYPE_COLORS[e.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
                      return (
                        <div key={e.id} className={`w-[6px] h-[6px] rounded-full ${tc.bg} ${e.status === 'skipped' ? 'opacity-30' : ''}`} />
                      );
                    })}
                    {dayEntries.length > 4 && <div className="w-[6px] h-[6px] rounded-full bg-muted-foreground/30" />}
                  </div>
                ) : (
                  /* Desktop: full pills, draggable */
                  <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                    {dayEntries.slice(0, 3).map(e => {
                      const tc = TYPE_COLORS[e.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
                      const isSkipped = e.status === 'skipped';
                      const isDragging = draggingId === e.id;
                      return (
                        <div key={e.id}
                          draggable
                          onDragStart={ev => { ev.stopPropagation(); handleDragStart(ev, e.id); }}
                          onDragEnd={handleDragEnd}
                          className={`text-[10px] leading-tight rounded-md px-1 py-0.5 truncate cursor-grab active:cursor-grabbing select-none transition-opacity ${tc.bg} ${tc.text} ${
                            isSkipped ? 'opacity-30 line-through' : ''
                          } ${isDragging ? 'opacity-40' : ''}`}>
                          {e.status === 'confirmed' && <Check size={8} className="inline mr-0.5" />}
                          {e.title || t('কনটেন্ট', 'Content')}
                        </div>
                      );
                    })}
                    {dayEntries.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{lang === 'bn' ? toBn(dayEntries.length - 3) : dayEntries.length - 3} {t('আরো', 'more')}</span>
                    )}
                  </div>
                )}
                {dayEntries.some(e => e.status === 'overdue') && (
                  <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl bg-destructive" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel — side panel on desktop, bottom sheet on mobile */}
      <AnimatePresence>
        {selectedDate && !isMobile && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="w-80 lg:w-96 bg-card rounded-[20px] shadow-warm border border-border p-4 flex flex-col overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h4 className="font-bold text-foreground text-sm font-bn">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h4>
              <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-secondary"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto space-y-3">
              {selectedEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 font-bn">{t('এই দিনে কোনো কনটেন্ট নেই', 'No content for this day')}</p>
              ) : selectedEntries.map(entry => (
                <ContentItemCard key={entry.id} entry={entry} t={t} lang={lang} onAction={handleSwipeAction} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {selectedDate && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-[20px] shadow-warm-lg max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <h4 className="font-bold text-foreground text-sm font-bn">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h4>
                <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-secondary"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-auto px-4 pb-20 space-y-3">
                {selectedEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 font-bn">{t('এই দিনে কোনো কনটেন্ট নেই', 'No content for this day')}</p>
                ) : selectedEntries.map(entry => (
                  <ContentItemCard key={entry.id} entry={entry} t={t} lang={lang} onAction={handleSwipeAction} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CONTENT ITEM CARD ──
function ContentItemCard({ entry, t, lang, onAction }: { entry: CalendarEntry; t: any; lang: string; onAction: (id: string, action: 'confirm' | 'skip' | 'generate') => void }) {
  const tc = TYPE_COLORS[entry.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
  const borderColor = TYPE_BORDER[entry.content_type] || 'border-l-muted';
  const st = STATUS_LABELS[entry.status || 'planned'] || STATUS_LABELS.planned;

  return (
    <div className={`bg-card rounded-xl border border-border border-l-4 ${borderColor} p-3 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
          {t(TYPE_LABELS[entry.content_type]?.bn, TYPE_LABELS[entry.content_type]?.en)}
        </span>
        {entry.platform && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{entry.platform}</span>}
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.class}`}>{t(st.bn, st.en)}</span>
      </div>
      <p className="font-bold text-foreground text-sm font-bn">{entry.title}</p>
      <p className="text-xs text-muted-foreground font-bn line-clamp-2">{entry.content_idea}</p>
      {entry.hook && <p className="text-xs text-primary italic font-bn">"{entry.hook}"</p>}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button onClick={() => onAction(entry.id, 'generate')}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bn">
          <Zap size={12} /> {t('বিজ্ঞাপন তৈরি করুন', 'Create Ad')}
        </button>
        {entry.status !== 'confirmed' && entry.status !== 'completed' && (
          <button onClick={() => onAction(entry.id, 'confirm')}
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:bg-secondary text-foreground">
            <Check size={12} /> {t('নিশ্চিত', 'Confirm')}
          </button>
        )}
        {entry.status !== 'skipped' && (
          <button onClick={() => onAction(entry.id, 'skip')}
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10">
            <X size={12} /> {t('বাদ', 'Skip')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── SWIPE VIEW ──
function SwipeView({ entries, setEntries, t, lang, navigate, isMobile }: {
  entries: CalendarEntry[]; setEntries: any; t: any; lang: string; navigate: any; isMobile: boolean;
}) {
  const pendingEntries = useMemo(() => entries.filter(e => e.status === 'planned' || e.status === 'overdue'), [entries]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showKeyHint, setShowKeyHint] = useState(true);
  const [undoItem, setUndoItem] = useState<string | null>(null);
  const undoTimeout = useRef<ReturnType<typeof setTimeout>>();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Reviewed counts
  const confirmedCount = entries.filter(e => e.status === 'confirmed' || e.status === 'completed').length;
  const skippedCount = entries.filter(e => e.status === 'skipped').length;
  const totalReviewable = pendingEntries.length + confirmedCount + skippedCount;
  const reviewed = confirmedCount + skippedCount;

  // Hide keyboard hint after 5s
  useEffect(() => {
    const timer = setTimeout(() => setShowKeyHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (currentIdx >= pendingEntries.length) return;
      if (e.key === 'ArrowLeft') handleAction('skip');
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleAction('confirm'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); handleAction('generate'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, pendingEntries]);

  const handleAction = async (action: 'confirm' | 'skip' | 'generate') => {
    if (currentIdx >= pendingEntries.length) return;
    const entry = pendingEntries[currentIdx];

    if (action === 'skip') {
      setUndoItem(entry.id);
      clearTimeout(undoTimeout.current);
      undoTimeout.current = setTimeout(() => setUndoItem(null), 3000);
    }

    const res = await api.swipeAction({ item_id: entry.id, action });
    if (res.error) { toast.error(t(res.error.message_bn, res.error.message_en)); return; }

    if (action === 'generate' && res.data?.prefill) {
      const params = new URLSearchParams(res.data.prefill);
      navigate(`/dashboard/generate?${params.toString()}`);
      return;
    }

    setEntries((prev: CalendarEntry[]) => prev.map(e =>
      e.id === entry.id ? { ...e, status: action === 'confirm' ? 'confirmed' : 'skipped' } : e
    ));
    setCurrentIdx(i => i + 1);
    x.set(0);
    y.set(0);
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    await api.swipeAction({ item_id: undoItem, action: 'undo_skip' });
    setEntries((prev: CalendarEntry[]) => prev.map(e => e.id === undoItem ? { ...e, status: 'planned' } : e));
    setUndoItem(null);
    setCurrentIdx(i => Math.max(0, i - 1));
  };

  // All reviewed
  if (currentIdx >= pendingEntries.length && pendingEntries.length === 0 && entries.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <PartyPopper size={36} className="text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2 font-bn">{t('সব কনটেন্ট রিভিউ হয়ে গেছে!', 'All content reviewed!')}</h3>
        <div className="space-y-1 text-sm text-muted-foreground mb-6">
          <p className="flex items-center gap-1"><Check size={12} /> {lang === 'bn' ? `নিশ্চিত করা হয়েছে: ${toBn(confirmedCount)}টি` : `Confirmed: ${confirmedCount}`}</p>
          <p className="flex items-center gap-1"><X size={12} /> {lang === 'bn' ? `বাদ দেওয়া হয়েছে: ${toBn(skippedCount)}টি` : `Skipped: ${skippedCount}`}</p>
        </div>
      </div>
    );
  }

  if (pendingEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-muted-foreground font-bn">{t('কোনো পেন্ডিং কনটেন্ট নেই', 'No pending content')}</p>
      </div>
    );
  }

  const entry = pendingEntries[Math.min(currentIdx, pendingEntries.length - 1)];
  if (!entry) return null;

  const tc = TYPE_COLORS[entry.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
  const festival = entry.festival_theme || (entry.occasion && entry.occasion !== 'general' ? entry.occasion : null);

  return (
    <div className={`flex flex-col items-center h-full ${isMobile ? 'justify-start pt-2' : 'justify-center'}`}>
      {/* Progress */}
      <div className="w-full max-w-md mb-4">
        <p className="text-xs text-muted-foreground text-center mb-2 font-bn">
          {lang === 'bn' ? `${toBn(totalReviewable)} এর মধ্যে ${toBn(reviewed)}টি রিভিউ করা হয়েছে` : `${reviewed} of ${totalReviewable} reviewed`}
        </p>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalReviewable > 0 ? (reviewed / totalReviewable * 100) : 0}%` }} />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-md">
        {/* Background cards */}
        {pendingEntries[currentIdx + 2] && (
          <div className="absolute inset-0 bg-card rounded-[24px] border border-border scale-[0.88] translate-y-4 opacity-40" />
        )}
        {pendingEntries[currentIdx + 1] && (
          <div className="absolute inset-0 bg-card rounded-[24px] border border-border scale-[0.94] translate-y-2 opacity-60" />
        )}

        {/* Main card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={entry.id}
            style={{ x, y, rotate }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (info.offset.x < -100) handleAction('skip');
              else if (info.offset.x > 100) handleAction('confirm');
              else if (info.offset.y < -80) handleAction('generate');
              else { x.set(0); y.set(0); }
            }}
            initial={{ scale: 0.92, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-card rounded-[24px] shadow-warm-lg border border-border p-6 sm:p-7 cursor-grab active:cursor-grabbing relative overflow-hidden"
          >
            {/* Drag overlays */}
            <motion.div className="absolute inset-0 bg-destructive/10 flex items-center justify-center pointer-events-none"
              style={{ opacity: useTransform(x, [-200, -50, 0], [0.8, 0.2, 0]) }}>
              <X size={48} className="text-destructive" />
            </motion.div>
            <motion.div className="absolute inset-0 bg-[hsl(var(--brand-green))]/10 flex items-center justify-center pointer-events-none"
              style={{ opacity: useTransform(x, [0, 50, 200], [0, 0.2, 0.8]) }}>
              <Check size={48} className="text-[hsl(var(--brand-green))]" />
            </motion.div>
            <motion.div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none"
              style={{ opacity: useTransform(y, [0, -40, -120], [0, 0.2, 0.8]) }}>
              <Zap size={48} className="text-primary" />
            </motion.div>

            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full font-bn">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full ${tc.bg} ${tc.text}`}>
                {t(TYPE_LABELS[entry.content_type]?.bn, TYPE_LABELS[entry.content_type]?.en)}
              </span>
            </div>

            {/* Festival indicator */}
            {festival && (
              <div className="bg-[hsl(var(--brand-yellow))]/10 border border-[hsl(var(--brand-yellow))]/30 rounded-xl p-2 mb-3">
                <p className="text-xs text-[hsl(var(--brand-yellow))] font-medium font-bn flex items-center gap-1"><PartyPopper size={12} /> {festival}</p>
              </div>
            )}

            {/* Content */}
            <h3 className="text-lg font-bold text-foreground mb-2 font-bn leading-snug">{entry.title}</h3>
            <p className="text-sm text-muted-foreground font-bn leading-relaxed mb-3">{entry.content_idea}</p>

            {/* Platform tags */}
            {entry.platform && (
              <div className="flex gap-1.5 mb-3">
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full capitalize">{entry.platform}</span>
              </div>
            )}

            {/* AI reasoning collapsible */}
            {entry.recommended_framework && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground transition-colors font-bn">
                  {t('▾ AI কেন এই দিন বেছেছে', '▾ Why AI chose this day')}
                </summary>
                <p className="mt-1 italic font-bn">
                  {t(`ফ্রেমওয়ার্ক: ${entry.recommended_framework} | টোন: ${entry.recommended_tone || 'friendly'}`,
                    `Framework: ${entry.recommended_framework} | Tone: ${entry.recommended_tone || 'friendly'}`)}
                </p>
              </details>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className={`flex items-center gap-6 ${isMobile ? 'fixed bottom-16 left-0 right-0 justify-center pb-4 pt-3 bg-background/80 backdrop-blur-sm z-30' : 'mt-6'}`}>
        <button onClick={() => handleAction('skip')}
          className="w-14 h-14 rounded-full border-2 border-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-colors text-destructive">
          <X size={24} />
        </button>
        <button onClick={() => handleAction('generate')}
          className="w-[68px] h-[68px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-orange-glow hover:scale-105 transition-transform">
          <Zap size={28} />
        </button>
        <button onClick={() => handleAction('confirm')}
          className="w-14 h-14 rounded-full border-2 border-[hsl(var(--brand-green))] flex items-center justify-center hover:bg-[hsl(var(--brand-green))] hover:text-white transition-colors text-[hsl(var(--brand-green))]">
          <Check size={24} />
        </button>
      </div>

      {/* Keyboard hint */}
      <AnimatePresence>
        {showKeyHint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="hidden sm:flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Keyboard size={10} /> ← {t('বাদ', 'Skip')}</span>
            <span className="flex items-center gap-1">↑ {t('তৈরি', 'Generate')}</span>
            <span className="flex items-center gap-1">→ {t('নিশ্চিত', 'Confirm')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo toast */}
      <AnimatePresence>
        {undoItem && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-warm-lg flex items-center gap-3 text-sm">
            <span className="font-bn">{t('বাদ দেওয়া হয়েছে', 'Skipped')}</span>
            <button onClick={handleUndo} className="text-primary font-semibold font-bn">{t('পূর্বাবস্থায় ফেরান', 'Undo')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── LIST VIEW ──
function ListView({ entries, setEntries, t, lang, navigate, isMobile }: {
  entries: CalendarEntry[]; setEntries: any; t: any; lang: string; navigate: any; isMobile: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (typeFilter !== 'all') list = list.filter(e => e.content_type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.title?.toLowerCase().includes(q) || e.content_idea?.toLowerCase().includes(q));
    }
    // Sort overdue first, then by date
    list.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      return a.date.localeCompare(b.date);
    });
    return list;
  }, [entries, typeFilter, statusFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  };

  const handleBulkAction = async (action: 'confirm' | 'skip') => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const res = await api.bulkUpdateCalendar({ item_ids: ids, action });
    if (res.error) { toast.error(t(res.error.message_bn, res.error.message_en)); return; }
    setEntries((prev: CalendarEntry[]) => prev.map(e =>
      selected.has(e.id) ? { ...e, status: action === 'confirm' ? 'confirmed' : 'skipped' } : e
    ));
    setSelected(new Set());
    toast.success(lang === 'bn' ? `${toBn(ids.length)}টি আপডেট হয়েছে` : `${ids.length} items updated`);
  };

  const handleAction = async (id: string, action: 'confirm' | 'skip' | 'generate') => {
    const res = await api.swipeAction({ item_id: id, action });
    if (res.error) { toast.error(t(res.error.message_bn, res.error.message_en)); return; }
    if (action === 'generate' && res.data?.prefill) {
      const params = new URLSearchParams(res.data.prefill);
      navigate(`/dashboard/generate?${params.toString()}`);
      return;
    }
    setEntries((prev: CalendarEntry[]) => prev.map(e =>
      e.id === id ? { ...e, status: action === 'confirm' ? 'confirmed' : 'skipped' } : e
    ));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
        {/* Type filters */}
        <div className="flex gap-1 flex-wrap">
          {[{ key: 'all', bn: 'সব', en: 'All' }, ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ key: k, ...v }))].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${typeFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
              {t(f.bn, f.en)}
            </button>
          ))}
        </div>
        <div className="w-px bg-border hidden sm:block" />
        {/* Status filters */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: 'all', bn: 'সব', en: 'All' },
            { key: 'planned', bn: 'পরিকল্পিত', en: 'Planned' },
            { key: 'confirmed', bn: 'নিশ্চিত', en: 'Confirmed' },
            { key: 'skipped', bn: 'বাদ', en: 'Skipped' },
            { key: 'overdue', bn: 'অতিক্রান্ত', en: 'Overdue' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
              {t(f.bn, f.en)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('কনটেন্ট খুঁজুন...', 'Search content...')}
            className="pl-8 pr-3 py-1.5 text-xs border border-input rounded-lg bg-background w-48" />
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-auto">
        {isMobile ? (
          /* Mobile: Card-based list */
          <div className="space-y-2 pb-44">
            {filtered.map(entry => {
              const tc = TYPE_COLORS[entry.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
              const st = STATUS_LABELS[entry.status || 'planned'] || STATUS_LABELS.planned;
              const isOverdue = entry.status === 'overdue';
              return (
                <div key={entry.id} className={`bg-card rounded-xl border border-border p-3 ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} className="accent-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[10px] text-muted-foreground font-body">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{t(TYPE_LABELS[entry.content_type]?.bn, TYPE_LABELS[entry.content_type]?.en)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${st.class}`}>{t(st.bn, st.en)}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground font-bn truncate">{entry.title}</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleAction(entry.id, 'generate')} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Zap size={14} /></button>
                      {entry.status !== 'confirmed' && <button onClick={() => handleAction(entry.id, 'confirm')} className="p-1.5 rounded hover:bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))]"><Check size={14} /></button>}
                      {entry.status !== 'skipped' && <button onClick={() => handleAction(entry.id, 'skip')} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><X size={14} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop: Table */
          <div className="rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr>
                  <th className="w-8 p-2"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-primary" /></th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">{t('তারিখ', 'Date')}</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">{t('ধরন', 'Type')}</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">{t('শিরোনাম', 'Title')}</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">{t('প্ল্যাটফর্ম', 'Platform')}</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">{t('স্ট্যাটাস', 'Status')}</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">{t('অ্যাকশন', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const tc = TYPE_COLORS[entry.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
                  const st = STATUS_LABELS[entry.status || 'planned'] || STATUS_LABELS.planned;
                  const isExpanded = expandedId === entry.id;
                  const isOverdue = entry.status === 'overdue';

                  return (
                    <Fragment key={entry.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-primary/[0.03] ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}
                      >
                        <td className="p-2" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} className="accent-primary" />
                        </td>
                        <td className="p-2 text-xs text-foreground whitespace-nowrap font-body">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>{t(TYPE_LABELS[entry.content_type]?.bn, TYPE_LABELS[entry.content_type]?.en)}</span></td>
                        <td className="p-2 text-xs font-medium text-foreground truncate max-w-[200px] font-bn">{entry.title}</td>
                        <td className="p-2 text-xs text-muted-foreground capitalize">{entry.platform}</td>
                        <td className="p-2"><span className={`text-[10px] px-2 py-0.5 rounded-full ${st.class}`}>{t(st.bn, st.en)}</span></td>
                        <td className="p-2 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleAction(entry.id, 'generate')} className="p-1 rounded hover:bg-primary/10 text-primary" title={t('তৈরি', 'Generate')}><Zap size={14} /></button>
                            {entry.status !== 'confirmed' && <button onClick={() => handleAction(entry.id, 'confirm')} className="p-1 rounded hover:bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))]" title={t('নিশ্চিত', 'Confirm')}><Check size={14} /></button>}
                            {entry.status !== 'skipped' && <button onClick={() => handleAction(entry.id, 'skip')} className="p-1 rounded hover:bg-destructive/10 text-destructive" title={t('বাদ', 'Skip')}><X size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-secondary/20">
                          <td colSpan={7} className="p-4">
                            <p className="text-xs text-muted-foreground font-bn mb-1">{entry.content_idea}</p>
                            {entry.hook && <p className="text-xs text-primary italic font-bn">"{entry.hook}"</p>}
                            {entry.recommended_framework && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {t('ফ্রেমওয়ার্ক', 'Framework')}: {entry.recommended_framework} | {t('টোন', 'Tone')}: {entry.recommended_tone || '-'}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="flex items-center justify-between bg-card border border-border rounded-xl p-3 mt-3 flex-shrink-0">
            <span className="text-sm text-foreground font-bn">
              {t(`${toBn(selected.size)}টি নির্বাচিত`, `${selected.size} selected`)}
            </span>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('confirm')}
                className="text-xs px-3 py-1.5 rounded-lg bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))] hover:bg-[hsl(var(--brand-green))]/20 font-bn">
                <Check size={12} className="inline mr-1" />{t('নিশ্চিত করুন', 'Confirm')}
              </button>
              <button onClick={() => handleBulkAction('skip')}
                className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-bn">
                <X size={12} className="inline mr-1" />{t('বাদ দিন', 'Skip')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Need Fragment for list view
import { Fragment } from 'react';

export default ContentCalendar;
