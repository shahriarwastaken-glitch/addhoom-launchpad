import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  workspace: any;
}

const DeleteWorkspaceModal = ({ open, onClose, workspace }: DeleteWorkspaceModalProps) => {
  const { t } = useLanguage();
  const { workspaces, setActiveWorkspaceId, refreshProfile } = useAuth();
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!open || !workspace) return null;

  const canDelete = confirmName === workspace.shop_name;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      // Soft delete
      await supabase.from('workspaces').update({ deleted_at: new Date().toISOString() }).eq('id', workspace.id);

      // Switch to another workspace
      const remaining = workspaces.filter(w => w.id !== workspace.id);
      const defaultWs = remaining.find((w: any) => w.is_default) || remaining[0];
      if (defaultWs) setActiveWorkspaceId(defaultWs.id);

      await refreshProfile();
      toast.success(t('ওয়ার্কস্পেস ডিলিট হয়েছে', 'Workspace deleted'));
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-[440px] p-6 sm:p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
        </div>

        <h2 className="text-lg font-bold text-center text-foreground">
          {t(`"${workspace.shop_name}" ডিলিট করবেন?`, `Delete "${workspace.shop_name}"?`)}
        </h2>

        <p className="text-sm text-muted-foreground text-center mt-3">
          {t(
            'এটি এই ওয়ার্কস্পেস এবং এর সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলবে — জেনারেট করা ছবি, অ্যাড কপি এবং ভিডিও সহ।',
            'This will permanently delete this workspace and all its data including generated images, ad copy, and videos.'
          )}
        </p>
        <p className="text-sm text-destructive font-medium text-center mt-1">
          {t('এটি পূর্বাবস্থায় ফেরানো যাবে না।', 'This cannot be undone.')}
        </p>

        <div className="mt-5">
          <label className="text-sm font-medium text-foreground">
            {t('নিশ্চিত করতে ওয়ার্কস্পেসের নাম টাইপ করুন:', 'Type the workspace name to confirm:')}
          </label>
          <input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={workspace.shop_name}
            className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
          />
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="w-full bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-40 hover:bg-destructive/90 transition-colors"
          >
            {deleting ? '...' : t('ওয়ার্কস্পেস ডিলিট করুন', 'Delete Workspace')}
          </button>
          <button onClick={onClose} className="w-full text-muted-foreground hover:text-foreground text-sm py-2 transition-colors">
            {t('বাতিল', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWorkspaceModal;
