import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RefreshCw,
  RotateCcw,
  Edit,
  MoreVertical,
  FileText,
  ExternalLink,
  Power,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  TrendingUp,
  Zap,
  Key,
  Shield,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import AdminVerificationModal from './AdminVerificationModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

interface ApiKey {
  id: string;
  service_name: string;
  display_name: string;
  key_preview: string;
  environment: string;
  status: string;
  last_tested_at: string | null;
  last_test_result: string | null;
  last_test_error: string | null;
  expires_at: string | null;
  monthly_limit: number | null;
  monthly_usage: number;
  notes: string | null;
  description: string | null;
  docs_url: string | null;
  icon: string | null;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
  rotated_at: string | null;
  usage_last_7_days: any[];
  total_calls_this_month: number;
}

interface Service {
  service_name: string;
  display_name: string;
  description: string;
  docs_url: string;
  icon: string;
  is_critical: boolean;
}

interface KeyLog {
  id: string;
  service_name: string;
  action: string;
  result: string;
  notes: string | null;
  created_at: string;
  admin: { email: string } | null;
}

const SERVICE_COLORS: Record<string, string> = {
  gemini: '#6C3FE8',
  sslcommerz: '#E2136E',
  shotstack: '#00B96B',
  meta_ad_library: '#1877F2',
  resend: '#FF5100',
};

const SETUP_GUIDES: Record<string, string[]> = {
  gemini: [
    '১. Google AI Studio খুলুন (aistudio.google.com)',
    '২. "Get API Key" বাটনে ক্লিক করুন',
    '৩. নতুন প্রজেক্ট তৈরি করুন বা বিদ্যমান প্রজেক্ট বেছে নিন',
    '৪. API Key কপি করুন এবং এখানে পেস্ট করুন',
  ],
  sslcommerz: [
    '১. SSLCommerz Developer Portal এ যান',
    '২. Merchant Account তৈরি করুন',
    '৩. Credentials থেকে Store ID এবং Store Password কপি করুন',
    '৪. উভয় মান এখানে পেস্ট করুন',
  ],
  shotstack: [
    '১. shotstack.io তে অ্যাকাউন্ট তৈরি করুন',
    '২. Dashboard থেকে API Key কপি করুন',
    '৩. Stage key দিয়ে শুরু করুন (বিনামূল্যে)',
  ],
  meta_ad_library: [
    '১. developers.facebook.com এ যান',
    '২. নতুন App তৈরি করুন',
    '৩. Ad Library API access request করুন',
    '৪. Access Token কপি করুন',
  ],
  resend: [
    '১. resend.com এ অ্যাকাউন্ট তৈরি করুন',
    '২. API Keys সেকশনে যান',
    '৩. নতুন API Key তৈরি করুন',
    '৪. Key কপি করুন (একবারই দেখা যাবে)',
  ],
};

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [logs, setLogs] = useState<KeyLog[]>([]);
  const [usageStats, setUsageStats] = useState<any[]>([]);
  const [usagePeriod, setUsagePeriod] = useState('30');

  // Form states
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyVisible, setNewKeyVisible] = useState(false);
  const [newExpiry, setNewExpiry] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newEnv, setNewEnv] = useState('production');
  const [rotateNotes, setRotateNotes] = useState('');
  const [rotateReason, setRotateReason] = useState('');
  const [rotateConfirmed, setRotateConfirmed] = useState(false);

  // Verification
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    payload: any;
    label: string;
  } | null>(null);

  const callApi = useCallback(async (action: string, params: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-api-keys', {
      body: { action, ...params },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.message_en || data.message_bn || 'Action failed');
    return data;
  }, []);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi('get_api_keys');
      setApiKeys(data.keys || []);
      setServices(data.services || []);
      
      // Check if first time (no keys with actual values)
      const hasRealKeys = (data.keys || []).some((k: ApiKey) => k.key_preview !== '...NONE');
      if (!hasRealKeys && (data.keys || []).length === 0) {
        setShowSetupWizard(true);
      }
    } catch (e: any) {
      toast.error(e.message || 'API কী লোড করতে সমস্যা।');
    } finally {
      setLoading(false);
    }
  }, [callApi]);

  const loadUsageStats = useCallback(async () => {
    try {
      const data = await callApi('get_usage_stats', { days: parseInt(usagePeriod) });
      setUsageStats(data.stats || []);
    } catch (e) {
      console.error('Failed to load usage stats:', e);
    }
  }, [callApi, usagePeriod]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  useEffect(() => {
    loadUsageStats();
  }, [loadUsageStats]);

  // Health status
  const getOverallHealth = () => {
    const criticalDown = apiKeys.filter(k => k.is_critical && k.status === 'error');
    const anyError = apiKeys.filter(k => k.status === 'error');
    
    if (criticalDown.length > 0) return 'critical';
    if (anyError.length > 0) return 'warning';
    return 'healthy';
  };

  const overallHealth = getOverallHealth();

  // Test all keys
  const handleTestAll = async () => {
    setTestingAll(true);
    try {
      const result = await callApi('test_all_keys');
      toast.success(result.message_bn);
      await loadApiKeys();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingAll(false);
    }
  };

  // Test single key
  const handleTestKey = async (keyId: string) => {
    setTestingKey(keyId);
    try {
      const result = await callApi('test_api_key', { key_id: keyId });
      if (result.success) {
        toast.success(result.message_bn);
      } else {
        toast.error(result.error || 'পরীক্ষা ব্যর্থ!');
      }
      await loadApiKeys();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestingKey(null);
    }
  };

  // Open add modal for a service
  const openAddModal = (service: Service, existingKey?: ApiKey) => {
    setSelectedService(service);
    setSelectedKey(existingKey || null);
    setNewKeyValue('');
    setNewKeyVisible(false);
    setNewExpiry(existingKey?.expires_at?.split('T')[0] || '');
    setNewLimit(existingKey?.monthly_limit?.toString() || '');
    setNewNotes(existingKey?.notes || '');
    setNewEnv(existingKey?.environment || 'production');
    setShowAddModal(true);
  };

  // Open rotate modal
  const openRotateModal = (key: ApiKey) => {
    setSelectedKey(key);
    setNewKeyValue('');
    setNewKeyVisible(false);
    setRotateNotes('');
    setRotateReason('');
    setRotateConfirmed(false);
    setShowRotateModal(true);
  };

  // Open logs drawer
  const openLogsDrawer = async (key: ApiKey) => {
    setSelectedKey(key);
    setShowLogsDrawer(true);
    try {
      const data = await callApi('get_key_logs', { key_id: key.id });
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  };

  // Initiate verified action
  const initiateAction = (type: string, payload: any, label: string) => {
    setPendingAction({ type, payload, label });
    setVerificationOpen(true);
  };

  // Handle verified action
  const handleVerifiedAction = async (payload: any) => {
    if (!pendingAction) return;

    try {
      switch (pendingAction.type) {
        case 'add':
          await callApi('add_api_key', payload);
          toast.success('API কী যোগ হয়েছে!');
          setShowAddModal(false);
          break;
        case 'update':
          await callApi('update_api_key', payload);
          toast.success('API কী আপডেট হয়েছে!');
          setShowEditModal(false);
          break;
        case 'rotate':
          const rotateResult = await callApi('rotate_api_key', payload);
          if (rotateResult.test_result?.success) {
            toast.success('নতুন কী সফলভাবে রোটেট হয়েছে!');
          } else {
            toast.warning('কী রোটেট হয়েছে কিন্তু পরীক্ষা ব্যর্থ!');
          }
          setShowRotateModal(false);
          break;
        case 'delete':
          await callApi('delete_api_key', payload);
          toast.success('API কী মুছে ফেলা হয়েছে!');
          break;
        case 'toggle':
          await callApi('update_api_key_status', payload);
          toast.success(payload.status === 'active' ? 'কী সক্রিয় করা হয়েছে!' : 'কী নিষ্ক্রিয় করা হয়েছে!');
          break;
      }
      await loadApiKeys();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPendingAction(null);
    }
  };

  // Get days until expiry
  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Relative time helper
  const getRelativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 60) return `${mins} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return `${days} দিন আগে`;
  };

  // Action labels in Bengali
  const getActionLabel = (action: string, result?: string) => {
    const labels: Record<string, string> = {
      created: 'কী তৈরি করা হয়েছে',
      tested: `পরীক্ষা করা হয়েছে — ${result === 'success' ? 'সফল' : 'ব্যর্থ'}`,
      rotated: 'কী রোটেট করা হয়েছে',
      activated: 'সক্রিয় করা হয়েছে',
      deactivated: 'নিষ্ক্রিয় করা হয়েছে',
      updated: 'আপডেট করা হয়েছে',
      deleted: 'মুছে ফেলা হয়েছে',
    };
    return labels[action] || action;
  };

  // Prepare chart data
  const prepareUsageChartData = () => {
    const grouped: Record<string, Record<string, number>> = {};
    
    usageStats.forEach((stat) => {
      if (!grouped[stat.stat_date]) {
        grouped[stat.stat_date] = {};
      }
      grouped[stat.stat_date][stat.service_name] = stat.calls_made;
    });

    return Object.entries(grouped).map(([date, services]) => ({
      date: new Date(date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' }),
      ...services,
    }));
  };

  const chartData = prepareUsageChartData();

  // Calculate totals for stats cards
  const totalCallsThisMonth = apiKeys.reduce((sum, k) => sum + (k.total_calls_this_month || 0), 0);
  const totalTokens = usageStats.reduce((sum, s) => sum + (s.total_tokens_used || 0), 0);
  const estimatedCost = (totalTokens / 1000) * 0.0007; // Rough Gemini Flash estimate
  const successRate = usageStats.length > 0
    ? Math.round((usageStats.reduce((sum, s) => sum + (s.calls_made - s.calls_failed), 0) / usageStats.reduce((sum, s) => sum + s.calls_made, 0)) * 100)
    : 100;

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Critical Alert Banner */}
      {overallHealth === 'critical' && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-destructive">
              🔴 জরুরি: {apiKeys.filter(k => k.is_critical && k.status === 'error').map(k => k.display_name).join(', ')} কাজ করছে না
            </p>
            <p className="text-sm text-muted-foreground">ব্যবহারকারীরা প্রভাবিত হচ্ছেন</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            API কী ম্যানেজমেন্ট
          </h1>
          <p className="text-muted-foreground text-sm">সকল বাহ্যিক সার্ভিসের API কী পর্যবেক্ষণ ও নিয়ন্ত্রণ করুন</p>
        </div>
        <Button variant="outline" onClick={handleTestAll} disabled={testingAll}>
          {testingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          সব কী পরীক্ষা করুন
        </Button>
      </div>

      {/* Platform Health Bar */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {overallHealth === 'healthy' && (
                <>
                  <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-green-600">🟢 সব সার্ভিস স্বাভাবিক</span>
                </>
              )}
              {overallHealth === 'warning' && (
                <>
                  <div className="h-4 w-4 rounded-full bg-yellow-500" />
                  <span className="font-medium text-yellow-600">🟡 কিছু সমস্যা আছে</span>
                </>
              )}
              {overallHealth === 'critical' && (
                <>
                  <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-medium text-red-600">🔴 জরুরি সমস্যা</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => {
                const key = apiKeys.find(k => k.service_name === service.service_name);
                const statusColor = !key || key.key_preview === '...NONE' 
                  ? 'bg-gray-400' 
                  : key.status === 'active' 
                    ? 'bg-green-500' 
                    : key.status === 'error' 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500';
                return (
                  <Badge key={service.service_name} variant="outline" className="gap-1.5 py-1">
                    <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                    {service.icon} {service.display_name.split(' ')[0]}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => {
          const key = apiKeys.find(k => k.service_name === service.service_name);
          const hasKey = key && key.key_preview !== '...NONE';
          const daysUntilExpiry = key ? getDaysUntilExpiry(key.expires_at) : null;
          const usagePercent = key?.monthly_limit ? Math.round((key.monthly_usage / key.monthly_limit) * 100) : 0;

          return (
            <Card 
              key={service.service_name} 
              className={`relative ${service.is_critical ? 'border-t-4 border-t-orange-500' : ''} ${key?.status === 'inactive' ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{service.icon}</span>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {service.display_name}
                        {service.is_critical && (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Critical</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">{service.description}</CardDescription>
                    </div>
                  </div>
                  {key && (
                    <Badge 
                      variant={key.status === 'active' ? 'default' : key.status === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {key.status === 'active' ? 'সক্রিয়' : key.status === 'error' ? 'সমস্যা' : key.status === 'inactive' ? 'নিষ্ক্রিয়' : 'মেয়াদোত্তীর্ণ'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Key Display */}
                <div>
                  <Label className="text-xs text-muted-foreground">API কী:</Label>
                  {hasKey ? (
                    <code className="block text-sm font-mono text-muted-foreground">
                      ••••••••••••{key.key_preview?.replace('...', '')}
                    </code>
                  ) : (
                    <p className="text-sm italic text-orange-600">কী যোগ করা হয়নি</p>
                  )}
                </div>

                {/* Last Test */}
                {hasKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">শেষ পরীক্ষা:</span>
                    <div className="flex items-center gap-1">
                      {key.last_tested_at ? (
                        <>
                          <span className="text-muted-foreground">{getRelativeTime(key.last_tested_at)}</span>
                          {key.last_test_result === 'success' ? (
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" /> সফল
                            </Badge>
                          ) : key.last_test_result === 'failed' ? (
                            <Badge variant="outline" className="text-red-600 border-red-600 text-xs gap-1">
                              <XCircle className="h-3 w-3" /> ব্যর্থ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 text-xs">অজানা</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">পরীক্ষা করা হয়নি</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Mini Usage Chart */}
                {hasKey && key.usage_last_7_days.length > 0 && (
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={key.usage_last_7_days}>
                        <Bar dataKey="calls_made" fill={SERVICE_COLORS[service.service_name] || '#888'} radius={2} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground text-center">
                      এই মাসে {key.total_calls_this_month} বার ব্যবহার
                    </p>
                  </div>
                )}

                {/* Monthly Limit Progress */}
                {hasKey && key.monthly_limit && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>মাসিক সীমা</span>
                      <span className={usagePercent > 80 ? 'text-red-600' : usagePercent > 60 ? 'text-yellow-600' : ''}>
                        {key.monthly_usage} / {key.monthly_limit} ({usagePercent}%)
                      </span>
                    </div>
                    <Progress 
                      value={usagePercent} 
                      className={`h-1.5 ${usagePercent > 80 ? '[&>div]:bg-red-500' : usagePercent > 60 ? '[&>div]:bg-yellow-500' : ''}`} 
                    />
                  </div>
                )}

                {/* Expiry Warning */}
                {hasKey && daysUntilExpiry !== null && (
                  <div className={`text-xs flex items-center gap-1 ${daysUntilExpiry <= 7 ? 'text-red-600' : daysUntilExpiry <= 30 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" />
                    {daysUntilExpiry <= 0 
                      ? `মেয়াদ শেষ হয়েছে` 
                      : daysUntilExpiry <= 7 
                        ? `🔴 জরুরি: ${daysUntilExpiry} দিনে মেয়াদ শেষ!`
                        : `⚠️ ${daysUntilExpiry} দিনে মেয়াদ শেষ হবে`
                    }
                  </div>
                )}

                {/* Notes */}
                {hasKey && key.notes && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">{key.notes}</p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {hasKey ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleTestKey(key.id)}
                        disabled={testingKey === key.id}
                      >
                        {testingKey === key.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        পরীক্ষা
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openRotateModal(key)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        রোটেট
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openAddModal(service, key)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        সম্পাদনা
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openLogsDrawer(key)}>
                            <FileText className="h-4 w-4 mr-2" /> লগ দেখুন
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => initiateAction('toggle', { key_id: key.id, status: key.status === 'active' ? 'inactive' : 'active' }, `${key.display_name} ${key.status === 'active' ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করুন`)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {key.status === 'active' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                          </DropdownMenuItem>
                          {service.docs_url && (
                            <DropdownMenuItem onClick={() => window.open(service.docs_url, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" /> ডকুমেন্টেশন
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => initiateAction('delete', { key_id: key.id }, `${key.display_name} API কী মুছে ফেলুন`)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> মুছে ফেলুন
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <Button onClick={() => openAddModal(service)} className="w-full">
                      কী যোগ করুন
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Analytics Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              API ব্যবহারের বিশ্লেষণ
            </CardTitle>
            <Tabs value={usagePeriod} onValueChange={setUsagePeriod}>
              <TabsList className="h-8">
                <TabsTrigger value="7" className="text-xs">৭ দিন</TabsTrigger>
                <TabsTrigger value="30" className="text-xs">৩০ দিন</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalCallsThisMonth.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">মোট API কল</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <span className="text-xl">🤖</span>
                <p className="text-2xl font-bold">{(totalTokens / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground">Gemini টোকেন</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <span className="text-xl">৳</span>
                <p className="text-2xl font-bold">{estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">আনুমানিক খরচ</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">সাফল্যের হার</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Calls Chart */}
          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {services.map((s) => (
                    <Bar 
                      key={s.service_name} 
                      dataKey={s.service_name} 
                      stackId="a" 
                      fill={SERVICE_COLORS[s.service_name] || '#888'} 
                      name={s.display_name}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Key Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedService?.icon}</span>
              API কী {selectedKey ? 'সম্পাদনা' : 'যোগ'} করুন — {selectedService?.display_name}
            </DialogTitle>
            <DialogDescription>{selectedService?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Setup Guide Collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
                <FileText className="h-4 w-4" />
                কী পাওয়ার নির্দেশিকা
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 pl-6 border-l-2 border-primary/20">
                <ol className="text-sm text-muted-foreground space-y-1">
                  {SETUP_GUIDES[selectedService?.service_name || '']?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>

            {/* API Key Input */}
            <div>
              <Label>API Key *</Label>
              <div className="relative">
                <Input
                  type={newKeyVisible ? 'text' : 'password'}
                  placeholder="আপনার API কী এখানে পেস্ট করুন"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value.trim())}
                  className="font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setNewKeyVisible(!newKeyVisible)}
                >
                  {newKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Environment */}
            <div>
              <Label>Environment</Label>
              <Select value={newEnv} onValueChange={setNewEnv}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Date */}
            <div>
              <Label>মেয়াদ শেষের তারিখ (ঐচ্ছিক)</Label>
              <Input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
              />
            </div>

            {/* Monthly Limit */}
            <div>
              <Label>মাসিক কল সীমা (ঐচ্ছিক)</Label>
              <Input
                type="number"
                placeholder="যেমন: 1000000"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label>নোট (ঐচ্ছিক)</Label>
              <Textarea
                placeholder="এই কী সম্পর্কে যেকোনো নোট..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Security Notice */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm">
              <p className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-600">নিরাপত্তা নোট:</span>
              </p>
              <p className="text-muted-foreground mt-1">
                API কী সংরক্ষণের পর সম্পূর্ণ কী আর দেখা যাবে না। শুধু শেষ ৪টি অক্ষর দেখা যাবে।
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>বাতিল করুন</Button>
            <Button 
              onClick={() => {
                if (!newKeyValue.trim()) {
                  toast.error('API কী আবশ্যক');
                  return;
                }
                initiateAction(
                  selectedKey ? 'update' : 'add',
                  {
                    ...(selectedKey ? { key_id: selectedKey.id } : { service_name: selectedService?.service_name }),
                    key_value: newKeyValue,
                    environment: newEnv,
                    expires_at: newExpiry || null,
                    monthly_limit: newLimit ? parseInt(newLimit) : null,
                    notes: newNotes || null,
                  },
                  `${selectedService?.display_name} API কী ${selectedKey ? 'আপডেট' : 'যোগ'} করুন`
                );
              }}
              disabled={!newKeyValue.trim()}
            >
              সংরক্ষণ করুন ও পরীক্ষা করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Key Modal */}
      <Dialog open={showRotateModal} onOpenChange={setShowRotateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              API কী রোটেট করুন — {selectedKey?.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
              <p className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" />
                সতর্কতা
              </p>
              <p className="text-muted-foreground mt-1">
                পুরনো কী অবিলম্বে অকার্যকর হয়ে যাবে। নতুন কী সঠিক কিনা নিশ্চিত হয়ে তারপর রোটেট করুন।
              </p>
            </div>

            {/* Current Key Preview */}
            <div>
              <Label>বর্তমান কী</Label>
              <code className="block text-sm font-mono text-muted-foreground bg-muted p-2 rounded">
                ••••••••{selectedKey?.key_preview?.replace('...', '')}
              </code>
            </div>

            {/* New Key Input */}
            <div>
              <Label>নতুন API Key *</Label>
              <div className="relative">
                <Input
                  type={newKeyVisible ? 'text' : 'password'}
                  placeholder="নতুন API কী পেস্ট করুন"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value.trim())}
                  className="font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setNewKeyVisible(!newKeyVisible)}
                >
                  {newKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label>রোটেশনের কারণ *</Label>
              <Select value={rotateReason} onValueChange={setRotateReason}>
                <SelectTrigger>
                  <SelectValue placeholder="কারণ বাছুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">নিয়মিত রোটেশন</SelectItem>
                  <SelectItem value="compromised">কী হারিয়ে গেছে</SelectItem>
                  <SelectItem value="security">নিরাপত্তা সমস্যা</SelectItem>
                  <SelectItem value="expired">মেয়াদ শেষ</SelectItem>
                  <SelectItem value="other">অন্য কারণ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rotateReason === 'other' && (
              <div>
                <Label>কারণ বিস্তারিত</Label>
                <Input
                  placeholder="কারণ লিখুন"
                  value={rotateNotes}
                  onChange={(e) => setRotateNotes(e.target.value)}
                />
              </div>
            )}

            {/* Confirmation */}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="rotate-confirm" 
                checked={rotateConfirmed} 
                onCheckedChange={(c) => setRotateConfirmed(!!c)} 
              />
              <label htmlFor="rotate-confirm" className="text-sm">
                আমি নিশ্চিত যে নতুন কী সঠিক এবং কাজ করছে
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRotateModal(false)}>বাতিল করুন</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (!newKeyValue.trim() || !rotateReason || !rotateConfirmed) {
                  toast.error('সব ফিল্ড পূরণ করুন');
                  return;
                }
                initiateAction(
                  'rotate',
                  {
                    key_id: selectedKey?.id,
                    new_key_value: newKeyValue,
                    notes: rotateReason === 'other' ? rotateNotes : rotateReason,
                  },
                  `${selectedKey?.display_name} API কী রোটেট করুন`
                );
              }}
              disabled={!newKeyValue.trim() || !rotateReason || !rotateConfirmed}
            >
              রোটেট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Drawer */}
      <Sheet open={showLogsDrawer} onOpenChange={setShowLogsDrawer}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{selectedKey?.display_name} — কার্যক্রমের লগ</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">কোনো লগ নেই</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-[25px] h-3 w-3 rounded-full ${
                      log.action === 'created' ? 'bg-blue-500' :
                      log.result === 'success' ? 'bg-green-500' :
                      log.result === 'failed' ? 'bg-red-500' :
                      log.action === 'rotated' ? 'bg-orange-500' :
                      log.action === 'activated' ? 'bg-green-500' :
                      'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{getActionLabel(log.action, log.result)}</p>
                      <p className="text-xs text-muted-foreground">{log.admin?.email || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{getRelativeTime(log.created_at)}</p>
                      {log.notes && <p className="text-xs italic mt-1">{log.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Verification Modal */}
      <AdminVerificationModal
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        actionType="critical_action"
        actionPayload={pendingAction?.payload}
        actionLabel={pendingAction?.label || ''}
        onVerified={handleVerifiedAction}
      />
    </div>
  );
}
