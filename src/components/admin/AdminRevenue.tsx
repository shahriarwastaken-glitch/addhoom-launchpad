import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import KPICard from './KPICard';
import { DollarSign, TrendingUp, AlertCircle, Download, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RevenueData {
  period: string;
  total_revenue: number;
  transaction_count: number;
  daily_revenue: { date: string; amount_bdt: number; count: number }[];
  by_plan: Record<string, number>;
  by_method: Record<string, number>;
  by_cycle: Record<string, number>;
  top_users: { user_id: string; email: string; total: number; plan: string }[];
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  bkash: '#E2136E',
  nagad: '#F7941D',
  rocket: '#8B1FA8',
  card: '#2563EB',
  unknown: '#6B7280',
};

const periods = [
  { value: 'today', label: 'আজ' },
  { value: 'week', label: 'এই সপ্তাহ' },
  { value: 'month', label: 'এই মাস' },
  { value: 'year', label: 'এই বছর' },
  { value: 'all', label: 'সব' },
];

export default function AdminRevenue() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.functions.invoke(
          `admin-get-revenue?period=${period}`
        );
        if (error) throw error;
        setData(result);
      } catch (err: any) {
        toast.error(err.message || 'ডেটা লোড করতে সমস্যা হয়েছে।');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const exportCSV = async () => {
    if (!data) return;
    
    try {
      const rows = data.daily_revenue.map(d => [
        d.date,
        d.amount_bdt,
        d.count,
      ]);

      const csv = [
        ['Date', 'Amount BDT', 'Transaction Count'],
        ...rows,
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `addhoom-revenue-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV ডাউনলোড হয়েছে।');
    } catch (err) {
      toast.error('Export করতে সমস্যা হয়েছে।');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">রাজস্ব</h1>
        <div className="flex gap-2">
          {periods.map(p => (
            <Skeleton key={p.value} className="h-9 w-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const methodData = Object.entries(data.by_method).map(([method, amount]) => ({
    name: method === 'bkash' ? 'bKash' : method === 'nagad' ? 'Nagad' : method === 'rocket' ? 'Rocket' : method === 'card' ? 'Card' : method,
    value: amount,
    color: PAYMENT_METHOD_COLORS[method] || PAYMENT_METHOD_COLORS.unknown,
  }));

  const proRevenue = data.by_plan.pro || 0;
  const agencyRevenue = data.by_plan.agency || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">রাজস্ব</h1>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {periods.map(p => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="মোট রাজস্ব"
          value={`৳${data.total_revenue.toLocaleString()}`}
          icon={DollarSign}
        />
        <KPICard
          title="লেনদেন সংখ্যা"
          value={data.transaction_count}
          icon={TrendingUp}
        />
        <KPICard
          title="Pro রাজস্ব"
          value={`৳${proRevenue.toLocaleString()}`}
          icon={DollarSign}
          subtitle={`${data.total_revenue > 0 ? Math.round((proRevenue / data.total_revenue) * 100) : 0}%`}
        />
        <KPICard
          title="Agency রাজস্ব"
          value={`৳${agencyRevenue.toLocaleString()}`}
          icon={DollarSign}
          subtitle={`${data.total_revenue > 0 ? Math.round((agencyRevenue / data.total_revenue) * 100) : 0}%`}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold mb-4">রাজস্বের ধারা</h3>
        {data.daily_revenue.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`৳${value.toLocaleString()}`, 'রাজস্ব']}
                  labelFormatter={(label) => `তারিখ: ${label}`}
                />
                <Bar dataKey="amount_bdt" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-muted-foreground">
            এই সময়ে কোনো রাজস্ব নেই
          </div>
        )}
      </div>

      {/* Bottom Panels */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Plan Split */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">প্ল্যান অনুযায়ী রাজস্ব</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div>
                <div className="font-medium">Pro</div>
                <div className="text-sm text-muted-foreground">৳2,999/মাস</div>
              </div>
              <div className="text-right">
                <div className="font-bold">৳{proRevenue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
              <div>
                <div className="font-medium">Agency</div>
                <div className="text-sm text-muted-foreground">৳7,999/মাস</div>
              </div>
              <div className="text-right">
                <div className="font-bold">৳{agencyRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">পেমেন্ট পদ্ধতি</h3>
          {methodData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              কোনো ডেটা নেই
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold mb-4">সর্বোচ্চ মূল্যের ব্যবহারকারী</h3>
          <div className="space-y-2 max-h-48 overflow-auto">
            {data.top_users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">কোনো ডেটা নেই</div>
            ) : (
              data.top_users.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-6">
                      {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : index === 1 ? <Trophy className="h-4 w-4 text-slate-400" /> : index === 2 ? <Trophy className="h-4 w-4 text-amber-700" /> : `#${index + 1}`}
                    </span>
                    <span className="text-sm truncate max-w-[120px]">{user.email}</span>
                  </div>
                  <span className="font-medium text-sm">৳{user.total.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
