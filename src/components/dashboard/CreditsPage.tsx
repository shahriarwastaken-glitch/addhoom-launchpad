import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, ArrowUpRight, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type Transaction = {
  id: string;
  action_key: string | null;
  credits_delta: number;
  balance_after: number;
  description: string | null;
  transaction_type: string;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function CreditsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deductions' | 'additions'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [creditCosts, setCreditCosts] = useState<Record<string, { label: string; credits: number; category: string }>>({});

  const balance = profile?.credit_balance ?? 0;
  const resetAt = profile?.credits_reset_at;

  // Fetch plan monthly credits
  const [monthlyCredits, setMonthlyCredits] = useState(5000);

  useEffect(() => {
    if (!profile?.plan_key) return;
    supabase.from('plans').select('monthly_credits').eq('plan_key', profile.plan_key).single()
      .then(({ data }) => {
        if (data?.monthly_credits) setMonthlyCredits(data.monthly_credits);
      });
  }, [profile?.plan_key]);

  useEffect(() => {
    supabase.from('credit_costs').select('action_key, action_label, credits, category')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          const map: typeof creditCosts = {};
          data.forEach((c: any) => { map[c.action_key] = { label: c.action_label, credits: c.credits, category: c.category }; });
          setCreditCosts(map);
        }
      });
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('credit_transactions')
      .select('id, action_key, credits_delta, balance_after, description, transaction_type, created_at')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter === 'deductions') query = query.lt('credits_delta', 0);
    if (filter === 'additions') query = query.gt('credits_delta', 0);

    const { data } = await query;
    setTransactions(data || []);
    setHasMore((data?.length || 0) === PAGE_SIZE);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const usedCredits = monthlyCredits - balance;
  const usedPercent = monthlyCredits > 0 ? Math.min(100, (usedCredits / monthlyCredits) * 100) : 0;
  const isLow = balance < monthlyCredits * 0.3;

  const resetDateFormatted = resetAt
    ? format(new Date(resetAt), 'MMM d, yyyy')
    : null;

  return (
    <div className="space-y-6">
      {/* Upgrade Nudge */}
      {isLow && profile?.plan_key !== 'agency' && (
        <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('ক্রেডিট কমে যাচ্ছে?', 'Running low on credits?')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('Pro প্ল্যানে আপগ্রেড করুন — ১৫,০০০ ক্রেডিট/মাস', 'Upgrade to Pro for 15,000 credits/month')}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/dashboard/settings#billing')} className="bg-gradient-cta text-primary-foreground">
            {t('আপগ্রেড →', 'Upgrade →')}
          </Button>
        </div>
      )}

      {/* Balance Card */}
      <Card className="border-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t('ক্রেডিট বাকি', 'credits remaining')}</p>
              </div>
            </div>
            {resetDateFormatted && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t('রিসেট হবে', 'Resets on')}</p>
                <p className="text-sm font-medium text-foreground">{resetDateFormatted}</p>
              </div>
            )}
          </div>
          <Progress value={100 - usedPercent} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-2">
            {usedCredits.toLocaleString()} / {monthlyCredits.toLocaleString()} {t('ব্যবহৃত', 'used')}
          </p>
        </CardContent>
      </Card>

      {/* Credit Costs Reference */}
      {Object.keys(creditCosts).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('প্রতি অ্যাকশনে ক্রেডিট', 'Credits per Action')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(creditCosts).map(([key, cost]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground truncate">{cost.label}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0">{cost.credits}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('লেনদেন ইতিহাস', 'Transaction History')}</CardTitle>
            <Select value={filter} onValueChange={(v: any) => { setFilter(v); setPage(0); }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('সব', 'All')}</SelectItem>
                <SelectItem value="deductions">{t('খরচ', 'Deductions')}</SelectItem>
                <SelectItem value="additions">{t('যোগ', 'Additions')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('কোন লেনদেন নেই', 'No transactions yet')}
            </p>
          ) : (
            <div className="space-y-1">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                      tx.credits_delta > 0 ? 'bg-emerald-500/10' : 'bg-muted'
                    }`}>
                      {tx.credits_delta > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || tx.action_key || 'Credit transaction'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-sm font-semibold ${tx.credits_delta > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                      {tx.credits_delta > 0 ? '+' : ''}{tx.credits_delta.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tx.balance_after.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {t('আগের', 'Previous')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('পৃষ্ঠা', 'Page')} {page + 1}</span>
              <Button variant="ghost" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
                {t('পরের', 'Next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
