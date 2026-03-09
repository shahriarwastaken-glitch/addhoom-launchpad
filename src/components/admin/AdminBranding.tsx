import { useState, useEffect } from 'react';
import { Save, Upload, Palette, Type, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AppSettings {
  [key: string]: string | null;
}

export default function AdminBranding() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [originalSettings, setOriginalSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap: AppSettings = {};
      data?.forEach((item) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      setSettings(settingsMap);
      setOriginalSettings(settingsMap);
    } catch (err: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string | null) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getChangedSettings = () => {
    const changes: Array<{ key: string; oldValue: string | null; newValue: string | null }> = [];
    Object.keys(settings).forEach(key => {
      if (settings[key] !== originalSettings[key]) {
        changes.push({ key, oldValue: originalSettings[key], newValue: settings[key] });
      }
    });
    return changes;
  };

  const handlePublish = async () => {
    const changes = getChangedSettings();
    if (changes.length === 0) {
      toast.info('No changes to publish');
      return;
    }

    try {
      setSaving(true);
      for (const change of changes) {
        const { error } = await supabase
          .from('app_settings')
          .update({ setting_value: change.newValue, updated_at: new Date().toISOString() })
          .eq('setting_key', change.key);

        if (error) throw error;
      }

      setOriginalSettings({ ...settings });
      setShowConfirm(false);
      toast.success('Changes published successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = getChangedSettings().length > 0;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Brand Settings</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Brand Settings</h1>
          <p className="text-muted-foreground">Change logos, colors, and visual identity</p>
        </div>
        <Button 
          onClick={() => hasChanges ? setShowConfirm(true) : toast.info('No changes')}
          disabled={!hasChanges || saving}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="h-4 w-4 mr-2" />
          Publish Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section 1: Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Main Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Logo (Light Background)</Label>
                <Input
                  value={settings.logo_light_url || ''}
                  onChange={(e) => updateSetting('logo_light_url', e.target.value)}
                  placeholder="https://... or upload URL"
                />
                <p className="text-xs text-muted-foreground mt-1">SVG or PNG, max 500KB</p>
              </div>
              <div>
                <Label>Logo (Dark Background)</Label>
                <Input
                  value={settings.logo_dark_url || ''}
                  onChange={(e) => updateSetting('logo_dark_url', e.target.value)}
                  placeholder="https://... or upload URL"
                />
              </div>
              <div>
                <Label>Favicon</Label>
                <Input
                  value={settings.favicon_url || ''}
                  onChange={(e) => updateSetting('favicon_url', e.target.value)}
                  placeholder="https://... 32x32 or 64x64"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: AI Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                AI Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AI Avatar Image URL</Label>
                <Input
                  value={settings.ai_avatar_url || ''}
                  onChange={(e) => updateSetting('ai_avatar_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>AI Name</Label>
                <Input
                  value={settings.ai_name || 'Dhoom AI'}
                  onChange={(e) => updateSetting('ai_name', e.target.value)}
                />
              </div>
              <div>
                <Label>AI Tagline</Label>
                <Input
                  value={settings.ai_tagline || ''}
                  onChange={(e) => updateSetting('ai_tagline', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Palette
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'color_primary', label: 'Primary Brand Color', default: '#FF5100' },
                { key: 'color_secondary', label: 'Secondary', default: '#FFB800' },
                { key: 'color_success', label: 'Success', default: '#00B96B' },
                { key: 'color_ai', label: 'AI Elements', default: '#6C3FE8' },
                { key: 'color_bg', label: 'Background', default: '#FFFBF5' },
              ].map(color => (
                <div key={color.key} className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={settings[color.key] || color.default}
                    onChange={(e) => updateSetting(color.key, e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label>{color.label}</Label>
                    <Input
                      value={settings[color.key] || color.default}
                      onChange={(e) => updateSetting(color.key, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
              {settings.color_primary !== originalSettings.color_primary && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-3 rounded-lg">
                  ⚠️ Changing the primary color will affect all buttons, scores, and highlights across the app.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 4: App Text */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tagline</Label>
                <Input
                  value={settings.tagline || ''}
                  onChange={(e) => updateSetting('tagline', e.target.value)}
                />
              </div>
              <div>
                <Label>Footer Text</Label>
                <Input
                  value={settings.footer_text || ''}
                  onChange={(e) => updateSetting('footer_text', e.target.value)}
                />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => updateSetting('support_email', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mini Navbar Preview */}
                <div 
                  className="rounded-lg p-3 flex items-center gap-2"
                  style={{ backgroundColor: settings.color_bg || '#FFFBF5' }}
                >
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: settings.color_primary || '#FF5100' }}
                  >
                    A
                  </div>
                  <span className="font-bold" style={{ color: settings.color_primary || '#FF5100' }}>
                    AdDhoom
                  </span>
                </div>

                {/* Button Preview */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Button</p>
                  <button 
                    className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                    style={{ backgroundColor: settings.color_primary || '#FF5100' }}
                  >
                    Get Started
                  </button>
                </div>

                {/* AI Chat Preview */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">AI Chat</p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <div 
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: settings.color_ai || '#6C3FE8' }}
                    >
                      {(settings.ai_name || 'AI')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{settings.ai_name || 'Dhoom AI'}</p>
                      <p className="text-xs text-muted-foreground">{settings.ai_tagline || 'Your advertising expert'}</p>
                    </div>
                  </div>
                </div>

                {/* Score Preview */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Score Badge</p>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: settings.color_primary || '#FF5100' }}
                    >
                      85
                    </div>
                    <Badge style={{ backgroundColor: settings.color_success || '#00B96B', color: 'white' }}>
                      Good
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Publish Confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Changes</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>Changes summary:</p>
                {getChangedSettings().map(change => (
                  <div key={change.key} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span>{change.key}: {change.oldValue || '(empty)'} → {change.newValue || '(empty)'}</span>
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
