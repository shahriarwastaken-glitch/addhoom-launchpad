import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Save, Loader2, Check, X, RefreshCw, Globe, Store, Factory,
  MessageSquare, Target, Package, Star, DollarSign, Tags, Plus,
} from 'lucide-react';
import WorkspaceAvatar from '@/components/dashboard/workspace/WorkspaceAvatar';
import { PRESET_COLORS, PRESET_ICONS, INDUSTRIES, PLATFORMS } from '@/components/dashboard/workspace/constants';
import DeleteWorkspaceModal from '@/components/dashboard/workspace/DeleteWorkspaceModal';
import DNAScoreIndicator from '@/components/dashboard/DNAScoreIndicator';

const TONES = ['Friendly', 'Bold', 'Professional', 'Urgent', 'Playful', 'Elegant'];

const WorkspaceTab = () => {
  const { t } = useLanguage();
  const { user, profile, activeWorkspace, workspaces, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Workspace details
  const [shopName, setShopName] = useState('');
  const [color, setColor] = useState('#FF5100');
  const [iconName, setIconName] = useState('store');
  const [industry, setIndustry] = useState('');
  const [platform, setPlatform] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Defaults
  const [defaultLang, setDefaultLang] = useState('en');
  const [defaultPlatform, setDefaultPlatform] = useState('facebook');
  const [defaultTone, setDefaultTone] = useState('friendly');
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsStatus, setDefaultsStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Shop DNA
  const [brandTone, setBrandTone] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyProducts, setKeyProducts] = useState('');
  const [uniqueSelling, setUniqueSelling] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [dnaSource, setDnaSource] = useState('manual');
  const [extractionQuality, setExtractionQuality] = useState('manual');
  const [shopUrl, setShopUrl] = useState('');
  const [savingDna, setSavingDna] = useState(false);
  const [dnaStatus, setDnaStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [rescanning, setRescanning] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setShopName(activeWorkspace.shop_name || '');
      setColor(activeWorkspace.color || '#FF5100');
      setIconName(activeWorkspace.icon_name || 'store');
      setIndustry(activeWorkspace.industry || '');
      setPlatform(activeWorkspace.primary_platform || activeWorkspace.platform || '');
      setDefaultLang(activeWorkspace.default_language || 'en');
      setDefaultPlatform(activeWorkspace.primary_platform || 'facebook');
      setDefaultTone(activeWorkspace.default_tone || 'friendly');
      setBrandTone(activeWorkspace.brand_tone || '');
      setTargetAudience(activeWorkspace.target_audience || '');
      setKeyProducts(activeWorkspace.key_products || '');
      setUniqueSelling(activeWorkspace.unique_selling || '');
      setPriceRange(activeWorkspace.price_range || '');
      setDnaSource(activeWorkspace.dna_source || 'manual');
      setExtractionQuality(activeWorkspace.extraction_quality || 'manual');
      setShopUrl(activeWorkspace.shop_url || '');
    }
  }, [activeWorkspace]);

  const showInline = (setter: any, s: 'saved' | 'error') => {
    setter(s);
    if (s === 'saved') setTimeout(() => setter('idle'), 2000);
  };

  const handleSaveDetails = async () => {
    if (!activeWorkspace) return;
    setSavingDetails(true);
    try {
      await supabase.from('workspaces').update({
        shop_name: shopName, color, icon_name: iconName,
        industry: industry || null, primary_platform: platform || null,
      }).eq('id', activeWorkspace.id);
      await refreshProfile();
      showInline(setDetailsStatus, 'saved');
    } catch { showInline(setDetailsStatus, 'error'); }
    finally { setSavingDetails(false); }
  };

  const handleSaveDefaults = async () => {
    if (!activeWorkspace) return;
    setSavingDefaults(true);
    try {
      await supabase.from('workspaces').update({
        default_language: defaultLang, primary_platform: defaultPlatform, default_tone: defaultTone,
      }).eq('id', activeWorkspace.id);
      await refreshProfile();
      showInline(setDefaultsStatus, 'saved');
    } catch { showInline(setDefaultsStatus, 'error'); }
    finally { setSavingDefaults(false); }
  };

  const handleSaveDna = async () => {
    if (!activeWorkspace) return;
    setSavingDna(true);
    try {
      await supabase.from('workspaces').update({
        brand_tone: brandTone, target_audience: targetAudience,
        key_products: keyProducts, unique_selling: uniqueSelling,
        price_range: priceRange, shop_url: shopUrl,
      } as any).eq('id', activeWorkspace.id);
      await refreshProfile();
      showInline(setDnaStatus, 'saved');
    } catch { showInline(setDnaStatus, 'error'); }
    finally { setSavingDna(false); }
  };

  const handleRescan = async () => {
    if (!activeWorkspace || !shopUrl || rescanning) return;
    setRescanning(true);
    try {
      await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, url: shopUrl, platform: dnaSource },
      });
      await refreshProfile();
    } catch {} finally { setRescanning(false); }
  };

  const qualityBadge = (q: string) => {
    const map: Record<string, { color: string; label: string }> = {
      full: { color: 'bg-green-500/10 text-green-600', label: 'Full' },
      partial: { color: 'bg-yellow-500/10 text-yellow-600', label: 'Partial' },
      manual: { color: 'bg-blue-500/10 text-blue-600', label: 'Manual' },
      template: { color: 'bg-secondary text-muted-foreground', label: 'Template' },
    };
    const b = map[q] || map.manual;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}</span>;
  };

  const canDelete = workspaces.length > 1 && !activeWorkspace?.is_default;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <WorkspaceAvatar color={activeWorkspace?.color} iconName={activeWorkspace?.icon_name} size={40} />
        <div>
          <h3 className="text-base font-semibold text-foreground">{activeWorkspace?.shop_name}</h3>
          <button onClick={() => navigate('/dashboard/workspaces')} className="text-xs text-primary hover:underline">
            {t('ওয়ার্কস্পেস পরিবর্তন →', 'Switch workspace →')}
          </button>
        </div>
      </div>

      {/* Workspace Details */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">{t('ওয়ার্কস্পেস বিবরণ', 'Workspace Details')}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('নাম', 'Name')}</label>
            <input value={shopName} onChange={e => setShopName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Avatar */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('অ্যাভাটার', 'Avatar')}</label>
            <div className="flex items-start gap-4">
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">{t('রং', 'Color')}</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('আইকন', 'Icon')}</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(ic => (
                    <button key={ic} onClick={() => setIconName(ic)}
                      className={`w-7 h-7 rounded-lg bg-secondary flex items-center justify-center transition-all ${iconName === ic ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                      <WorkspaceAvatar color="transparent" iconName={ic} size={18} className="!bg-transparent [&_svg]:text-foreground" />
                    </button>
                  ))}
                </div>
              </div>
              <WorkspaceAvatar color={color} iconName={iconName} size={48} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ইন্ডাস্ট্রি', 'Industry')}</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    industry === ind ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'
                  }`}>{ind}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('প্রাইমারি প্ল্যাটফর্ম', 'Primary platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    platform === p.toLowerCase() ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-foreground border-border'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSaveDetails} disabled={savingDetails}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2">
            {savingDetails ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('পরিবর্তন সংরক্ষণ', 'Save Changes')}
          </button>
          {detailsStatus === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>}
          {detailsStatus === 'error' && <span className="text-sm text-destructive flex items-center gap-1"><X size={14} /> Failed</span>}
        </div>
      </section>

      {/* Defaults */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">{t('ডিফল্টসমূহ', 'Defaults')}</h3>
        <p className="text-xs text-muted-foreground mb-5">{t('জেনারেশন ফর্মে প্রি-ফিল হবে। যেকোনো সময় ওভাররাইড করা যাবে।', 'These pre-fill your generation forms. Override anytime.')}</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ডিফল্ট ভাষা', 'Default language')}</label>
            <div className="flex flex-wrap gap-2">
              {[{ label: 'English', value: 'en' }, { label: 'বাংলা', value: 'bn' }, { label: 'Banglish', value: 'banglish' }].map(l => (
                <button key={l.value} onClick={() => setDefaultLang(l.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${defaultLang === l.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{l.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ডিফল্ট প্ল্যাটফর্ম', 'Default platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setDefaultPlatform(p.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${defaultPlatform === p.toLowerCase() ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">{t('ডিফল্ট টোন', 'Default tone')}</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(to => (
                <button key={to} onClick={() => setDefaultTone(to.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${defaultTone === to.toLowerCase() ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{to}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSaveDefaults} disabled={savingDefaults}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2">
            {savingDefaults ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('ডিফল্ট সংরক্ষণ', 'Save Defaults')}
          </button>
          {defaultsStatus === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>}
        </div>
      </section>

      {/* Shop DNA */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">Shop DNA <DNAScoreIndicator score={activeWorkspace?.dna_score || 0} size="sm" /></h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{t('সোর্স:', 'Source:')} {dnaSource}</span>
              {qualityBadge(extractionQuality)}
            </div>
          </div>
          {['website', 'facebook', 'daraz'].includes(dnaSource) && shopUrl && (
            <button onClick={handleRescan} disabled={rescanning} className="text-xs text-primary hover:underline flex items-center gap-1">
              {rescanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {t('রি-স্ক্যান', 'Re-scan')}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {[
            { label: t('ব্র্যান্ড ভয়েস', 'Brand voice'), value: brandTone, setter: setBrandTone, icon: MessageSquare },
            { label: t('টার্গেট অডিয়েন্স', 'Target audience'), value: targetAudience, setter: setTargetAudience, icon: Target },
            { label: t('মূল প্রোডাক্ট', 'Key products'), value: keyProducts, setter: setKeyProducts, icon: Package },
            { label: t('ইউনিক সেলিং পয়েন্ট', 'Unique selling point'), value: uniqueSelling, setter: setUniqueSelling, icon: Star },
            { label: t('মূল্য পরিসীমা', 'Price range'), value: priceRange, setter: setPriceRange, icon: DollarSign },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><f.icon size={12} className="text-primary" /> {f.label}</label>
              <input value={f.value} onChange={e => f.setter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSaveDna} disabled={savingDna}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-2">
            {savingDna ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('Shop DNA সংরক্ষণ', 'Save Shop DNA')}
          </button>
          {dnaStatus === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-card rounded-2xl border border-destructive/30 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-destructive mb-2">{t('বিপদ অঞ্চল', 'Danger Zone')}</h3>
        <button onClick={() => setShowDelete(true)} disabled={!canDelete}
          className="border border-destructive text-destructive rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40">
          {t('ওয়ার্কস্পেস ডিলিট করুন', 'Delete Workspace')}
        </button>
        {!canDelete && (
          <p className="text-xs text-muted-foreground mt-2">
            {activeWorkspace?.is_default
              ? t('ডিফল্ট ওয়ার্কস্পেস ডিলিট করা যায় না', 'Cannot delete default workspace')
              : t('একমাত্র ওয়ার্কস্পেস ডিলিট করা যায় না', 'Cannot delete your only workspace')}
          </p>
        )}
      </section>

      <DeleteWorkspaceModal open={showDelete} onClose={() => setShowDelete(false)} workspace={activeWorkspace} />
    </div>
  );
};

export default WorkspaceTab;
