import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import KPICard from './KPICard';
import { 
  Users, 
  Briefcase, 
  Building2, 
  Flame,
  Target,
  DollarSign,
  TrendingUp,
  Star,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('admin-get-overview');
        if (error) throw error;
        setData(result);
      } catch (err: any) {
        toast.error(err.message || 'ডেটা লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">ওভারভিউ</h1>
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

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">ওভারভিউ</h1>

      {/* KPI Cards Row 1 - User Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          title="মোট ব্যবহারকারী"
          value={data.users.total.toLocaleString()}
          icon={Users}
          badge={`↑ +${data.users.new_today} আজ`}
          badgeType="success"
        />
        <KPICard
          title="Pro ব্যবহারকারী"
          value={data.users.pro}
          icon={Briefcase}
          subtitle={`${data.users.total > 0 ? Math.round((data.users.pro / data.users.total) * 100) : 0}% মোটের`}
        />
        <KPICard
          title="Agency ব্যবহারকারী"
          value={data.users.agency}
          icon={Building2}
          subtitle={`${data.users.total > 0 ? Math.round((data.users.agency / data.users.total) * 100) : 0}% মোটের`}
        />
        <KPICard
          title="আজ সক্রিয়"
          value={data.users.active_today}
          icon={Flame}
        />
      </div>

      {/* KPI Cards Row 2 - Business Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="আজ বিজ্ঞাপন তৈরি"
          value={data.usage.ads_today}
          icon={Target}
          badge={`এই সপ্তাহে ${data.usage.ads_week}`}
          badgeType="info"
        />
        <KPICard
          title="এই মাসের রাজস্ব"
          value={`৳${data.revenue.this_month.toLocaleString()}`}
          icon={DollarSign}
        />
        <KPICard
          title="MRR"
          value={`৳${data.revenue.mrr.toLocaleString()}`}
          icon={TrendingUp}
        />
        <KPICard
          title="গড় ধুম স্কোর"
          value={data.usage.avg_dhoom_score}
          icon={Star}
          badgeType={data.usage.avg_dhoom_score >= 70 ? 'success' : data.usage.avg_dhoom_score >= 50 ? 'warning' : 'error'}
          badge={data.usage.avg_dhoom_score >= 70 ? 'ভালো' : data.usage.avg_dhoom_score >= 50 ? 'মোটামুটি' : 'উন্নতি দরকার'}
        />
      </div>

      {/* Middle Row - Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Growth Placeholder */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">ব্যবহারকারী বৃদ্ধি</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>মোট: {data.users.total}</p>
              <p className="text-sm">এই মাসে নতুন: {data.users.new_month}</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">দৈনিক রাজস্ব</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>মোট: ৳{data.revenue.total.toLocaleString()}</p>
              <p className="text-sm">আজ: ৳{data.revenue.today.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - 3 Panels */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">পেমেন্ট পদ্ধতি</h3>
          {paymentMethodData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              কোনো পেমেন্ট নেই
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">সাম্প্রতিক পেমেন্ট</h3>
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
              <div className="text-center text-muted-foreground py-4">কোনো পেমেন্ট নেই</div>
            )}
          </div>
        </div>

        {/* Platform Health */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">সিস্টেম স্বাস্থ্য</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Winner Rate</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getHealthColor(data.platform_health.winner_rate, 15, 10)}`}>
                  {data.platform_health.winner_rate}%
                </span>
                <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.winner_rate, 15, 10).replace('text-', 'bg-')}`} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">বাংলা Ad Ratio</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getHealthColor(data.platform_health.bangla_ratio, 60, 40)}`}>
                  {data.platform_health.bangla_ratio}%
                </span>
                <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.bangla_ratio, 60, 40).replace('text-', 'bg-')}`} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Onboarding Rate</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getHealthColor(data.platform_health.onboarding_rate, 70, 50)}`}>
                  {data.platform_health.onboarding_rate}%
                </span>
                <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.onboarding_rate, 70, 50).replace('text-', 'bg-')}`} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Failed Payment Rate</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getHealthColor(data.platform_health.failed_payment_rate, 5, 10, true)}`}>
                  {data.platform_health.failed_payment_rate}%
                </span>
                <span className={`h-2 w-2 rounded-full ${getHealthColor(data.platform_health.failed_payment_rate, 5, 10, true).replace('text-', 'bg-')}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
