import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, RotateCcw, Loader2, Image as ImageIcon, AlertTriangle, Wrench } from 'lucide-react';

export default function AdminSettings() {
  const [refreshing, setRefreshing] = useState(false);

  // System prompt state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [usingDefault, setUsingDefault] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Image prompt state
  const [imagePrompt, setImagePrompt] = useState('');
  const [originalImagePrompt, setOriginalImagePrompt] = useState('');
  const [loadingImagePrompt, setLoadingImagePrompt] = useState(true);
  const [savingImagePrompt, setSavingImagePrompt] = useState(false);
  const [usingImageDefault, setUsingImageDefault] = useState(true);
  const [imageLastUpdated, setImageLastUpdated] = useState<string | null>(null);

  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEta, setMaintenanceEta] = useState('');
  const [maintenanceEmailNotify, setMaintenanceEmailNotify] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    loadSystemPrompt();
    loadImagePrompt();
    loadMaintenanceSettings();
  }, []);

  // ===== Maintenance Mode =====
  const loadMaintenanceSettings = async () => {
    setLoadingMaintenance(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['maintenance_mode', 'maintenance_message', 'maintenance_eta', 'maintenance_email_notify']);

      if (error) throw error;

      const settings: Record<string, string | null> = {};
      data?.forEach(s => { settings[s.setting_key] = s.setting_value; });

      setMaintenanceMode(settings['maintenance_mode'] === 'true');
      setMaintenanceMessage(settings['maintenance_message'] || 'সিস্টেম আপডেট চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
      setMaintenanceEta(settings['maintenance_eta'] || '');
      setMaintenanceEmailNotify(settings['maintenance_email_notify'] === 'true');
    } catch {
      // Settings may not exist yet, use defaults
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      const updates = [
        { setting_key: 'maintenance_mode', setting_value: maintenanceMode ? 'true' : 'false', setting_type: 'boolean' },
        { setting_key: 'maintenance_message', setting_value: maintenanceMessage, setting_type: 'text' },
        { setting_key: 'maintenance_eta', setting_value: maintenanceEta, setting_type: 'text' },
        { setting_key: 'maintenance_email_notify', setting_value: maintenanceEmailNotify ? 'true' : 'false', setting_type: 'boolean' },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'setting_key' });
        if (error) throw error;
      }

      toast.success(maintenanceMode
        ? 'Maintenance mode enabled — non-admin users will see the maintenance page.'
        : 'Maintenance mode disabled — all users can access the platform.'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to save maintenance settings.');
    } finally {
      setSavingMaintenance(false);
    }
  };

  // ===== System Prompt =====
  const loadSystemPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'get_system_prompt' }
      });
      if (error) throw error;
      if (data.prompt) {
        setSystemPrompt(data.prompt);
        setOriginalPrompt(data.prompt);
        setUsingDefault(false);
      } else {
        setSystemPrompt('');
        setOriginalPrompt('');
        setUsingDefault(true);
      }
      setLastUpdated(data.updated_at);
    } catch {
      toast.error('Failed to load system prompt.');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!systemPrompt.trim()) { toast.error('Prompt cannot be empty.'); return; }
    setSavingPrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'update_system_prompt', prompt: systemPrompt }
      });
      if (error) throw error;
      setOriginalPrompt(systemPrompt);
      setUsingDefault(false);
      toast.success('System prompt updated successfully!');
      loadSystemPrompt();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    setSavingPrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'reset_system_prompt' }
      });
      if (error) throw error;
      setSystemPrompt('');
      setOriginalPrompt('');
      setUsingDefault(true);
      toast.success('Reset to default prompt.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset.');
    } finally {
      setSavingPrompt(false);
    }
  };

  // ===== Image Prompt =====
  const loadImagePrompt = async () => {
    setLoadingImagePrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'get_image_prompt' }
      });
      if (error) throw error;
      if (data.prompt) {
        setImagePrompt(data.prompt);
        setOriginalImagePrompt(data.prompt);
        setUsingImageDefault(false);
      } else {
        setImagePrompt('');
        setOriginalImagePrompt('');
        setUsingImageDefault(true);
      }
      setImageLastUpdated(data.updated_at);
    } catch {
      toast.error('Failed to load image prompt.');
    } finally {
      setLoadingImagePrompt(false);
    }
  };

  const handleSaveImagePrompt = async () => {
    if (!imagePrompt.trim()) { toast.error('Prompt cannot be empty.'); return; }
    setSavingImagePrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'update_image_prompt', prompt: imagePrompt }
      });
      if (error) throw error;
      setOriginalImagePrompt(imagePrompt);
      setUsingImageDefault(false);
      toast.success('Image prompt updated successfully!');
      loadImagePrompt();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally {
      setSavingImagePrompt(false);
    }
  };

  const handleResetImagePrompt = async () => {
    setSavingImagePrompt(true);
    try {
      const { error } = await supabase.functions.invoke('admin-panel', {
        body: { action: 'reset_image_prompt' }
      });
      if (error) throw error;
      setImagePrompt('');
      setOriginalImagePrompt('');
      setUsingImageDefault(true);
      toast.success('Reset to default image prompt.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset.');
    } finally {
      setSavingImagePrompt(false);
    }
  };

  const handleRefreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('admin-compute-metrics');
      if (error) throw error;
      toast.success('Metrics cache refreshed successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const hasChanges = systemPrompt !== originalPrompt;
  const hasImageChanges = imagePrompt !== originalImagePrompt;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl md:text-2xl font-bold">System Settings</h1>

      {/* Maintenance Mode */}
      <Card className={maintenanceMode ? 'border-destructive/50 bg-destructive/5' : 'border-border'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                Maintenance Mode
                {maintenanceMode && (
                  <Badge variant="destructive" className="text-xs">ACTIVE</Badge>
                )}
              </CardTitle>
              <CardDescription>
                When enabled, non-admin users see a maintenance page. Admin dashboard remains accessible.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingMaintenance ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div>
                  <Label className="text-base font-medium">Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    All non-admin users will be blocked from the platform
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              {maintenanceMode && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">
                    Warning: Enabling this will immediately block all non-admin users from accessing the platform.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="maintenance-msg">User-Facing Message</Label>
                  <Textarea
                    id="maintenance-msg"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="System update in progress..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance-eta">Estimated Time</Label>
                  <Input
                    id="maintenance-eta"
                    value={maintenanceEta}
                    onChange={(e) => setMaintenanceEta(e.target.value)}
                    placeholder="e.g. 30 minutes, 2 hours"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="maintenance-email"
                    checked={maintenanceEmailNotify}
                    onCheckedChange={setMaintenanceEmailNotify}
                  />
                  <Label htmlFor="maintenance-email">
                    Email all active users when maintenance ends
                  </Label>
                </div>
              </div>

              <Button onClick={handleSaveMaintenance} disabled={savingMaintenance} className="gap-2">
                {savingMaintenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Maintenance Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* System Prompt Editor */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Copy Master Prompt
            {usingDefault && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">Using Default</span>
            )}
          </CardTitle>
          <CardDescription>
            Controls AdDhoom AI's copywriting persona, frameworks, and BD market rules
            {lastUpdated && !usingDefault && (
              <span className="ml-2 text-xs">• Last updated: {new Date(lastUpdated).toLocaleDateString('en-US')}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPrompt ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter custom system prompt..."
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSavePrompt} disabled={savingPrompt || !hasChanges} className="gap-2">
                  {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button variant="outline" onClick={handleResetPrompt} disabled={savingPrompt || usingDefault} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Reset to Default
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Generation Prompt Editor */}
      <Card className="border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-orange-500" /> Image Generation Master Prompt
            {usingImageDefault && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-normal">Using Default</span>
            )}
          </CardTitle>
          <CardDescription>
            Controls AI image generator's composition, style, product fidelity, and BD market aesthetics
            {imageLastUpdated && !usingImageDefault && (
              <span className="ml-2 text-xs">• Last updated: {new Date(imageLastUpdated).toLocaleDateString('en-US')}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingImagePrompt ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Write the master prompt for image generation here..."
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveImagePrompt} disabled={savingImagePrompt || !hasImageChanges} className="gap-2">
                  {savingImagePrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button variant="outline" onClick={handleResetImagePrompt} disabled={savingImagePrompt || usingImageDefault} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Reset to Default
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Metrics Cache */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Cache</CardTitle>
          <CardDescription>Pre-computed metrics for faster dashboard loading</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefreshMetrics} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
