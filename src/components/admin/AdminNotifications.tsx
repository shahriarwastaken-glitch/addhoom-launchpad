import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell, Send, Users, Phone, Crown, Zap, Globe, UserCheck, Trash2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

type TargetType = 'all' | 'specific' | 'group_has_phone' | 'group_plan_pro' | 'group_plan_agency' | 'group_plan_free';

interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: string;
  created_at: string;
}

const targetOptions: { value: TargetType; label: string; icon: typeof Globe; desc: string }[] = [
  { value: 'all', label: 'সকল ব্যবহারকারী', icon: Globe, desc: 'All users' },
  { value: 'group_has_phone', label: 'মোবাইল নম্বর আছে', icon: Phone, desc: 'Users with phone number' },
  { value: 'group_plan_pro', label: 'Pro ইউজার', icon: Zap, desc: 'Pro plan users' },
  { value: 'group_plan_agency', label: 'Agency ইউজার', icon: Crown, desc: 'Agency plan users' },
  { value: 'group_plan_free', label: 'Free ইউজার', icon: Users, desc: 'Free plan users' },
  { value: 'specific', label: 'নির্দিষ্ট ব্যবহারকারী', icon: UserCheck, desc: 'Specific users by email' },
];

export default function AdminNotifications() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [specificEmails, setSpecificEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setHistory((data as Notification[]) || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('টাইটেল এবং মেসেজ দিন');
      return;
    }

    setSending(true);
    try {
      let targetUserIds: string[] | null = null;

      if (targetType === 'specific') {
        const emails = specificEmails.split(',').map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) {
          toast.error('অন্তত একটি ইমেইল দিন');
          setSending(false);
          return;
        }
        // Look up user IDs from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('email', emails);
        targetUserIds = profiles?.map(p => p.id) || [];
        if (targetUserIds.length === 0) {
          toast.error('কোনো ইউজার পাওয়া যায়নি');
          setSending(false);
          return;
        }
      }

      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          title: title.trim(),
          message: message.trim(),
          target_type: targetType,
          target_user_ids: targetUserIds,
        },
      });

      if (error) throw error;

      const emailInfo = result?.emails_sent > 0 ? ` (${result.emails_sent}টি ইমেইল পাঠানো হয়েছে)` : '';
      toast.success(`নোটিফিকেশন পাঠানো হয়েছে!${emailInfo}`);
      setTitle('');
      setMessage('');
      setSpecificEmails('');
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'পাঠাতে ব্যর্থ');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setHistory(prev => prev.filter(n => n.id !== id));
    toast.success('ডিলিট হয়েছে');
  };

  const targetLabel = (type: string) => targetOptions.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">নোটিফিকেশন পাঠান</h2>
          <p className="text-sm text-muted-foreground">Send Notifications to Users</p>
        </div>
      </div>

      {/* Compose */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">টাইটেল / Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="নোটিফিকেশন টাইটেল..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">মেসেজ / Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="নোটিফিকেশন মেসেজ লিখুন..."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Target Selection */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">প্রাপক গ্রুপ / Target Group</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {targetOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTargetType(opt.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs transition-all ${
                  targetType === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <opt.icon size={16} />
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-[10px] opacity-60">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {targetType === 'specific' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ইমেইল (কমা দিয়ে আলাদা করুন)</label>
            <Input
              value={specificEmails}
              onChange={e => setSpecificEmails(e.target.value)}
              placeholder="user1@email.com, user2@email.com"
            />
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full bg-gradient-to-r from-primary to-orange-500 text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'পাঠানো হচ্ছে...' : 'নোটিফিকেশন পাঠান'}
        </button>
      </div>

      {/* History */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock size={16} className="text-muted-foreground" />
          পাঠানো নোটিফিকেশন
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">লোড হচ্ছে...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">কোনো নোটিফিকেশন পাঠানো হয়নি</p>
        ) : (
          <div className="space-y-3">
            {history.map(n => (
              <div key={n.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{targetLabel(n.target_type)}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(n.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
