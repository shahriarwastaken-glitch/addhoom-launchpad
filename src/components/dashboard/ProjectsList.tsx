import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  FolderOpen, Plus, Archive, MoreVertical, Pencil, Trash2,
  CalendarDays, Trophy, Star, ArrowRight, Check, X, FolderArchive, RotateCcw,
  Target, Flame, ShoppingBag, PartyPopper, Sparkles, Briefcase, Megaphone, Rocket, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const toBn = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const COLORS = [
  '#FF5100', '#00B96B', '#6C3FE8', '#FFB800',
  '#1877F2', '#E4405F', '#1C1B1A', '#00B4D8',
];

const QUICK_ICONS: { key: string; icon: React.ElementType }[] = [
  { key: 'folder', icon: FolderOpen }, { key: 'target', icon: Target }, { key: 'flame', icon: Flame },
  { key: 'shopping', icon: ShoppingBag }, { key: 'party', icon: PartyPopper }, { key: 'sparkles', icon: Sparkles },
  { key: 'briefcase', icon: Briefcase }, { key: 'megaphone', icon: Megaphone }, { key: 'rocket', icon: Rocket },
  { key: 'heart', icon: Heart },
];

const QUICK_NAMES_BN = ['ঈদ কালেকশন', 'নতুন স্টক', 'সিজনাল সেল', 'পণ্য লঞ্চ', 'উইকলি অফার'];
const QUICK_NAMES_EN = ['Eid Collection', 'New Stock', 'Seasonal Sale', 'Product Launch', 'Weekly Offer'];

interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  start_date: string | null;
  end_date: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  ads_count: number;
  avg_score: number;
  winners_count: number;
  best_score: number;
}

const ProjectsList = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEmoji, setFormEmoji] = useState('📁');
  const [formColor, setFormColor] = useState('#FF5100');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const dn = (n: number) => lang === 'bn' ? toBn(n) : n;

  useEffect(() => {
    if (activeWorkspace) fetchProjects();
  }, [activeWorkspace, tab]);

  const fetchProjects = async () => {
    if (!activeWorkspace) return;
    setLoading(true);

    // Fetch projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .eq('is_archived', tab === 'archived')
      .order('updated_at', { ascending: false });

    if (!projectsData) { setProjects([]); setLoading(false); return; }

    // Fetch ad stats per project
    const projectIds = projectsData.map(p => p.id);
    const { data: ads } = await supabase
      .from('ad_creatives')
      .select('id, project_id, dhoom_score, is_winner')
      .in('project_id', projectIds.length > 0 ? projectIds : ['__none__']);

    const statsMap: Record<string, { count: number; totalScore: number; winners: number; best: number }> = {};
    (ads || []).forEach(ad => {
      if (!ad.project_id) return;
      if (!statsMap[ad.project_id]) statsMap[ad.project_id] = { count: 0, totalScore: 0, winners: 0, best: 0 };
      const s = statsMap[ad.project_id];
      s.count++;
      s.totalScore += ad.dhoom_score || 0;
      if (ad.is_winner) s.winners++;
      if ((ad.dhoom_score || 0) > s.best) s.best = ad.dhoom_score || 0;
    });

    const enriched: Project[] = projectsData.map(p => ({
      ...p,
      ads_count: statsMap[p.id]?.count || 0,
      avg_score: statsMap[p.id]?.count ? Math.round(statsMap[p.id].totalScore / statsMap[p.id].count) : 0,
      winners_count: statsMap[p.id]?.winners || 0,
      best_score: statsMap[p.id]?.best || 0,
    }));

    setProjects(enriched);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditProject(null);
    setFormName(''); setFormDesc(''); setFormEmoji('📁'); setFormColor('#FF5100');
    setFormStartDate(''); setFormEndDate('');
    setShowModal(true);
  };

  const openEditModal = (p: Project) => {
    setEditProject(p);
    setFormName(p.name); setFormDesc(p.description || ''); setFormEmoji(p.emoji || '📁');
    setFormColor(p.color || '#FF5100');
    setFormStartDate(p.start_date || ''); setFormEndDate(p.end_date || '');
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!activeWorkspace || !formName.trim()) {
      toast.error(t('নাম দিন', 'Enter a name'));
      return;
    }

    if (editProject) {
      const { error } = await supabase.from('projects').update({
        name: formName.trim(),
        description: formDesc.trim() || null,
        emoji: formEmoji,
        color: formColor,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
      }).eq('id', editProject.id);

      if (error) { toast.error(t('সমস্যা হয়েছে', 'Something went wrong')); return; }
      toast.success(t('প্রজেক্ট আপডেট হয়েছে', 'Project updated'));
    } else {
      const { error } = await supabase.from('projects').insert({
        workspace_id: activeWorkspace.id,
        name: formName.trim(),
        description: formDesc.trim() || null,
        emoji: formEmoji,
        color: formColor,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
      });

      if (error) { toast.error(t('সমস্যা হয়েছে', 'Something went wrong')); return; }
      toast.success(t('প্রজেক্ট তৈরি হয়েছে!', 'Project created!'));
    }

    setShowModal(false);
    fetchProjects();
  };

  const handleArchive = async (id: string, archive: boolean) => {
    await supabase.from('projects').update({ is_archived: archive }).eq('id', id);
    toast.success(archive ? t('আর্কাইভ হয়েছে', 'Archived') : t('পুনরুদ্ধার হয়েছে', 'Restored'));
    setMenuOpen(null);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    // Unlink ads first
    await supabase.from('ad_creatives').update({ project_id: null } as any).eq('project_id', id);
    await supabase.from('projects').delete().eq('id', id);
    toast.success(t('প্রজেক্ট মুছে ফেলা হয়েছে', 'Project deleted'));
    setDeleteConfirm(null);
    setMenuOpen(null);
    fetchProjects();
  };

  const getDaysRemaining = (endDate: string) => {
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const parts = [];
    if (start) parts.push(new Date(start + 'T00:00:00').toLocaleDateString(locale, opts));
    if (end) parts.push(new Date(end + 'T00:00:00').toLocaleDateString(locale, opts));
    return parts.join(' — ');
  };

  const scoreColor = (s: number) => s >= 70 ? 'text-[#00B96B]' : s >= 50 ? 'text-[#D97706]' : 'text-destructive';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-heading-bn font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="text-primary" size={28} />
            {t('প্রজেক্ট', 'Projects')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('বিজ্ঞাপনগুলো সাজিয়ে রাখুন', 'Organize your ads')}</p>
        </div>
        <button onClick={openCreateModal}
          className="bg-gradient-cta text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform flex items-center gap-1.5 w-full sm:w-auto justify-center">
          <Plus size={16} /> {t('নতুন প্রজেক্ট', 'New Project')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'active' as const, bn: 'সক্রিয়', en: 'Active', icon: FolderOpen },
          { key: 'archived' as const, bn: 'আর্কাইভ করা', en: 'Archived', icon: Archive },
        ].map(t2 => (
          <button key={t2.key} onClick={() => setTab(t2.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === t2.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}>
            <t2.icon size={14} /> {t(t2.bn, t2.en)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{t('লোড হচ্ছে...', 'Loading...')}</div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center text-center py-20 px-4">
          <FolderOpen size={64} className="text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2 font-heading-bn">
            {tab === 'active'
              ? t('এখনো কোনো প্রজেক্ট নেই', 'No projects yet')
              : t('কোনো আর্কাইভ করা প্রজেক্ট নেই', 'No archived projects')}
          </h3>
          {tab === 'active' && (
            <>
              <p className="text-sm text-muted-foreground max-w-[400px] mb-6 leading-relaxed">
                {t(
                  'প্রজেক্ট হলো আপনার বিজ্ঞাপনগুলো সাজিয়ে রাখার ফোল্ডার। যেমন: "ঈদ ২০২৫", "নতুন কালেকশন", "সামার সেল"।',
                  'Projects are folders to organize your ads. E.g. "Eid 2025", "New Collection", "Summer Sale".'
                )}
              </p>
              <button onClick={openCreateModal}
                className="bg-gradient-cta text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform">
                {t('প্রথম প্রজেক্ট তৈরি করুন', 'Create your first project')}
              </button>
            </>
          )}
        </div>
      ) : (
        /* Projects grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-[20px] border border-border overflow-hidden cursor-pointer transition-all duration-250 hover:-translate-y-1 hover:shadow-warm-lg group ${
                tab === 'archived' ? 'opacity-70 grayscale-[20%]' : ''
              }`}
              onClick={() => navigate(`/dashboard/projects/${p.id}`)}
            >
              {/* Color bar */}
              <div className="h-1.5 w-full" style={{ background: p.color || '#FF5100' }} />

              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{p.emoji || '📁'}</span>
                    <h3 className="font-heading-bn font-bold text-foreground text-lg truncate">{p.name}</h3>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                      className="p-1.5 rounded-lg hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                    {menuOpen === p.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl border border-border shadow-warm-lg z-50 py-1"
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditModal(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2">
                          <Pencil size={14} /> {t('সম্পাদনা করুন', 'Edit')}
                        </button>
                        {!p.is_archived ? (
                          <button onClick={() => handleArchive(p.id, true)} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2">
                            <FolderArchive size={14} /> {t('আর্কাইভ করুন', 'Archive')}
                          </button>
                        ) : (
                          <button onClick={() => handleArchive(p.id, false)} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2">
                            <RotateCcw size={14} /> {t('পুনরুদ্ধার করুন', 'Restore')}
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(p.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-destructive">
                          <Trash2 size={14} /> {t('মুছুন', 'Delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Archived badge */}
                {p.is_archived && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full mb-2">
                    <Archive size={10} /> {t('আর্কাইভ করা', 'Archived')}
                  </span>
                )}

                {/* Description */}
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                )}

                {/* Date range */}
                {(p.start_date || p.end_date) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <CalendarDays size={12} className="text-muted-foreground" />
                    {p.end_date && getDaysRemaining(p.end_date) < 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#00B96B]/10 text-[#00B96B] font-medium">
                        {t('সম্পন্ন', 'Completed')}
                      </span>
                    ) : p.end_date && getDaysRemaining(p.end_date) <= 7 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {t(`${toBn(getDaysRemaining(p.end_date))} দিন বাকি`, `${getDaysRemaining(p.end_date)} days left`)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDateRange(p.start_date, p.end_date)}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="border-t border-border mt-4 pt-3 flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold font-mono text-foreground">{dn(p.ads_count)}</div>
                    <div className="text-[10px] text-muted-foreground">{t('বিজ্ঞাপন', 'Ads')}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className={`text-lg font-bold font-mono ${scoreColor(p.avg_score)}`}>{dn(p.avg_score)}</div>
                    <div className="text-[10px] text-muted-foreground">{t('গড় স্কোর', 'Avg Score')}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold font-mono text-foreground flex items-center justify-center gap-0.5">
                      {dn(p.winners_count)} <Star size={12} className="text-[#FFB800]" />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t('বিজয়ী', 'Winners')}</div>
                  </div>
                </div>

                {/* Open button */}
                <div className="border-t border-border mt-3 -mx-5 -mb-5 px-5 py-3 hover:bg-primary/[0.03] transition-colors flex items-center justify-center gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    {t('প্রজেক্ট খুলুন', 'Open Project')}
                  </span>
                  <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-warm-lg" onClick={e => e.stopPropagation()}>
              <h3 className="font-heading-bn font-bold text-foreground text-lg mb-2">{t('প্রজেক্ট মুছে ফেলবেন?', 'Delete project?')}</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {t(
                  'এই প্রজেক্ট এবং এর সাথে সংযুক্ত সব বিজ্ঞাপন লিংক মুছে যাবে। বিজ্ঞাপনগুলো মুছবে না।',
                  'This project and all ad links will be removed. The ads themselves will not be deleted.'
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  {t('বাতিল', 'Cancel')}
                </button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors">
                  {t('মুছুন', 'Delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-card rounded-3xl p-6 max-w-[480px] w-full shadow-warm-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading-bn font-bold text-foreground text-xl">
                  {editProject ? t('প্রজেক্ট সম্পাদনা', 'Edit Project') : t('নতুন প্রজেক্ট', 'New Project')}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Emoji picker */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">{t('আইকন', 'Icon')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_EMOJIS.map(e => (
                    <button key={e} onClick={() => setFormEmoji(e)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        formEmoji === e ? 'bg-primary/10 border-2 border-primary scale-110' : 'bg-secondary hover:bg-secondary/80'
                      }`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t('প্রজেক্টের নাম', 'Project Name')} *
                </label>
                <div className="relative">
                  <input value={formName} onChange={e => setFormName(e.target.value.slice(0, 50))}
                    placeholder={t('যেমন: ঈদ ২০২৫, সামার সেল...', 'e.g. Eid 2025, Summer Sale...')}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                    {lang === 'bn' ? toBn(formName.length) : formName.length}/50
                  </span>
                </div>
                {/* Quick name chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(lang === 'bn' ? QUICK_NAMES_BN : QUICK_NAMES_EN).map(n => (
                    <button key={n} onClick={() => setFormName(n)}
                      className="px-2.5 py-1 rounded-full text-xs bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">
                  {t('বিবরণ (ঐচ্ছিক)', 'Description (optional)')}
                </label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value.slice(0, 200))}
                  placeholder={t('এই প্রজেক্ট কী নিয়ে?', 'What is this project about?')}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" />
              </div>

              {/* Color */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-2 block">{t('রঙ বেছে নিন', 'Choose Color')}</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${formColor === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-card ring-primary' : 'hover:scale-110'}`}
                      style={{ background: c }}>
                      {formColor === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="mb-6">
                <label className="text-xs text-muted-foreground mb-2 block">{t('তারিখ (ঐচ্ছিক)', 'Dates (optional)')}</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{t('শুরুর তারিখ', 'Start Date')}</span>
                  </div>
                  <div className="flex-1">
                    <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{t('শেষের তারিখ', 'End Date')}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  {t('বাতিল', 'Cancel')}
                </button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-full bg-gradient-cta text-primary-foreground text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform">
                  {editProject ? t('সংরক্ষণ করুন', 'Save') : t('তৈরি করুন', 'Create')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  );
};

export default ProjectsList;
