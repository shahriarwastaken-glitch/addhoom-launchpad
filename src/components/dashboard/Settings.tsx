import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useUpgrade } from '@/contexts/UpgradeContext';
import {
  Settings as SettingsIcon, Save, Globe, Type, Sun, Moon, RefreshCw,
  Store, Factory, Target, MessageSquare, Package, Star, DollarSign,
  Pencil, AlertTriangle, Info, Loader2, Tags, X, Plus, Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { resetAllTooltips } from '@/components/ui/OnceTooltip';
import VisualIdentitySection from '@/components/dashboard/VisualIdentitySection';
import ProductsGrid, { ProductEditModal } from '@/components/dashboard/ProductsGrid';
import DNAScoreIndicator from '@/components/dashboard/DNAScoreIndicator';
import type { WorkspaceProduct } from '@/hooks/useWorkspaceProducts';
import { useWorkspaceProducts } from '@/hooks/useWorkspaceProducts';

type SettingsTab = 'profile' | 'shop-dna';

const DNA_SOURCE_LABELS: Record<string, string> = {
  website: 'Website scan',
  facebook: 'Facebook page (partial)',
  daraz: 'Daraz store (partial)',
  photos: 'Photo analysis (partial)',
  manual: 'Manual entry',
  template: 'Industry template',
};

const Settings = () => {
  const { t, lang, toggle } = useLanguage();
  const { user, profile, activeWorkspace, refreshProfile } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { showUpgrade } = useUpgrade();
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct } = useWorkspaceProducts(false);

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Shop DNA fields
  const [shopName, setShopName] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyProducts, setKeyProducts] = useState('');
  const [uniqueSelling, setUniqueSelling] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [nicheTags, setNicheTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [brandColors, setBrandColors] = useState<any[]>([]);
  const [brandFonts, setBrandFonts] = useState<any>({ source: 'extracted' });
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [dnaSource, setDnaSource] = useState('manual');
  const [extractionQuality, setExtractionQuality] = useState('manual');
  const [dnaLastUpdated, setDnaLastUpdated] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<WorkspaceProduct> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (activeWorkspace) {
      setShopName(activeWorkspace.shop_name || '');
      setShopUrl(activeWorkspace.shop_url || '');
      setIndustry(activeWorkspace.industry || '');
      setBrandTone(activeWorkspace.brand_tone || '');
      setTargetAudience(activeWorkspace.target_audience || '');
      setKeyProducts(activeWorkspace.key_products || '');
      setUniqueSelling(activeWorkspace.unique_selling || '');
      setPriceRange(activeWorkspace.price_range || '');
      setNicheTags(activeWorkspace.niche_tags || []);
      setBrandColors(activeWorkspace.brand_colors || []);
      setBrandFonts(activeWorkspace.brand_fonts || { source: 'extracted' });
      setBrandLogoUrl(activeWorkspace.brand_logo_url || null);
      setDnaSource(activeWorkspace.dna_source || 'manual');
      setExtractionQuality(activeWorkspace.extraction_quality || 'manual');
      setDnaLastUpdated(activeWorkspace.dna_last_updated || null);
    }
  }, [profile, activeWorkspace]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      await refreshProfile();
      toast.success(t('সেটিংস সেভ হয়েছে!', 'Settings saved!'));
    } catch { toast.error(t('সেভ ব্যর্থ', 'Save failed')); }
    finally { setSaving(false); }
  };

  const handleSaveDna = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      await supabase.from('workspaces').update({
        shop_name: shopName, shop_url: shopUrl, industry, brand_tone: brandTone,
        target_audience: targetAudience, key_products: keyProducts, unique_selling: uniqueSelling,
        price_range: priceRange, niche_tags: nicheTags.slice(0, 5),
        brand_colors: brandColors, brand_fonts: brandFonts, brand_logo_url: brandLogoUrl,
      } as any).eq('id', activeWorkspace.id);
      await refreshProfile();
      toast.success('Shop DNA saved!');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleRescan = async () => {
    if (!activeWorkspace || !shopUrl || rescanning) return;
    if (!['website', 'facebook', 'daraz'].includes(dnaSource)) return;
    setRescanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, url: shopUrl, platform: dnaSource },
      });
      if (error || !data?.success) {
        toast.error('Re-scan failed. Please try again.');
        return;
      }
      // Apply results
      const d = data.dna || {};
      setShopName(d.shop_name || shopName);
      setIndustry(d.industry || industry);
      setBrandTone(d.brand_tone || brandTone);
      setTargetAudience(d.target_audience || targetAudience);
      setKeyProducts(d.key_products || keyProducts);
      setUniqueSelling(d.unique_selling || uniqueSelling);
      setPriceRange(d.price_range || priceRange);
      setNicheTags(d.niche_tags || nicheTags);
      setBrandColors(data.brand_colors || brandColors);
      setBrandFonts(data.brand_fonts || brandFonts);
      setBrandLogoUrl(data.brand_logo_url || brandLogoUrl);
      setDnaLastUpdated(new Date().toISOString());
      await fetchProducts();
      await refreshProfile();
      toast.success('Re-scan complete! Review the updated data.');
    } catch {
      toast.error('Re-scan failed.');
    } finally { setRescanning(false); }
  };

  const addNicheTag = () => {
    if (!newTag.trim() || nicheTags.length >= 5) return;
    setNicheTags([...nicheTags, newTag.trim()]);
    setNewTag('');
  };

  const handleProductSave = async (data: Partial<WorkspaceProduct>) => {
    if (editingProduct?.id) await updateProduct(editingProduct.id, data);
    else await addProduct(data);
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const dnaFields = [
    { key: 'shop_name', label: 'Shop Name', icon: <Store size={14} className="text-primary" />, value: shopName, setter: setShopName },
    { key: 'industry', label: 'Industry', icon: <Factory size={14} className="text-primary" />, value: industry, setter: setIndustry },
    { key: 'brand_tone', label: 'Brand Voice', icon: <MessageSquare size={14} className="text-primary" />, value: brandTone, setter: setBrandTone },
    { key: 'target_audience', label: 'Target Audience', icon: <Target size={14} className="text-primary" />, value: targetAudience, setter: setTargetAudience },
    { key: 'key_products', label: 'Key Products', icon: <Package size={14} className="text-primary" />, value: keyProducts, setter: setKeyProducts },
    { key: 'unique_selling', label: 'Unique Selling Point', icon: <Star size={14} className="text-primary" />, value: uniqueSelling, setter: setUniqueSelling },
    { key: 'price_range', label: 'Price Range', icon: <DollarSign size={14} className="text-primary" />, value: priceRange, setter: setPriceRange },
  ];

  return (
    <div className="max-w-2xl mx-auto px-0">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-6 flex items-center gap-2">
        <SettingsIcon className="text-primary" size={28} />
        {t('সেটিংস', 'Settings')}
      </h2>

      {/* Tab Switcher */}
      <div className="bg-secondary rounded-xl p-1 flex mb-6">
        {[
          { id: 'profile' as const, label: t('প্রোফাইল', 'Profile & Preferences') },
          { id: 'shop-dna' as const, label: t('Shop DNA', 'Shop DNA') },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <>
          {/* Profile */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('প্রোফাইল', 'Profile')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('ইমেইল', 'Email')}</label>
                <input value={user?.email || ''} disabled className="w-full p-3 rounded-xl border border-border bg-secondary text-muted-foreground font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('নাম', 'Name')}</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('ফোন', 'Phone')}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880"
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" />
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('ভাষা', 'Language')}</h3>
            <div className="flex gap-2">
              {[{ label: 'বাংলা', labelEn: 'Bengali', value: 'bn' as const, icon: <Globe size={14} /> }, { label: 'English', labelEn: 'English', value: 'en' as const, icon: <Type size={14} /> }].map(l => (
                <button key={l.value} onClick={() => { if (lang !== l.value) toggle(); }}
                  className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                    lang === l.value ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-card text-foreground'
                  }`}>{l.icon} {t(l.label, l.labelEn)}</button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('থিম', 'Theme')}</h3>
            <div className="flex gap-2">
              {[{ label: t('লাইট', 'Light'), value: false, icon: <Sun size={14} /> }, { label: t('ডার্ক', 'Dark'), value: true, icon: <Moon size={14} /> }].map(opt => (
                <button key={String(opt.value)} onClick={() => { if (dark !== opt.value) toggleTheme(); }}
                  className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                    dark === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-card text-foreground'
                  }`}>{opt.icon} {opt.label}</button>
              ))}
            </div>
          </div>

          {/* Reset Tooltips */}
          <div className="px-1 mb-6">
            <button
              onClick={() => {
                resetAllTooltips();
                toast.success(t('সব টুলটিপ রিসেট হয়েছে', 'All tooltips have been reset'));
              }}
              className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
            >
              {t('সব টুলটিপ রিসেট করুন', 'Reset all tooltips')}
            </button>
          </div>

          {/* Subscription */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <h3 className="font-heading-bn font-semibold text-foreground mb-4">{t('সাবস্ক্রিপশন', 'Subscription')}</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider text-primary">{profile?.plan || 'free'}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile?.subscription_status === 'active' ? t('সক্রিয়', 'Active') : t('ফ্রি প্ল্যান', 'Free Plan')}
                </p>
              </div>
              {profile?.plan === 'free' && (
                <button onClick={() => showUpgrade?.('general')} className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform">
                  {t('আপগ্রেড করুন', 'Upgrade')}
                </button>
              )}
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={saving}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
            <Save size={18} />
            {saving ? t('সেভ হচ্ছে...', 'Saving...') : t('সেটিংস সেভ করুন', 'Save Settings')}
          </button>
        </>
      )}

      {tab === 'shop-dna' && (
        <>
          {/* Data Source Badge */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-heading-bn font-semibold text-foreground">Shop DNA</h3>
              <DNAScoreIndicator score={activeWorkspace?.dna_score || 0} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">Your brand profile. Edit anything that looks wrong.</p>

            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>Source: {DNA_SOURCE_LABELS[dnaSource] || dnaSource}</span>
              {dnaLastUpdated && <span>· Last updated: {new Date(dnaLastUpdated).toLocaleDateString()}</span>}
              {['website', 'facebook', 'daraz'].includes(dnaSource) && shopUrl && (
                <button onClick={handleRescan} disabled={rescanning}
                  className="text-primary hover:underline flex items-center gap-1 font-medium">
                  {rescanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Re-scan from source
                </button>
              )}
            </div>
          </div>

          {/* Wrong data banner */}
          {extractionQuality === 'partial' && !dismissedBanner && (
            <div className="mb-4 p-3 rounded-xl border border-[hsl(40,100%,50%)]/30 bg-[hsl(40,100%,50%)]/[0.08] flex items-start gap-2">
              <AlertTriangle size={16} className="text-[hsl(40,100%,40%)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground">Some fields were auto-filled and may not be accurate. Review and correct anything that looks wrong.</p>
              </div>
              <button onClick={() => setDismissedBanner(true)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
          )}

          {/* Visual Identity */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <VisualIdentitySection
              brandColors={brandColors}
              brandFonts={brandFonts}
              brandLogoUrl={brandLogoUrl}
              onUpdateColors={setBrandColors}
              onUpdateFonts={setBrandFonts}
            />
          </div>

          {/* Brand Info Fields */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6 space-y-4">
            <h3 className="font-heading-bn font-semibold text-foreground flex items-center gap-2"><Store size={18} className="text-primary" /> Brand Info</h3>
            {dnaFields.map(field => (
              <div key={field.key}>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  {field.icon} {field.label} {!field.value && <span className="text-primary">*</span>}
                </label>
                <input value={field.value} onChange={e => field.setter(e.target.value)}
                  placeholder={!field.value ? 'Not found — add manually' : ''}
                  className={`w-full p-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm ${
                    !field.value ? 'border-primary/50' : 'border-border'
                  }`} />
              </div>
            ))}

            {/* URL */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Shop URL</label>
              <input value={shopUrl} onChange={e => setShopUrl(e.target.value)} placeholder="https://"
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm" />
            </div>

            {/* Niche Tags */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Tags size={12} /> Niche Tags</label>
              <div className="flex flex-wrap gap-2">
                {nicheTags.map((tag, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 font-medium flex items-center gap-1">
                    {tag}
                    <button onClick={() => setNicheTags(nicheTags.filter((_, j) => j !== i))} className="hover:text-destructive"><X size={12} /></button>
                  </span>
                ))}
                {nicheTags.length < 5 && (
                  <div className="flex items-center gap-1">
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNicheTag()}
                      placeholder="Add tag" className="text-xs bg-card border border-border rounded-full px-3 py-1.5 w-24 focus:outline-none focus:border-primary text-foreground" />
                    <button onClick={addNicheTag} className="text-xs text-primary"><Plus size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 mb-6">
            <h3 className="font-heading-bn font-semibold text-foreground mb-4 flex items-center gap-2"><Package size={18} className="text-primary" /> Products ({products.length})</h3>
            <ProductsGrid
              products={products}
              onToggleActive={async (id, active) => { await updateProduct(id, { is_active: active } as any); }}
              onEdit={p => { setEditingProduct(p); setShowProductModal(true); }}
              onDelete={async id => { await deleteProduct(id); }}
              onAdd={() => { setEditingProduct({}); setShowProductModal(true); }}
            />
          </div>

          <button onClick={handleSaveDna} disabled={saving}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      )}

      {/* Product Edit Modal */}
      {showProductModal && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleProductSave}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
};

export default Settings;
