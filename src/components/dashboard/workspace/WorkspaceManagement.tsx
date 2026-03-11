import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Pencil, Star, Trash2, ArrowRight, Lock, Image, FileText, Video, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpgrade } from '@/contexts/UpgradeContext';
import WorkspaceAvatar from './WorkspaceAvatar';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import DeleteWorkspaceModal from './DeleteWorkspaceModal';
import { WORKSPACE_LIMITS } from './constants';

interface WorkspaceStats {
  images: number;
  ads: number;
  videos: number;
}

const WorkspaceManagement = () => {
  const { t } = useLanguage();
  const { user, profile, workspaces, activeWorkspace, setActiveWorkspaceId, refreshProfile } = useAuth();
  const { showUpgrade } = useUpgrade();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editWs, setEditWs] = useState<any>(null);
  const [deleteWs, setDeleteWs] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, WorkspaceStats>>({});

  const planKey = profile?.plan_key || 'free';
  const limit = WORKSPACE_LIMITS[planKey] ?? 1;
  const atLimit = workspaces.length >= limit;

  // Fetch stats for all workspaces
  useEffect(() => {
    if (!workspaces.length) return;
    const fetchStats = async () => {
      const newStats: Record<string, WorkspaceStats> = {};
      for (const ws of workspaces) {
        const [{ count: imgCount }, { count: adCount }, { count: vidCount }] = await Promise.all([
          supabase.from('ad_images').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id),
          supabase.from('ad_creatives').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id),
          supabase.from('video_ads').select('*', { count: 'exact', head: true }).eq('workspace_id', ws.id),
        ]);
        newStats[ws.id] = { images: imgCount || 0, ads: adCount || 0, videos: vidCount || 0 };
      }
      setStats(newStats);
    };
    fetchStats();
  }, [workspaces]);

  const handleSetDefault = async (ws: any) => {
    setMenuOpen(null);
    try {
      // Clear all defaults first
      await supabase.from('workspaces').update({ is_default: false }).eq('owner_id', user!.id);
      await supabase.from('workspaces').update({ is_default: true }).eq('id', ws.id);
      await refreshProfile();
      toast.success(t(`"${ws.shop_name}" ডিফল্ট সেট হয়েছে`, `"${ws.shop_name}" set as default`));
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleOpen = (ws: any) => {
    setActiveWorkspaceId(ws.id);
    toast.success(t(`"${ws.shop_name}"-এ স্যুইচ করা হয়েছে`, `Switched to "${ws.shop_name}"`));
    navigate('/dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('ওয়ার্কস্পেস', 'Workspaces')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('আপনার শপ ও ব্র্যান্ড পরিচালনা করুন', 'Manage your shops and brands')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            {workspaces.length}/{limit === Infinity ? '∞' : limit} {t('ব্যবহৃত', 'used')}
          </span>
          <button
            onClick={() => atLimit ? showUpgrade() : setShowCreate(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              atLimit
                ? 'bg-secondary text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {atLimit ? <Lock size={14} /> : <Plus size={14} />}
            {t('নতুন ওয়ার্কস্পেস', 'New Workspace')}
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map(ws => {
          const isActive = ws.id === activeWorkspace?.id;
          const wsStats = stats[ws.id] || { images: 0, ads: 0, videos: 0 };

          return (
            <div
              key={ws.id}
              className={`relative bg-card rounded-2xl p-6 transition-colors ${
                isActive
                  ? 'border-[1.5px] border-primary bg-primary/[0.02]'
                  : 'border border-border'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start gap-4">
                <WorkspaceAvatar color={ws.color} iconName={ws.icon_name} size={48} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate">{ws.shop_name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ws.industry && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{ws.industry}</span>
                    )}
                    {(ws.primary_platform || ws.platform) && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{ws.primary_platform || ws.platform}</span>
                    )}
                  </div>
                </div>

                {/* Menu */}
                <div className="relative">
                  <button onClick={() => setMenuOpen(menuOpen === ws.id ? null : ws.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                    <MoreVertical size={16} />
                  </button>
                  {menuOpen === ws.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px]">
                        <button onClick={() => { setMenuOpen(null); setEditWs(ws); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left">
                          <Pencil size={14} /> {t('এডিট', 'Edit')}
                        </button>
                        <button onClick={() => { setMenuOpen(null); navigate('/dashboard/settings'); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left">
                          <Layers size={14} /> {t('শপ DNA এডিট', 'Edit Shop DNA')}
                        </button>
                        <button
                          onClick={() => handleSetDefault(ws)}
                          disabled={ws.is_default}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left disabled:opacity-40"
                        >
                          <Star size={14} /> {t('ডিফল্ট সেট করুন', 'Set as default')}
                        </button>
                        <button
                          onClick={() => { setMenuOpen(null); setDeleteWs(ws); }}
                          disabled={ws.is_default || workspaces.length <= 1}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary text-left disabled:opacity-40"
                        >
                          <Trash2 size={14} /> {t('ডিলিট', 'Delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 text-muted-foreground">
                <span className="flex items-center gap-1.5 text-xs"><Image size={13} /> {wsStats.images}</span>
                <span className="flex items-center gap-1.5 text-xs"><FileText size={13} /> {wsStats.ads}</span>
                <span className="flex items-center gap-1.5 text-xs"><Video size={13} /> {wsStats.videos}</span>
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div>
                  {ws.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      <Star size={12} /> {t('ডিফল্ট', 'Default')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleOpen(ws)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('খুলুন', 'Open')} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty/Add card */}
        {workspaces.length < 3 && (
          <button
            onClick={() => atLimit ? showUpgrade() : setShowCreate(true)}
            className="border border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          >
            {atLimit ? (
              <>
                <Lock size={24} />
                <span className="text-sm font-medium">{t('আপগ্রেড করে আরো যোগ করুন', 'Upgrade to add more')}</span>
              </>
            ) : (
              <>
                <Plus size={24} />
                <span className="text-sm font-medium">{t('আরেকটি ওয়ার্কস্পেস যোগ করুন', 'Add another workspace')}</span>
                <span className="text-xs">{t('আপনার ব্র্যান্ড আলাদা করুন', 'Separate your brands and shops')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      {editWs && (
        <CreateWorkspaceModal
          open={!!editWs}
          onClose={() => setEditWs(null)}
          editWorkspace={editWs}
        />
      )}
      <DeleteWorkspaceModal
        open={!!deleteWs}
        onClose={() => setDeleteWs(null)}
        workspace={deleteWs}
      />
    </div>
  );
};

export default WorkspaceManagement;
