import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Plus, Lock, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import WorkspaceAvatar from './WorkspaceAvatar';
import { WORKSPACE_LIMITS } from './constants';
import { trackEvent } from '@/lib/posthog';

interface WorkspaceSelectorProps {
  onCreateClick: () => void;
}

const WorkspaceSelector = ({ onCreateClick }: WorkspaceSelectorProps) => {
  const { t } = useLanguage();
  const { activeWorkspace, workspaces, setActiveWorkspaceId, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const planKey = profile?.plan_key || 'free';
  const limit = WORKSPACE_LIMITS[planKey] ?? 1;
  const atLimit = workspaces.length >= limit;

  const handleSwitch = (ws: any) => {
    if (ws.id === activeWorkspace?.id) {
      setOpen(false);
      return;
    }
    setActiveWorkspaceId(ws.id);
    setOpen(false);
    toast.success(t(`"${ws.shop_name}"-এ স্যুইচ করা হয়েছে`, `Switched to "${ws.shop_name}"`));
  };

  const handleCreate = () => {
    setOpen(false);
    onCreateClick();
  };

  return (
    <div className="relative min-w-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors min-w-0 max-w-[200px]"
      >
        <WorkspaceAvatar
          color={activeWorkspace?.color}
          iconName={activeWorkspace?.icon_name}
          size={28}
        />
        <span className="text-sm font-semibold truncate hidden sm:block">
          {activeWorkspace?.shop_name || t('শপ', 'Shop')}
        </span>
        <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-2xl shadow-lg w-[280px] p-2">
            {/* Header */}
            <div className="px-3 py-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {t('আপনার ওয়ার্কস্পেস', 'Your Workspaces')}
              </span>
            </div>

            {/* Workspace list */}
            <div className="max-h-[240px] overflow-y-auto space-y-0.5">
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <WorkspaceAvatar color={ws.color} iconName={ws.icon_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{ws.shop_name}</p>
                    {ws.industry && (
                      <p className="text-xs text-muted-foreground truncate">{ws.industry}</p>
                    )}
                  </div>
                  {ws.id === activeWorkspace?.id && (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border my-1" />

            {/* New workspace */}
            <button
              onClick={handleCreate}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
            >
              {atLimit ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Lock size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{t('আপগ্রেড করুন', 'Upgrade to add more')}</p>
                    <p className="text-xs text-muted-foreground">{workspaces.length}/{limit} {t('ব্যবহৃত', 'used')}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Plus size={16} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{t('নতুন ওয়ার্কস্পেস', 'New Workspace')}</p>
                </>
              )}
            </button>

            <div className="border-t border-border my-1" />

            {/* Manage link */}
            <button
              onClick={() => { setOpen(false); navigate('/dashboard/workspaces'); }}
              className="w-full px-3 py-2 text-left text-[13px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Settings2 size={14} />
              {t('ওয়ার্কস্পেস পরিচালনা →', 'Manage Workspaces →')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceSelector;
