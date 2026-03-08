import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';

const toBn = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const BD_FESTIVALS = [
  { name: 'পহেলা বৈশাখ', en: 'Pohela Boishakh', month: 4, day: 14, color: '#E53E3E', emoji: '🎊' },
  { name: 'বিজয় দিবস', en: 'Victory Day', month: 12, day: 16, color: '#276749', emoji: '🇧🇩' },
  { name: 'ভালোবাসা দিবস', en: "Valentine's Day", month: 2, day: 14, color: '#E53E3E', emoji: '❤️' },
  { name: 'ঈদুল ফিতর', en: 'Eid ul-Fitr', month: 3, day: 31, color: '#276749', emoji: '🌙' },
  { name: 'ঈদুল আযহা', en: 'Eid ul-Adha', month: 6, day: 7, color: '#276749', emoji: '🐑' },
  { name: 'রমজান', en: 'Ramadan', month: 3, day: 1, color: '#553C9A', emoji: '🌙' },
  { name: 'দুর্গা পূজা', en: 'Durga Puja', month: 10, day: 2, color: '#D53F8C', emoji: '🪷' },
  { name: 'মাতৃ দিবস', en: "Mother's Day", month: 5, day: 11, color: '#D53F8C', emoji: '💐' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  product_ad: { bg: 'bg-primary', text: 'text-primary-foreground' },
  educational: { bg: 'bg-[hsl(var(--brand-purple))]', text: 'text-white' },
  social_proof: { bg: 'bg-[hsl(var(--brand-green))]', text: 'text-white' },
  festival: { bg: 'bg-[hsl(var(--brand-yellow))]', text: 'text-foreground' },
};

function getUpcomingFestival(daysAhead = 14) {
  const now = new Date();
  for (const f of BD_FESTIVALS) {
    for (const yOff of [0, 1]) {
      const fd = new Date(now.getFullYear() + yOff, f.month - 1, f.day);
      const diff = Math.ceil((fd.getTime() - now.getTime()) / 86400000);
      if (diff >= 0 && diff <= daysAhead) {
        return { ...f, daysUntil: diff };
      }
    }
  }
  return null;
}

type CalendarItem = {
  id: string;
  date: string;
  title: string | null;
  content_type: string;
  platform: string | null;
  status: string | null;
};

const UpcomingContentWidget = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('content_calendar')
      .select('id, date, title, content_type, platform, status')
      .eq('workspace_id', activeWorkspace.id)
      .gte('date', today)
      .neq('status', 'skipped')
      .order('date', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        setItems((data as CalendarItem[]) || []);
        setLoading(false);
      });
  }, [activeWorkspace]);

  const festival = useMemo(() => getUpcomingFestival(14), []);

  return (
    <div className="bg-card rounded-[20px] border border-border p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm font-bn">
            {t('আসন্ন কনটেন্ট', 'Upcoming Content')}
          </h3>
        </div>
        <button
          onClick={() => navigate('/dashboard/calendar')}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-bn"
        >
          {t('সব দেখুন', 'View all')} <ChevronRight size={14} />
        </button>
      </div>

      {/* Festival alert */}
      {festival && (
        <div
          className="rounded-xl p-3 mb-4 border"
          style={{
            background: `${festival.color}10`,
            borderColor: `${festival.color}30`,
          }}
        >
          <p className="text-sm font-bold font-bn" style={{ color: festival.color }}>
            {festival.emoji} {lang === 'bn' ? festival.name : festival.en} — {t(`${toBn(festival.daysUntil)} দিন বাকি`, `${festival.daysUntil} days away`)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-bn">
            {t('বিজ্ঞাপন প্রস্তুত আছে?', 'Are your ads ready?')}
          </p>
          <button
            onClick={() => navigate('/dashboard/calendar')}
            className="text-xs text-primary font-semibold mt-1.5 hover:underline font-bn"
          >
            {t('ক্যালেন্ডার দেখুন →', 'View calendar →')}
          </button>
        </div>
      )}

      {/* Content items */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3 font-bn">
            {t('কোনো পরিকল্পনা নেই', 'No plan yet')}
          </p>
          <button
            onClick={() => navigate('/dashboard/calendar')}
            className="flex items-center gap-1.5 mx-auto text-xs text-primary font-semibold hover:underline font-bn"
          >
            <Sparkles size={14} />
            {t('৯০ দিনের পরিকল্পনা তৈরি করুন →', 'Generate 90-day plan →')}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(item => {
            const tc = TYPE_COLORS[item.content_type] || { bg: 'bg-secondary', text: 'text-foreground' };
            const isOverdue = item.status === 'overdue';
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors ${isOverdue ? 'border-l-2 border-l-destructive' : ''}`}
              >
                {/* Date pill */}
                <div className="flex-shrink-0 text-center">
                  <div className="text-[10px] text-muted-foreground font-body">
                    {new Date(item.date + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-bold text-foreground font-body">
                    {new Date(item.date + 'T00:00:00').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric' })}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                      {item.content_type.replace('_', ' ')}
                    </span>
                    {isOverdue && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-0.5">
                        <AlertTriangle size={8} /> {t('অতিক্রান্ত', 'Overdue')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate font-bn">
                    {item.title || t('কনটেন্ট', 'Content')}
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate('/dashboard/calendar')}
                  className="flex-shrink-0 flex items-center gap-1 text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-lg font-bn hover:bg-primary/90 transition-colors"
                >
                  <Zap size={10} /> {t('তৈরি', 'Create')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingContentWidget;
