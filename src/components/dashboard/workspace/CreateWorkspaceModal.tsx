import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import WorkspaceAvatar from './WorkspaceAvatar';
import { PRESET_COLORS, PRESET_ICONS, INDUSTRIES, PLATFORMS, LANGUAGES, WORKSPACE_LIMITS } from './constants';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { trackEvent } from '@/lib/posthog';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  editWorkspace?: any;
}

const CreateWorkspaceModal = ({ open, onClose, editWorkspace }: CreateWorkspaceModalProps) => {
  const { t } = useLanguage();
  const { user, profile, workspaces, refreshProfile, setActiveWorkspaceId } = useAuth();
  const { showUpgrade } = useUpgrade();
  const isEdit = !!editWorkspace;

  const [name, setName] = useState(editWorkspace?.shop_name || '');
  const [color, setColor] = useState(editWorkspace?.color || '#FF5100');
  const [iconName, setIconName] = useState(editWorkspace?.icon_name || 'store');
  const [industry, setIndustry] = useState(editWorkspace?.industry || '');
  const [platform, setPlatform] = useState(editWorkspace?.primary_platform || editWorkspace?.platform || '');
  const [language, setLanguage] = useState(editWorkspace?.default_language || 'en');
  const [saving, setSaving] = useState(false);

  const planKey = profile?.plan_key || 'free';
  const limit = WORKSPACE_LIMITS[planKey] ?? 1;
  const atLimit = !isEdit && workspaces.length >= limit;

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('নাম দিন', 'Please enter a name'));
      return;
    }
    if (atLimit) {
      showUpgrade();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await supabase.from('workspaces').update({
          shop_name: name.trim(),
          color,
          icon_name: iconName,
          industry: industry || null,
          primary_platform: platform || null,
          default_language: language,
        }).eq('id', editWorkspace.id);
        toast.success(t('ওয়ার্কস্পেস আপডেট হয়েছে', 'Workspace updated'));
      } else {
        const { data, error } = await supabase.from('workspaces').insert({
          owner_id: user!.id,
          shop_name: name.trim(),
          color,
          icon_name: iconName,
          industry: industry || null,
          primary_platform: platform || null,
          default_language: language,
          language: language === 'bn' ? 'bn' : 'en',
        }).select().single();
        if (error) throw error;
        if (data) {
          setActiveWorkspaceId(data.id);
          trackEvent('workspace_created', { industry: industry || 'unknown', platform: platform || 'unknown' });
          toast.success(t(`"${name}" ওয়ার্কস্পেস তৈরি হয়েছে`, `"${name}" workspace created`));
        }
      }
      await refreshProfile();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-card rounded-3xl w-full max-w-[480px] p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>

          <h2 className="text-xl font-bold text-foreground">
            {isEdit ? t('ওয়ার্কস্পেস এডিট', 'Edit Workspace') : t('নতুন ওয়ার্কস্পেস', 'New Workspace')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {isEdit ? t('ওয়ার্কস্পেস তথ্য আপডেট করুন', 'Update workspace details') : t('নতুন শপ বা ব্র্যান্ড সেটআপ করুন', 'Set up a new shop or brand')}
          </p>

          {/* Name */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">{t('শপ বা ব্র্যান্ডের নাম', 'Shop or brand name')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Fashion Store"
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t('অ্যাভাটার', 'Avatar')}</label>
              <div className="flex items-start gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-xs text-muted-foreground">{t('রং', 'Color')}</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t('আইকন', 'Icon')}</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map(ic => (
                      <button
                        key={ic}
                        onClick={() => setIconName(ic)}
                        className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center transition-all ${iconName === ic ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:bg-secondary/80'}`}
                      >
                        <WorkspaceAvatar color="transparent" iconName={ic} size={20} className="!bg-transparent [&_svg]:text-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-muted-foreground">{t('প্রিভিউ', 'Preview')}</p>
                  <WorkspaceAvatar color={color} iconName={iconName} size={48} />
                </div>
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="text-sm font-medium text-foreground">{t('কী বিক্রি করেন?', 'What do you sell?')}</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      industry === ind
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-sm font-medium text-foreground">{t('প্রাইমারি প্ল্যাটফর্ম', 'Primary platform')}</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p.toLowerCase())}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      platform === p.toLowerCase()
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium text-foreground">{t('ডিফল্ট অ্যাড ভাষা', 'Default ad language')}</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      language === lang.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {isEdit && (
              <button
                onClick={() => { onClose(); /* navigate to shop DNA */ }}
                className="text-sm text-primary hover:underline"
              >
                {t('শপ DNA এডিট করুন →', 'Edit Shop DNA →')}
              </button>
            )}
          </div>

          <div className="mt-8 space-y-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !name.trim()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? '...' : isEdit ? t('পরিবর্তন সংরক্ষণ করুন →', 'Save Changes →') : t('ওয়ার্কস্পেস তৈরি করুন →', 'Create Workspace →')}
            </button>
            <button
              onClick={onClose}
              className="w-full text-muted-foreground hover:text-foreground text-sm py-2 transition-colors"
            >
              {t('বাতিল', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateWorkspaceModal;
