import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Eye, EyeOff, Pencil, Check, X, Power, Key, Loader2 } from 'lucide-react';
import AdminVerificationModal from './AdminVerificationModal';

interface ApiKey {
  id: string;
  key_name: string;
  key_value: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDesc, setNewKeyDesc] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editKeyData, setEditKeyData] = useState({ key_name: '', key_value: '', description: '' });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Verification
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'edit' | 'delete' | 'toggle';
    payload: any;
    label: string;
  } | null>(null);

  const callAdmin = useCallback(async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-panel', {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.message_en || 'Admin action failed');
    return data;
  }, []);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callAdmin('list_api_keys');
      setApiKeys(data.keys || []);
    } catch (e: any) {
      toast.error(e.message || 'API কী লোড করতে সমস্যা।');
    } finally {
      setLoading(false);
    }
  }, [callAdmin]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const maskKey = (value: string) => {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(keyId) ? next.delete(keyId) : next.add(keyId);
      return next;
    });
  };

  // Actions with verification
  const initiateAddKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error('নাম ও ভ্যালু আবশ্যক');
      return;
    }
    setPendingAction({
      type: 'add',
      payload: { key_name: newKeyName, key_value: newKeyValue, description: newKeyDesc },
      label: `${newKeyName} API কী যোগ করুন`,
    });
    setVerificationOpen(true);
  };

  const initiateEditKey = () => {
    if (!editingKeyId) return;
    setPendingAction({
      type: 'edit',
      payload: { key_id: editingKeyId, ...editKeyData },
      label: `${editKeyData.key_name} API কী আপডেট করুন`,
    });
    setVerificationOpen(true);
  };

  const initiateDeleteKey = (keyId: string) => {
    const key = apiKeys.find(k => k.id === keyId);
    setPendingAction({
      type: 'delete',
      payload: { key_id: keyId },
      label: `${key?.key_name} API কী মুছে ফেলুন`,
    });
    setDeleteKeyId(null);
    setVerificationOpen(true);
  };

  const initiateToggleKey = (key: ApiKey) => {
    setPendingAction({
      type: 'toggle',
      payload: { key_id: key.id, is_active: !key.is_active },
      label: key.is_active ? `${key.key_name} নিষ্ক্রিয় করুন` : `${key.key_name} সক্রিয় করুন`,
    });
    setVerificationOpen(true);
  };

  const handleVerifiedAction = async (payload: any) => {
    if (!pendingAction) return;
    
    setActionLoading(pendingAction.type);
    try {
      switch (pendingAction.type) {
        case 'add':
          await callAdmin('add_api_key', payload);
          toast.success('API কী যোগ হয়েছে!');
          setNewKeyName(''); setNewKeyValue(''); setNewKeyDesc('');
          setShowAddForm(false);
          break;
        case 'edit':
          await callAdmin('update_api_key', payload);
          toast.success('API কী আপডেট হয়েছে!');
          setEditingKeyId(null);
          break;
        case 'delete':
          await callAdmin('delete_api_key', payload);
          toast.success('API কী মুছে ফেলা হয়েছে!');
          break;
        case 'toggle':
          await callAdmin('update_api_key', payload);
          toast.success(payload.is_active ? 'API কী সক্রিয়!' : 'API কী নিষ্ক্রিয়!');
          break;
      }
      await loadApiKeys();
    } catch (e: any) {
      toast.error(e.message || 'অ্যাকশন ব্যর্থ।');
    } finally {
      setActionLoading(null);
      setPendingAction(null);
    }
  };

  const startEditing = (key: ApiKey) => {
    setEditingKeyId(key.id);
    setEditKeyData({
      key_name: key.key_name,
      key_value: key.key_value,
      description: key.description || '',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold">API কী ব্যবস্থাপনা</h1>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          নতুন কী যোগ
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">নতুন API কী</CardTitle>
            <CardDescription>
              নতুন API কী যোগ করতে Email verification প্রয়োজন
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                placeholder="কী এর নাম (e.g., GEMINI_API_KEY)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <Input
                placeholder="কী ভ্যালু"
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
              />
            </div>
            <Input
              placeholder="বিবরণ (ঐচ্ছিক)"
              value={newKeyDesc}
              onChange={(e) => setNewKeyDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={initiateAddKey} disabled={actionLoading === 'add'}>
                {actionLoading === 'add' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                যোগ করুন
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                বাতিল
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>কোনো API কী নেই</p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id} className={!key.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                {editingKeyId === key.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <Input
                      value={editKeyData.key_name}
                      onChange={(e) => setEditKeyData(d => ({ ...d, key_name: e.target.value }))}
                      placeholder="কী এর নাম"
                    />
                    <Input
                      value={editKeyData.key_value}
                      onChange={(e) => setEditKeyData(d => ({ ...d, key_value: e.target.value }))}
                      placeholder="কী ভ্যালু"
                      type="password"
                    />
                    <Input
                      value={editKeyData.description}
                      onChange={(e) => setEditKeyData(d => ({ ...d, description: e.target.value }))}
                      placeholder="বিবরণ"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={initiateEditKey}>
                        <Check className="h-4 w-4 mr-1" /> সেভ
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingKeyId(null)}>
                        <X className="h-4 w-4 mr-1" /> বাতিল
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm">{key.key_name}</span>
                        <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-xs">
                          {key.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {visibleKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                      {key.description && (
                        <p className="text-xs text-muted-foreground mt-1">{key.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(key)}
                        title="এডিট"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => initiateToggleKey(key)}
                        title={key.is_active ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                      >
                        <Power className={`h-4 w-4 ${key.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteKeyId(key.id)}
                        title="মুছুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API কী মুছে ফেলুন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই API কী মুছে ফেললে সংশ্লিষ্ট সার্ভিস কাজ করা বন্ধ করতে পারে। এই পরিবর্তনের জন্য Email verification প্রয়োজন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteKeyId && initiateDeleteKey(deleteKeyId)}
            >
              ভেরিফাই করে মুছুন
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
