import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Star, X, ArrowRight, ArrowLeft, Check, Sparkles, Calendar as CalendarIcon, Target, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const TYPE_COLORS: Record<string, string> = {
  product_ad: 'bg-primary',
  educational: 'bg-green-500',
  social_proof: 'bg-purple-500',
  festival: 'bg-yellow-500',
};

const TYPE_LABELS_BN: Record<string, string> = {
  product_ad: 'প্রোডাক্ট',
  educational: 'শিক্ষামূলক',
  social_proof: 'সোশ্যাল প্রুফ',
  festival: 'উৎসব',
};

const TYPE_LABELS_EN: Record<string, string> = {
  product_ad: 'Product Ad',
  educational: 'Educational',
  social_proof: 'Social Proof',
  festival: 'Festival',
};

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
};

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

const ContentCalendar = () => {
  const { t, lang: language } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'swipe'>('month');
  const [swipeIndex, setSwipeIndex] = useState(0);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    supabase
      .from('content_calendar')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setEntries((data as CalendarEntry[]) || []);
        setLoading(false);
      });
  }, [activeWorkspace]);

  const handleGenerate = async () => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }
    setGenerating(true);
    try {
      const response = await api.generateContentCalendar({
        workspace_id: activeWorkspace.id,
        start_date: new Date().toISOString().split('T')[0],
        language,
      });
      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else {
        toast.success(t(`${toBengali(response.data?.entries_count || 90)} দিনের প্ল্যান তৈরি হয়েছে!`, `${response.data?.entries_count || 90}-day plan generated!`));
        const { data } = await supabase
          .from('content_calendar')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .order('date', { ascending: true });
        setEntries((data as CalendarEntry[]) || []);
      }
    } catch {
      toast.error(t('প্ল্যান তৈরিতে সমস্যা', 'Failed to generate plan'));
    } finally {
      setGenerating(false);
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [entries]);

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];

  const pendingEntries = useMemo(() =>
    entries.filter(e => e.status === 'pending' || !e.status),
    [entries]
  );

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const toggleStatus = async (entryId: string, newStatus: string) => {
    await supabase.from('content_calendar').update({ status: newStatus }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e));
  };

  const moveEntryToDate = useCallback(async (entryId: string, newDate: string) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const newDayOfWeek = dayNames[new Date(newDate + 'T00:00:00').getDay()];
    await supabase.from('content_calendar').update({ date: newDate, day_of_week: newDayOfWeek }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, date: newDate, day_of_week: newDayOfWeek } : e));
    toast.success(t('কনটেন্ট সরানো হয়েছে', 'Content moved'));
  }, [t]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-heading-bn font-bold text-foreground">
          {t('📅 কনটেন্ট ক্যালেন্ডার', '📅 Content Calendar')}
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <CalendarIcon size={14} className="inline mr-1" />
              {t('মাস', 'Month')}
            </button>
            <button
              onClick={() => { setView('swipe'); setSwipeIndex(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'swipe' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t('সোয়াইপ', 'Swipe')}
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn flex items-center gap-2 disabled:opacity-70"
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {generating ? t('তৈরি হচ্ছে...', 'Generating...') : t('৯০ দিনের প্ল্যান তৈরি করুন ⚡', 'Generate 90-Day Plan ⚡')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : view === 'month' ? (
        <MonthView
          year={year} month={month}
          daysInMonth={daysInMonth}
          firstDayOfWeek={firstDayOfWeek}
          entriesByDate={entriesByDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          t={t}
          language={language}
          selectedEntries={selectedEntries}
          toggleStatus={toggleStatus}
          moveEntryToDate={moveEntryToDate}
        />
      ) : (
        <SwipeView
          entries={pendingEntries}
          swipeIndex={swipeIndex}
          setSwipeIndex={setSwipeIndex}
          toggleStatus={toggleStatus}
          t={t}
          language={language}
        />
      )}

      <div className="flex gap-4 mt-6 justify-center flex-wrap">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            {t(TYPE_LABELS_BN[type], TYPE_LABELS_EN[type])}
          </div>
        ))}
      </div>
    </div>
  );
};

// ====================== MONTH VIEW ======================
function MonthView({
  year, month, daysInMonth, firstDayOfWeek,
  entriesByDate, selectedDate, setSelectedDate,
  prevMonth, nextMonth, t, language,
  selectedEntries, toggleStatus, moveEntryToDate,
}: any) {
  const navigate = useNavigate();
  const weekdays = language === 'bn' ? WEEKDAYS_BN : WEEKDAYS_EN;
  const [dragEntry, setDragEntry] = useState<CalendarEntry | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const buildDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleDragStart = (entry: CalendarEntry) => {
    setDragEntry(entry);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDropTarget(dateStr);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (dragEntry && dragEntry.date !== dateStr) {
      moveEntryToDate(dragEntry.id, dateStr);
    }
    setDragEntry(null);
  };

  const handleCreateAd = (entry: CalendarEntry) => {
    // Navigate to ad generator with hook pre-filled via URL params
    const params = new URLSearchParams();
    if (entry.hook) params.set('hook', entry.hook);
    if (entry.title) params.set('product_name', entry.title);
    if (entry.occasion && entry.occasion !== 'general') params.set('occasion', entry.occasion);
    if (entry.platform) params.set('platform', entry.platform);
    navigate(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      <div className="flex-1 bg-card rounded-[20px] shadow-warm p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft size={20} /></button>
          <h3 className="font-heading-bn font-bold text-foreground">
            {language === 'bn' ? `${MONTHS_BN[month]} ${toBengali(year)}` : `${new Date(year, month).toLocaleString('en', { month: 'long' })} ${year}`}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-secondary"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((d: string) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-body-bn py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = buildDateStr(day);
            const dayEntries = entriesByDate[dateStr] || [];
            const isSelected = selectedDate === dateStr;
            const hasHigh = dayEntries.some((e: any) => e.priority === 'high');
            const isDropTarget = dropTarget === dateStr;

            return (
              <div
                key={day}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all hover:bg-secondary relative cursor-pointer
                  ${isSelected ? 'bg-primary/10 border border-primary ring-1 ring-primary/30' : ''}
                  ${isDropTarget ? 'bg-primary/20 border-2 border-dashed border-primary scale-105' : ''}
                `}
              >
                <span className="font-mono text-foreground text-xs">{language === 'bn' ? toBengali(day) : day}</span>
                {dayEntries.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from(new Set(dayEntries.map((e: any) => e.content_type))).slice(0, 3).map((type: string) => (
                      <div key={type} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[type] || 'bg-muted-foreground'}`} />
                    ))}
                  </div>
                )}
                {hasHigh && <Star size={8} className="text-yellow-500 absolute top-1 right-1" fill="currentColor" />}
              </div>
            );
          })}
        </div>

        {dragEntry && (
          <p className="text-xs text-muted-foreground text-center mt-3 font-body-bn">
            {t('📌 যেকোনো দিনে ড্রপ করুন', '📌 Drop on any day to move')}
          </p>
        )}
      </div>

      {/* Day Detail Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-96 bg-card rounded-[20px] shadow-warm p-6 self-start"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading-bn font-bold text-foreground text-sm">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-secondary">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {selectedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body-bn">{t('এই দিনে কোনো কনটেন্ট নেই', 'No content for this day')}</p>
            ) : (
              <div className="space-y-3">
                {selectedEntries.map((entry: CalendarEntry) => (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => handleDragStart(entry)}
                    onDragEnd={() => setDragEntry(null)}
                    className="p-3 rounded-xl border border-border space-y-2 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <GripVertical size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${TYPE_COLORS[entry.content_type] || 'bg-muted-foreground'}`}>
                        {t(TYPE_LABELS_BN[entry.content_type], TYPE_LABELS_EN[entry.content_type])}
                      </span>
                      {entry.platform && (
                        <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{entry.platform}</span>
                      )}
                      {entry.priority === 'high' && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                    </div>
                    <p className="font-heading-bn font-bold text-foreground text-sm">{entry.title}</p>
                    <p className="text-xs text-muted-foreground font-body-bn">{entry.content_idea}</p>
                    {entry.hook && (
                      <p className="text-xs text-primary italic font-body-bn">"{entry.hook}"</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(entry.id, entry.status === 'done' ? 'pending' : 'done'); }}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${entry.status === 'done' ? 'bg-green-500/10 text-green-600' : 'bg-secondary text-muted-foreground hover:bg-primary/10'}`}
                      >
                        <Check size={12} />
                        {entry.status === 'done' ? t('সম্পন্ন', 'Done') : t('সম্পন্ন করুন', 'Mark Done')}
                      </button>
                      {entry.hook && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCreateAd(entry); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-body-bn"
                        >
                          <Target size={12} />
                          {t('বিজ্ঞাপন তৈরি করুন', 'Create Ad')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ====================== SWIPE VIEW ======================
function SwipeView({ entries, swipeIndex, setSwipeIndex, toggleStatus, t, language }: any) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground font-body-bn text-lg">{t('কোনো পেন্ডিং কনটেন্ট নেই', 'No pending content')}</p>
      </div>
    );
  }

  if (swipeIndex >= entries.length) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-foreground font-heading-bn font-bold text-lg">{t('সব কনটেন্ট দেখা হয়ে গেছে!', 'All content reviewed!')}</p>
      </div>
    );
  }

  const entry = entries[swipeIndex];
  const remaining = entries.length - swipeIndex;

  const handleSkip = () => {
    toggleStatus(entry.id, 'skipped');
    setSwipeIndex((i: number) => i + 1);
  };

  const handleSave = () => {
    toggleStatus(entry.id, 'saved');
    setSwipeIndex((i: number) => i + 1);
  };

  const handleNext = () => {
    setSwipeIndex((i: number) => i + 1);
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm text-muted-foreground mb-4 font-body-bn">
        {t(`${toBengali(remaining)}টি বাকি আছে`, `${remaining} remaining`)}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={entry.id}
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragEnd={(_, info) => {
            if (info.offset.x < -100) handleSkip();
            else if (info.offset.x > 100) handleNext();
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md bg-card rounded-[24px] shadow-warm p-8 cursor-grab active:cursor-grabbing"
        >
          <p className="text-xs text-muted-foreground mb-1">
            {new Date(entry.date + 'T00:00:00').toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs text-white px-3 py-1 rounded-full ${TYPE_COLORS[entry.content_type] || 'bg-muted-foreground'}`}>
              {t(TYPE_LABELS_BN[entry.content_type], TYPE_LABELS_EN[entry.content_type])}
            </span>
            {entry.platform && (
              <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full">{entry.platform}</span>
            )}
            {entry.priority === 'high' && (
              <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-full flex items-center gap-1">
                <Star size={10} fill="currentColor" /> High
              </span>
            )}
          </div>

          <h3 className="font-heading-bn font-bold text-foreground text-xl mb-3">{entry.title}</h3>
          <p className="text-sm text-muted-foreground font-body-bn mb-4">{entry.content_idea}</p>

          {entry.hook && (
            <div className="bg-primary/5 rounded-xl p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">{t('হুক:', 'Hook:')}</p>
              <p className="text-sm text-primary font-medium italic font-body-bn">"{entry.hook}"</p>
            </div>
          )}

          {entry.occasion && entry.occasion !== 'general' && (
            <span className="text-xs bg-yellow-500/10 text-yellow-700 px-3 py-1 rounded-full">
              🎉 {entry.occasion}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={handleSkip}
          className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center hover:bg-destructive/10 transition-colors"
        >
          <ArrowLeft className="text-destructive" size={24} />
        </button>
        <button
          onClick={handleSave}
          className="w-16 h-16 rounded-full bg-gradient-cta text-primary-foreground flex items-center justify-center shadow-orange-glow hover:scale-105 transition-transform"
        >
          <Star size={28} fill="currentColor" />
        </button>
        <button
          onClick={handleNext}
          className="w-14 h-14 rounded-full border-2 border-green-500/30 flex items-center justify-center hover:bg-green-500/10 transition-colors"
        >
          <ArrowRight className="text-green-500" size={24} />
        </button>
      </div>

      <div className="flex gap-8 mt-3 text-xs text-muted-foreground">
        <span>{t('স্কিপ', 'Skip')}</span>
        <span className="text-primary font-medium">{t('সেভ', 'Save')}</span>
        <span>{t('পরের', 'Next')}</span>
      </div>
    </div>
  );
}

export default ContentCalendar;
