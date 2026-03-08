import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar as CalendarIcon, FolderOpen } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ScheduleModalProps {
  onClose: () => void;
  platform: string;
  creativeId?: string;   // ad_creatives id (copy)
  imageId?: string;      // ad_images id
  productName?: string;
  onScheduled?: () => void;
}

interface ProjectOption {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const ScheduleModal = ({ onClose, platform, creativeId, imageId, productName, onScheduled }: ScheduleModalProps) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Find next available date (tomorrow or later)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow);
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    supabase.from('projects').select('id, name, emoji, color')
      .eq('workspace_id', activeWorkspace.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data); });
  }, [activeWorkspace]);

  const handleSave = async () => {
    if (!date || !activeWorkspace) return;
    setSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE');

    const { error } = await supabase.from('content_calendar').insert({
      workspace_id: activeWorkspace.id,
      date: dateStr,
      day_of_week: dayOfWeek,
      content_type: imageId ? 'product_ad' : 'product_ad',
      platform: platform || 'facebook',
      title: productName || (note || t('বিজ্ঞাপন', 'Ad')),
      content_idea: note || null,
      status: 'confirmed',
      generated_creative_id: creativeId || null,
      priority: 'high',
    });

    if (error) {
      toast.error(t('শিডিউল করতে সমস্যা হয়েছে', 'Failed to schedule'));
      setSaving(false);
      return;
    }

    const displayDate = lang === 'bn'
      ? format(date, 'd MMMM')
      : format(date, 'MMM d');

    toast.success(
      <div className="flex items-center gap-2">
        <span>📅 {t(`${displayDate} তারিখে শিডিউল হয়েছে`, `Scheduled for ${displayDate}`)}</span>
        <button
          onClick={() => navigate('/dashboard/calendar')}
          className="text-primary font-semibold underline text-xs"
        >
          {t('দেখুন →', 'View →')}
        </button>
      </div>
    );

    onScheduled?.();
    onClose();
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-[20px] w-full max-w-[420px] shadow-xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 className="text-base font-bold font-heading-bn text-foreground flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" />
              {t('ক্যালেন্ডারে যোগ করুন', 'Add to Calendar')}
            </h3>
            <p className="text-xs text-muted-foreground font-heading-bn mt-0.5">
              {t('কোন দিন পোস্ট করবেন?', 'When do you want to post?')}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Date Picker */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date()}
              className={cn("p-3 pointer-events-auto rounded-xl border border-border")}
            />
          </div>

          {/* Platform badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-heading-bn">{t('প্ল্যাটফর্ম:', 'Platform:')}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-[12px] font-heading-bn text-foreground capitalize">{platform}</span>
          </div>

          {/* Project dropdown */}
          <div>
            <label className="text-xs text-muted-foreground font-heading-bn mb-1 block">
              {t('প্রজেক্টে যোগ করুন (ঐচ্ছিক)', 'Add to project (optional)')}
            </label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-heading-bn text-foreground outline-none focus:border-primary"
            >
              <option value="">{t('প্রজেক্ট ছাড়া', 'No project')}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('পোস্ট সম্পর্কে নোট...', 'Note about this post...')}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-heading-bn text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-input text-sm font-heading-bn text-foreground hover:bg-secondary transition-colors"
            >
              {t('বাতিল', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!date || saving}
              className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-heading-bn font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? t('সংরক্ষণ...', 'Saving...') : t('যোগ করুন', 'Add')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScheduleModal;
