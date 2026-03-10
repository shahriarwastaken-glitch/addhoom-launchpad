import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Pencil, Plus, FolderOpen, Star, Trophy, Zap, Flame,
  TrendingUp, Copy, RefreshCw, Check, X, Search, Filter,
  Target, ShoppingBag, PartyPopper, Sparkles, Briefcase, Megaphone, Rocket, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const toBn = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const ICON_MAP: Record<string, React.ElementType> = {
  folder: FolderOpen, target: Target, flame: Flame, shopping: ShoppingBag,
  party: PartyPopper, sparkles: Sparkles, briefcase: Briefcase, megaphone: Megaphone,
  rocket: Rocket, heart: Heart,
};

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  start_date: string | null;
  end_date: string | null;
  workspace_id: string;
}

interface AdCreative {
  id: string;
  headline: string | null;
  body: string | null;
  cta: string | null;
  dhoom_score: number | null;
  platform: string | null;
  framework: string | null;
  is_winner: boolean;
  created_at: string;
  project_id: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [ads, setAds] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'recent' | 'best' | 'winners'>('recent');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showAdPicker, setShowAdPicker] = useState(false);
  const [unlinkedAds, setUnlinkedAds] = useState<AdCreative[]>([]);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const dn = (n: number) => lang === 'bn' ? toBn(n) : n;

  useEffect(() => {
    if (id && activeWorkspace) fetchData();
  }, [id, activeWorkspace]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: proj }, { data: adsData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('ad_creatives').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ]);

    setProject(proj);
    setAds(adsData || []);
    setLoading(false);
  };

  const sortedAds = [...ads].sort((a, b) => {
    if (sort === 'best') return (b.dhoom_score || 0) - (a.dhoom_score || 0);
    if (sort === 'winners') return (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).filter(a => filterPlatform === 'all' || a.platform === filterPlatform);

  const platforms = [...new Set(ads.map(a => a.platform).filter(Boolean))];
  const totalAds = ads.length;
  const avgScore = totalAds ? Math.round(ads.reduce((s, a) => s + (a.dhoom_score || 0), 0) / totalAds) : 0;
  const winners = ads.filter(a => a.is_winner).length;
  const bestScore = totalAds ? Math.max(...ads.map(a => a.dhoom_score || 0)) : 0;

  const scoreColor = (s: number) => s >= 70 ? 'text-[#00B96B]' : s >= 50 ? 'text-[#D97706]' : 'text-destructive';

  const toggleWinner = async (ad: AdCreative) => {
    const newVal = !ad.is_winner;
    await supabase.from('ad_creatives').update({ is_winner: newVal }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_winner: newVal } : a));
    toast.success(newVal ? t('বিজয়ী চিহ্নিত!', 'Marked as winner!') : t('বিজয়ী সরানো হয়েছে', 'Removed winner'));
  };

  const removeFromProject = async (adId: string) => {
    await supabase.from('ad_creatives').update({ project_id: null } as any).eq('id', adId);
    setAds(prev => prev.filter(a => a.id !== adId));
    toast.success(t('প্রজেক্ট থেকে সরানো হয়েছে', 'Removed from project'));
  };

  const copySingle = (ad: AdCreative) => {
    const text = `${ad.headline || ''}\n\n${ad.body || ''}\n\n${ad.cta || ''}`.trim();
    navigator.clipboard.writeText(text);
    setCopiedId(ad.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAdPicker = async () => {
    if (!activeWorkspace) return;
    const { data } = await supabase
      .from('ad_creatives')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .is('project_id', null)
      .order('created_at', { ascending: false })
      .limit(50);
    setUnlinkedAds(data || []);
    setSelectedAds(new Set());
    setShowAdPicker(true);
  };

  const addAdsToProject = async () => {
    if (!id || selectedAds.size === 0) return;
    const ids = [...selectedAds];
    for (const adId of ids) {
      await supabase.from('ad_creatives').update({ project_id: id } as any).eq('id', adId);
    }
    toast.success(lang === 'bn' ? `${toBn(ids.length)}টি বিজ্ঞাপন যোগ হয়েছে` : `${ids.length} ads added`);
    setShowAdPicker(false);
    fetchData();
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">{t('লোড হচ্ছে...', 'Loading...')}</div>;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">{t('প্রজেক্ট পাওয়া যায়নি', 'Project not found')}</p>
        <button onClick={() => navigate('/dashboard/projects')} className="text-primary text-sm font-medium">
          {t('ফিরে যান', 'Go back')}
        </button>
      </div>
    );
  }

  const getDaysRemaining = (endDate: string) => Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/dashboard/projects')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
        <ArrowLeft size={14} /> {t('প্রজেক্ট', 'Projects')}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3">
            {(() => { const PIco = ICON_MAP[project.emoji || 'folder'] || FolderOpen; return <PIco size={28} className="text-primary" />; })()}
            <h2 className="text-2xl font-heading-bn font-bold text-foreground">{project.name}</h2>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 ml-12">{project.description}</p>
          )}
          {project.end_date && (
            <div className="ml-12 mt-1">
              {getDaysRemaining(project.end_date) < 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00B96B]/10 text-[#00B96B] font-medium">{t('সম্পন্ন', 'Completed')}</span>
              ) : getDaysRemaining(project.end_date) <= 7 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {lang === 'bn' ? `${toBn(getDaysRemaining(project.end_date))} দিন বাকি` : `${getDaysRemaining(project.end_date)} days left`}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => navigate(`/dashboard/projects`)}
            className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-secondary flex items-center gap-1.5">
            <Pencil size={14} /> {t('সম্পাদনা', 'Edit')}
          </button>
          <button onClick={() => navigate(`/dashboard/generate?project_id=${project.id}`)}
            className="flex-1 sm:flex-initial bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform flex items-center gap-1.5 justify-center">
            <Plus size={16} /> {t('বিজ্ঞাপন তৈরি', 'Create Ad')}
          </button>
        </div>
      </div>

      {/* Color bar */}
      <div className="h-1 w-full rounded-full mb-6" style={{ background: project.color || '#FF5100' }} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('মোট বিজ্ঞাপন', 'Total Ads'), value: dn(totalAds), suffix: t('টি', ''), color: 'text-foreground' },
          { label: t('গড় ধুম স্কোর', 'Avg Dhoom Score'), value: dn(avgScore), suffix: '', color: scoreColor(avgScore) },
          { label: t('বিজয়ী বিজ্ঞাপন', 'Winner Ads'), value: dn(winners), suffix: '', color: 'text-foreground' },
          { label: t('সেরা স্কোর', 'Best Score'), value: dn(bestScore), suffix: '', color: scoreColor(bestScore) },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-4">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value} {stat.suffix}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Ads section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-heading-bn font-bold text-foreground text-lg">{t('বিজ্ঞাপনসমূহ', 'Ads')}</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'recent' as const, bn: 'সাম্প্রতিক', en: 'Recent' },
            { key: 'best' as const, bn: 'সেরা স্কোর', en: 'Best Score' },
            { key: 'winners' as const, bn: 'বিজয়ী আগে', en: 'Winners First' },
          ].map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sort === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
              {t(s.bn, s.en)}
            </button>
          ))}
        </div>
      </div>

      {/* Platform filters */}
      {platforms.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button onClick={() => setFilterPlatform('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterPlatform === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
            {t('সব', 'All')}
          </button>
          {platforms.map(p => (
            <button key={p} onClick={() => setFilterPlatform(p!)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filterPlatform === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sortedAds.length === 0 && !loading ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FolderOpen size={48} className="text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">{t('এই প্রজেক্টে এখনো কোনো বিজ্ঞাপন নেই', 'No ads in this project yet')}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => navigate(`/dashboard/generate?project_id=${project.id}`)}
              className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow inline-flex items-center gap-1.5 justify-center">
              <Zap size={14} /> {t('নতুন বিজ্ঞাপন তৈরি করুন', 'Create New Ad')}
            </button>
            <button onClick={openAdPicker}
              className="rounded-full px-5 py-2 text-sm font-medium border border-border text-foreground hover:bg-secondary inline-flex items-center gap-1.5 justify-center">
              <FolderOpen size={14} /> {t('বিদ্যমান বিজ্ঞাপন যোগ করুন', 'Add Existing Ads')}
            </button>
          </div>
        </div>
      ) : (
        /* Ad cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedAds.map((ad, i) => {
            const score = ad.dhoom_score || 0;
            const scoreInfo = score >= 70
              ? { icon: <Flame size={14} />, text: `${score}`, color: '#00B96B' }
              : score >= 50
                ? { icon: <TrendingUp size={14} />, text: `${score}`, color: '#D97706' }
                : { icon: <Zap size={14} />, text: `${score}`, color: 'hsl(var(--destructive))' };

            return (
              <motion.div key={ad.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-card rounded-2xl border p-5 transition-all ${ad.is_winner ? 'border-[#FFB800]' : 'border-border'}`}>
                {ad.is_winner && (
                  <div className="flex items-center gap-1 text-[11px] text-[#FFB800] font-semibold mb-2">
                    <Star size={12} className="fill-current" /> {t('বিজয়ী', 'Winner')}
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground capitalize">{ad.platform}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold inline-flex items-center gap-1"
                    style={{ background: `${scoreInfo.color}15`, color: scoreInfo.color }}>
                    {scoreInfo.icon} {scoreInfo.text}
                  </span>
                </div>
                {ad.headline && (
                  <div className="bg-primary/[0.04] border-l-[3px] border-primary rounded-r-lg px-3 py-2 mb-2">
                    <p className="text-sm font-semibold text-foreground">{ad.headline}</p>
                  </div>
                )}
                {ad.body && <p className="text-sm text-foreground/80 line-clamp-3 mb-2">{ad.body}</p>}
                {ad.cta && <p className="text-xs text-primary font-semibold mb-3">{ad.cta}</p>}

                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => copySingle(ad)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary transition-colors flex items-center gap-1">
                    {copiedId === ad.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === ad.id ? t('কপি হয়েছে', 'Copied') : t('কপি', 'Copy')}
                  </button>
                  <button onClick={() => toggleWinner(ad)}
                    className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                      ad.is_winner ? 'border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]' : 'border-border hover:bg-secondary'
                    }`}>
                    <Trophy size={12} /> {ad.is_winner ? t('বিজয়ী ✓', 'Winner ✓') : t('বিজয়ী', 'Winner')}
                  </button>
                  <button onClick={() => navigate(`/dashboard/generate`)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary transition-colors flex items-center gap-1">
                    <RefreshCw size={12} /> {t('রিমিক্স', 'Remix')}
                  </button>
                  <button onClick={() => removeFromProject(ad.id)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-1">
                    <X size={12} /> {t('সরান', 'Remove')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating add button */}
      {sortedAds.length > 0 && (
        <div className="flex gap-2 mt-6 justify-center">
          <button onClick={openAdPicker}
            className="px-5 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary flex items-center gap-1.5">
            <FolderOpen size={14} /> {t('বিদ্যমান বিজ্ঞাপন যোগ করুন', 'Add Existing Ads')}
          </button>
        </div>
      )}

      {/* Ad Picker Modal */}
      <AnimatePresence>
        {showAdPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAdPicker(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-card rounded-3xl p-6 max-w-lg w-full shadow-warm-lg max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading-bn font-bold text-foreground text-lg">{t('বিজ্ঞাপন বেছে নিন', 'Select Ads')}</h3>
                <button onClick={() => setShowAdPicker(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {unlinkedAds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('কোনো আনলিংকড বিজ্ঞাপন নেই', 'No unlinked ads available')}</p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {unlinkedAds.map(ad => (
                    <button key={ad.id}
                      onClick={() => setSelectedAds(prev => {
                        const n = new Set(prev);
                        n.has(ad.id) ? n.delete(ad.id) : n.add(ad.id);
                        return n;
                      })}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        selectedAds.has(ad.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                      }`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedAds.has(ad.id) ? 'border-primary bg-primary' : 'border-border'
                        }`}>
                          {selectedAds.has(ad.id) && <Check size={12} className="text-primary-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ad.headline || t('বিজ্ঞাপন', 'Ad')}</p>
                          <p className="text-xs text-muted-foreground truncate">{ad.body?.slice(0, 80)}</p>
                          <div className="flex gap-1.5 mt-1">
                            {ad.platform && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded capitalize">{ad.platform}</span>}
                            {ad.dhoom_score && <span className="text-[10px] text-primary font-mono">{ad.dhoom_score}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={addAdsToProject} disabled={selectedAds.size === 0}
                className="w-full py-2.5 rounded-full bg-gradient-cta text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all">
                {lang === 'bn' ? `${toBn(selectedAds.size)}টি যোগ করুন` : `Add ${selectedAds.size} ads`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectDetail;
