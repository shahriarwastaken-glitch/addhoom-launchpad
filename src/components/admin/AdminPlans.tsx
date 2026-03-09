import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Users, MoreVertical, Archive, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Plan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  color: string;
  is_popular: boolean;
  status: string;
  price_monthly_bdt: number;
  price_annual_bdt: number | null;
  trial_days: number;
  limits: Record<string, any>;
  features: any[];
  subscriber_count?: number;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    checkSuperAdmin();
    fetchPlans();
  }, []);

  const checkSuperAdmin = async () => {
    if (!profile?.id) return;
    
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', profile.id)
      .single();

    setIsSuperAdmin(data?.role === 'super_admin');
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          profiles!profiles_plan_key_fkey(count)
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Transform data to include subscriber count
      const plansWithCounts = data.map(plan => ({
        ...plan,
        subscriber_count: plan.profiles?.length || 0
      }));

      setPlans(plansWithCounts);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(price);
  };

  const calculateDiscount = (monthly: number, annual: number) => {
    if (!annual || annual >= monthly) return 0;
    return Math.round(((monthly - annual) / monthly) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">সক্রিয়</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">নিষ্ক্রিয়</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400">আর্কাইভ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLimitsPreview = (limits: Record<string, any>) => {
    const keyLimits = [];
    
    if (limits.ad_generation) {
      if (limits.ad_generation.type === 'unlimited') {
        keyLimits.push('বিজ্ঞাপন: সীমাহীন');
      } else if (limits.ad_generation.type === 'number') {
        keyLimits.push(`বিজ্ঞাপন: ${limits.ad_generation.value}/${limits.ad_generation.period === 'month' ? 'মাস' : 'মোট'}`);
      }
    }

    if (limits.video_generation) {
      if (limits.video_generation.type === 'unlimited') {
        keyLimits.push('ভিডিও: সীমাহীন');
      } else if (limits.video_generation.type === 'number') {
        keyLimits.push(`ভিডিও: ${limits.video_generation.value}/${limits.video_generation.period === 'month' ? 'মাস' : 'মোট'}`);
      }
    }

    if (limits.workspaces) {
      if (limits.workspaces.type === 'unlimited') {
        keyLimits.push('ওয়ার্কস্পেস: সীমাহীন');
      } else if (limits.workspaces.type === 'number') {
        keyLimits.push(`ওয়ার্কস্পেস: ${limits.workspaces.value}`);
      }
    }

    return keyLimits.slice(0, 3); // Show max 3
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">প্ল্যান ম্যানেজার</h1>
            <p className="text-muted-foreground">সাবস্ক্রিপশন প্ল্যান তৈরি ও পরিচালনা করুন</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">প্ল্যান ম্যানেজার</h1>
          <p className="text-muted-foreground">সাবস্ক্রিপশন প্ল্যান তৈরি ও পরিচালনা করুন</p>
        </div>
        {isSuperAdmin && (
          <Link to="/admin/plans/new">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              নতুন প্ল্যান তৈরি করুন
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className="relative overflow-hidden border-t-4 hover:shadow-lg transition-shadow"
            style={{ borderTopColor: plan.color }}
          >
            <CardContent className="p-7">
              {/* Top Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne' }}>
                    {plan.name}
                  </h3>
                  {plan.is_popular && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs mb-2">
                      সবচেয়ে জনপ্রিয়
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(plan.status)}
                    <span className="text-sm text-muted-foreground">
                      {plan.subscriber_count} জন গ্রাহক
                    </span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/plans/${plan.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          সম্পাদনা
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/plans/${plan.id}/subscribers`}>
                          <Users className="h-4 w-4 mr-2" />
                          গ্রাহক দেখুন
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        ডুপ্লিকেট করুন
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Archive className="h-4 w-4 mr-2" />
                        আর্কাইভ করুন
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Pricing Row */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-mono font-bold">
                    {formatPrice(plan.price_monthly_bdt)}
                  </span>
                  <span className="text-sm text-muted-foreground">/মাস</span>
                </div>
                {plan.price_annual_bdt && (
                  <p className="text-sm text-muted-foreground">
                    বার্ষিক: {formatPrice(plan.price_annual_bdt)}/মাস 
                    ({calculateDiscount(plan.price_monthly_bdt, plan.price_annual_bdt)}% সাশ্রয়)
                  </p>
                )}
              </div>

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
              )}

              {/* Limits Preview */}
              <div className="flex flex-wrap gap-1 mb-4">
                {getLimitsPreview(plan.limits).map((limit, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {limit}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  asChild
                  disabled={!isSuperAdmin}
                >
                  <Link to={`/admin/plans/${plan.id}/edit`}>
                    <Edit className="h-3 w-3 mr-1" />
                    সম্পাদনা
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  asChild
                >
                  <Link to={`/admin/plans/${plan.id}/subscribers`}>
                    <Users className="h-3 w-3 mr-1" />
                    গ্রাহক
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && !loading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">কোন প্ল্যান পাওয়া যায়নি</h3>
          <p className="text-muted-foreground mb-4">প্রথম প্ল্যান তৈরি করে শুরু করুন</p>
          {isSuperAdmin && (
            <Link to="/admin/plans/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                নতুন প্ল্যান তৈরি করুন
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}