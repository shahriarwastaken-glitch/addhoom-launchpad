import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Plus } from 'lucide-react';
import { toast } from 'sonner';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const CampaignsList = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('Facebook');
  const [newBudget, setNewBudget] = useState('');

  useEffect(() => {
    if (activeWorkspace) fetchCampaigns();
  }, [activeWorkspace]);

  const fetchCampaigns = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const createCampaign = async () => {
    if (!activeWorkspace || !newName.trim()) return;
    const { error } = await supabase.from('campaigns').insert({
      workspace_id: activeWorkspace.id,
      name: newName,
      platform: newPlatform,
      budget_bdt: newBudget ? parseInt(newBudget) : null,
      status: 'draft',
    });
    if (error) {
      toast.error(t('ক্যাম্পেইন তৈরি ব্যর্থ', 'Failed to create campaign'));
    } else {
      toast.success(t('ক্যাম্পেইন তৈরি হয়েছে!', 'Campaign created!'));
      setNewName('');
      setNewBudget('');
      setShowCreate(false);
      fetchCampaigns();
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-secondary text-muted-foreground',
    active: 'bg-brand-green/10 text-brand-green',
    paused: 'bg-brand-yellow/10 text-foreground',
    completed: 'bg-primary/10 text-primary',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
        <h2 className="text-2xl font-heading-bn font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="text-primary" size={28} />
          {t('ক্যাম্পেইন', 'Campaigns')}
        </h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn flex items-center gap-1 w-full sm:w-auto justify-center">
          <Plus size={16} /> {t('নতুন ক্যাম্পেইন', 'New Campaign')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-card rounded-[20px] shadow-warm p-6 mb-6 space-y-4 animate-fade-up">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={t('ক্যাম্পেইন নাম', 'Campaign name')}
            className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">{t('প্ল্যাটফর্ম', 'Platform')}</label>
              <div className="flex flex-wrap gap-2">
                {['Facebook', 'Google', 'Instagram'].map(p => (
                  <button key={p} onClick={() => setNewPlatform(p)}
                    className={`text-xs rounded-full px-3 py-1.5 transition-colors ${newPlatform === p ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full sm:w-32">
              <label className="text-xs text-muted-foreground mb-1 block">{t('বাজেট (৳)', 'Budget (৳)')}</label>
              <input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="০"
                className="w-full p-2 rounded-xl border border-border bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>
          <button onClick={createCampaign} className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold font-body-bn">
            {t('তৈরি করুন', 'Create')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground font-body-bn">{t('লোড হচ্ছে...', 'Loading...')}</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-card rounded-[20px] shadow-warm p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-muted-foreground font-body-bn">{t('এখনো কোনো ক্যাম্পেইন নেই', 'No campaigns yet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-card rounded-2xl shadow-warm p-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading-bn font-semibold text-foreground">{c.name}</h3>
                <div className="flex gap-2 mt-1">
                  {c.platform && <span className="text-xs bg-secondary rounded px-2 py-0.5 text-muted-foreground">{c.platform}</span>}
                  <span className={`text-xs rounded px-2 py-0.5 ${statusColors[c.status] || 'bg-secondary text-muted-foreground'}`}>{c.status}</span>
                </div>
              </div>
              {c.budget_bdt && (
                <div className="text-right">
                  <span className="text-sm font-mono text-foreground">৳{toBengali(c.budget_bdt)}</span>
                  <p className="text-[10px] text-muted-foreground">{t('বাজেট', 'Budget')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignsList;
