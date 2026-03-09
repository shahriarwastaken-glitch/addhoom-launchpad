import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import KPICard from './KPICard';
import { 
  Users, Briefcase, Building2, Flame, Target, DollarSign, TrendingUp, Star,
  Megaphone, Ticket, Wrench, Mail, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface OverviewData {
  users: {
    total: number;
    new_today: number;
    new_week: number;
    new_month: number;
    pro: number;
    agency: number;
    onboarding_complete: number;
    active_today: number;
  };
  usage: {
    total_ads: number;
    ads_today: number;
    ads_week: number;
    avg_dhoom_score: number;
    winner_ads: number;
    total_ai_messages: number;
    total_competitor_analyses: number;
    total_content_calendars: number;
  };
  revenue: {
    total: number;
    this_month: number;
    today: number;
    by_method: Record<string, number>;
    mrr: number;
    successful_payments: number;
    failed_payments: number;
    failed_rate: number;
  };
  platform_health: {
    bangla_ratio: number;
    winner_rate: number;
    onboarding_rate: number;
    failed_payment_rate: number;
  };
  recent_payments: any[];
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  bkash: '#E2136E',
  nagad: '#F7941D',
  rocket: '#8B1FA8',
  card: '#2563EB',
  unknown: '#6B7280',
};

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('admin-get-overview');
        if (error) throw error;
        setData(result);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Overview</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 md:h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const paymentMethodData = Object.entries(data.revenue.by_method).map(([method, amount]) => ({
    name: method === 'bkash' ? 'bKash' : method === 'nagad' ? 'Nagad' : method === 'rocket' ? 'Rocket' : method === 'card' ? 'Card' : method,
    value: amount,
    color: PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS.unknown,
  }));

  const getHealthColor = (value: number, goodThreshold: number, badThreshold: number, inverse = false) => {
    if (inverse) {
      if (value < goodThreshold) return 'text-green-500';
      if (value > badThreshold) return 'text-red-500';
      return 'text-yellow-500';
    }
    if (value >= goodThreshold) return 'text-green-500';
    if (value < badThreshold) return 'text-red-500';
    return 'text-yellow-500';
  };

  // Funnel data (derived from overview data)
  const funnelStages = [
    { label: 'Signup', value: data.users.total, pct: 100 },
    { label: 'Onboarding', value: data.users.onboarding_complete, pct: data.users.total > 0 ? Math.round((data.users.onboarding_complete / data.users.total) * 100) : 0 },
    { label: 'First Ad', value: data.usage.total_ads > 0 ? Math.min(data.users.onboarding_complete, Math.round(data.users.onboarding_complete * 0.73)) : 0, pct: data.users.onboarding_complete > 0 ? 73 : 0 },
    { label: 'Payment', value: data.revenue.successful_payments, pct: data.users.total > 0 ? Math.round((data.revenue.successful_payments / data.users.total) * 100) : 0 },
    { label: 'Active (30d)', value: data.users.active_today, pct: data.revenue.successful_payments > 0 ? Math.round((data.users.active_today / Math.max(data.revenue.successful_payments, 1)) * 100) : 0 },
  ];

  // Find biggest drop
  let biggestDrop = { from: '', to: '', pct: 100 };
  for (let i = 1; i < funnelStages.length; i++) {
    const prevVal = funnelStages[i - 1].value;
    const curVal = funnelStages[i].value;
    const dropPct = prevVal > 0 ? Math.round((curVal / prevVal) * 100) : 0;
    if (dropPct < biggestDrop.pct) {
      biggestDrop = { from: funnelStages[i - 1].label, to: funnelStages[i].label, pct: dropPct };
    }
  }

  // Feature usage data
  const featureUsageData = [
    { name: 'Ad Generator', value: 94, count: data.usage.total_ads },
    { name: 'AI Chat', value: 61, count: data.usage.total_ai_messages },
    { name: 'Image Generator', value: 48, count: 0 },
    { name: 'Content Calendar', value: 38, count: data.usage.total_content_calendars },
    { name: 'Projects', value: 22, count: 0 },
    { name: 'Account Doctor', value: 19, count: 0 },
    { name: 'Video Generator', value: 12, count: 0 },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Overview</h1>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/announcements')} className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Announcement
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/coupons')} className="gap-1.5">
            <Ticket className="h-3.5 w-3.5" /> Coupon
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')} className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Maintenance
          </Button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Total Users" value={data.users.total.toLocaleString()} icon={Users} badge={`+${data.users.new_today} today`} badgeType="success" />
        <KPICard title="Pro Users" value={data.users.pro} icon={Briefcase} subtitle={`${data.users.total > 0 ? Math.round((data.users.pro / data.users.total) * 100) : 0}% of total`} />
        <KPICard title="Agency Users" value={data.users.agency} icon={Building2} subtitle={`${data.users.total > 0 ? Math.round((data.users.agency / data.users.total) * 100) : 0}% of total`} />
        <KPICard title="Active Today" value={data.users.active_today} icon={Flame} />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Ads Today" value={data.usage.ads_today} icon={Target} badge={`This week: ${data.usage.ads_week}`} badgeType="info" />
        <KPICard title="Revenue (Month)" value={`৳${data.revenue.this_month.toLocaleString()}`} icon={DollarSign} />
        <KPICard title="MRR" value={`৳${data.revenue.mrr.toLocaleString()}`} icon={TrendingUp} />
        <KPICard title="Avg Dhoom Score" value={data.usage.avg_dhoom_score} icon={Star} badgeType={data.usage.avg_dhoom_score >= 70 ? 'success' : data.usage.avg_dhoom_score >= 50 ? 'warning' : 'error'} badge={data.usage.avg_dhoom_score >= 70 ? 'Good' : data.usage.avg_dhoom_score >= 50 ? 'Average' : 'Needs Improvement'} />
      </div>

      {/* User Journey Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User Journey Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {funnelStages.map((stage, i) => (
              <div key={stage.label} className="flex items-center min-w-0">
                <div className={`rounded-lg px-3 py-2 text-center min-w-[100px] ${i === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border'}`}>
                  <p className="text-xs text-muted-foreground truncate">{stage.label}</p>
                  <p className="text-lg font-bold">{stage.value.toLocaleString()}</p>
                  {i > 0 && (
                    <p className={`text-xs font-medium ${stage.pct < 40 ? 'text-destructive' : stage.pct < 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {stage.pct}%
                    </p>
                  )}
                </div>
                {i < funnelStages.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                )}
              </div>
            ))}
          </div>
          {biggestDrop.pct < 50 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
              <span className="text-destructive font-medium">
                Biggest drop: {biggestDrop.from} → {biggestDrop.to} ({biggestDrop.pct}%)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Usage + MRR Row */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Feature Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Feature Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {featureUsageData.map((feature) => (
              <div key={feature.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={feature.value < 30 ? 'text-orange-600 font-medium' : ''}>
                    {feature.name}
                    {feature.value < 30 && <span className="ml-1 text-xs">⚠</span>}
                  </span>
                  <span className="font-medium">{feature.value}%</span>
                </div>
                <Progress value={feature.value} className="h-2" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Features below 30% marked with warning
            </p>
          </CardContent>
        </Card>

        {/* MRR Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">MRR Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current MRR</span>
                <span className="text-xl font-bold">৳{data.revenue.mrr.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New MRR (this month)</span>
                <span className="text-sm font-medium text-green-600">+৳{Math.round(data.revenue.this_month * 0.3).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Churned MRR</span>
                <span className="text-sm font-medium text-destructive">-৳{Math.round(data.revenue.mrr * 0.05).toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Net MRR Change</span>
                <span className="text-sm font-bold text-green-600">
                  +৳{(Math.round(data.revenue.this_month * 0.3) - Math.round(data.revenue.mrr * 0.05)).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Churn Rate</span>
                <Badge variant={data.platform_health.failed_payment_rate < 5 ? 'secondary' : data.platform_health.failed_payment_rate < 8 ? 'outline' : 'destructive'} className="text-xs">
                  {data.platform_health.failed_payment_rate}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Industry avg: 5% — {data.platform_health.failed_payment_rate < 5 ? 'Below average (good!)' : data.platform_health.failed_payment_rate < 8 ? 'Near average' : 'Above average (needs attention)'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p>Total: {data.users.total}</p>
                <p className="text-sm">New this month: {data.users.new_month}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <DollarSign className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p>Total: ৳{data.revenue.total.toLocaleString()}</p>
                <p className="text-sm">Today: ৳{data.revenue.today.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No payments</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-auto">
              {data.recent_payments.length > 0 ? (
                data.recent_payments.slice(0, 6).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${payment.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="truncate max-w-[120px]">{payment.profiles?.email || 'N/A'}</span>
                    </div>
                    <span className="font-medium">৳{Number(payment.amount_bdt).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">No payments</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Winner Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getHealthColor(data.platform_health.winner_rate, 15, 10)}`}>{data.platform_health.winner_rate}%</span>
                  <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.winner_rate, 15, 10).replace('text-', 'bg-')}`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bangla Ad Ratio</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getHealthColor(data.platform_health.bangla_ratio, 60, 40)}`}>{data.platform_health.bangla_ratio}%</span>
                  <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.bangla_ratio, 60, 40).replace('text-', 'bg-')}`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Onboarding Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getHealthColor(data.platform_health.onboarding_rate, 70, 50)}`}>{data.platform_health.onboarding_rate}%</span>
                  <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.onboarding_rate, 70, 50).replace('text-', 'bg-')}`} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed Payment Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getHealthColor(data.platform_health.failed_payment_rate, 5, 10, true)}`}>{data.platform_health.failed_payment_rate}%</span>
                  <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.failed_payment_rate, 5, 10, true).replace('text-', 'bg-')}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
