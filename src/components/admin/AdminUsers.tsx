import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  created_at: string;
  ads_count: number;
  workspace_count: number;
  total_spent_bdt: number;
  last_active: string | null;
}

interface UserDetail {
  profile: any;
  workspaces: any[];
  recent_ads: any[];
  payments: any[];
  usage_summary: {
    by_feature: Record<string, number>;
    total_uses: number;
  };
  stats: any;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        plan,
        sort,
        ...(search && { search }),
      });
      
      const { data, error } = await supabase.functions.invoke(`admin-get-users?${params}`);
      if (error) throw error;
      
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: any) {
      toast.error(err.message || 'ব্যবহারকারী লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [plan, sort]);

  const handleSearch = () => {
    fetchUsers(1);
  };

  const fetchUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setSheetOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-user-detail', {
        body: { user_id: userId },
      });
      if (error) throw error;
      setSelectedUser(data);
    } catch (err: any) {
      toast.error(err.message || 'বিস্তারিত লোড করতে সমস্যা হয়েছে।');
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      // Fetch all users without pagination
      const { data, error } = await supabase.functions.invoke('admin-get-users?limit=10000');
      if (error) throw error;

      const rows = data.users.map((u: UserData) => [
        u.full_name || '',
        u.email || '',
        u.plan,
        u.ads_count,
        u.last_active ? new Date(u.last_active).toISOString() : '',
        u.total_spent_bdt,
        new Date(u.created_at).toISOString(),
      ]);

      const csv = [
        ['Name', 'Email', 'Plan', 'Ads Generated', 'Last Active', 'Total Spent BDT', 'Joined Date'],
        ...rows,
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `addhoom-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV ডাউনলোড হয়েছে।');
    } catch (err: any) {
      toast.error('Export করতে সমস্যা হয়েছে।');
    }
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'agency': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'pro': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ব্যবহারকারী</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] max-w-md flex gap-2">
          <Input
            placeholder="ইমেইল বা নাম খুঁজুন"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={plan === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPlan('all')}
          >
            সব
          </Button>
          <Button
            variant={plan === 'pro' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPlan('pro')}
          >
            Pro
          </Button>
          <Button
            variant={plan === 'agency' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPlan('agency')}
          >
            Agency
          </Button>
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="সর্ট করুন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">সর্বশেষ</SelectItem>
            <SelectItem value="oldest">সবচেয়ে পুরাতন</SelectItem>
            <SelectItem value="most_active">সবচেয়ে সক্রিয়</SelectItem>
            <SelectItem value="highest_value">সর্বোচ্চ মূল্য</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ব্যবহারকারী</TableHead>
              <TableHead>প্ল্যান</TableHead>
              <TableHead>বিজ্ঞাপন</TableHead>
              <TableHead>শেষ সক্রিয়</TableHead>
              <TableHead>মোট খরচ</TableHead>
              <TableHead>যোগদান</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  কোনো ব্যবহারকারী পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow 
                  key={user.id} 
                  className="cursor-pointer hover:bg-primary/5"
                  onClick={() => fetchUserDetail(user.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.full_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPlanBadgeClass(user.plan)}>
                      {user.plan === 'agency' ? 'Agency' : user.plan === 'pro' ? 'Pro' : 'Free'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.ads_count}</TableCell>
                  <TableCell>
                    {user.last_active 
                      ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true, locale: bn })
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>৳{user.total_spent_bdt.toLocaleString()}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('bn-BD')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => fetchUsers(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>ব্যবহারকারী বিস্তারিত</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedUser && (
            <div className="mt-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.profile.full_name || 'N/A'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.profile.email}</p>
                </div>
                <Badge className={getPlanBadgeClass(selectedUser.profile.plan)}>
                  {selectedUser.profile.plan}
                </Badge>
              </div>

              <Tabs defaultValue="summary">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1">সারসংক্ষেপ</TabsTrigger>
                  <TabsTrigger value="ads" className="flex-1">বিজ্ঞাপন</TabsTrigger>
                  <TabsTrigger value="payments" className="flex-1">পেমেন্ট</TabsTrigger>
                  <TabsTrigger value="usage" className="flex-1">ব্যবহার</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">যোগদান</div>
                      <div className="font-medium">
                        {new Date(selectedUser.stats.joined_date).toLocaleDateString('bn-BD')}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">শেষ সক্রিয়</div>
                      <div className="font-medium">
                        {selectedUser.stats.last_active 
                          ? formatDistanceToNow(new Date(selectedUser.stats.last_active), { addSuffix: true, locale: bn })
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">মোট বিজ্ঞাপন</div>
                      <div className="font-medium">{selectedUser.stats.total_ads}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-sm text-muted-foreground">গড় ধুম স্কোর</div>
                      <div className="font-medium">{selectedUser.stats.avg_dhoom_score || 'N/A'}</div>
                    </div>
                  </div>

                  {selectedUser.workspaces.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Workspaces</h4>
                      {selectedUser.workspaces.map((ws: any) => (
                        <div key={ws.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                          <div className="font-medium">{ws.shop_name}</div>
                          <div className="text-muted-foreground">{ws.industry} • {ws.platform}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ads" className="space-y-2 mt-4">
                  {selectedUser.recent_ads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">কোনো বিজ্ঞাপন নেই</div>
                  ) : (
                    selectedUser.recent_ads.map((ad: any) => (
                      <div key={ad.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-sm line-clamp-2">{ad.headline || 'N/A'}</div>
                          {ad.is_winner && <span className="text-yellow-500">⭐</span>}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {ad.dhoom_score && (
                            <Badge variant="outline" className="text-xs">
                              Score: {ad.dhoom_score}
                            </Badge>
                          )}
                          {ad.framework && (
                            <Badge variant="outline" className="text-xs">
                              {ad.framework}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-2 mt-4">
                  {selectedUser.payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">কোনো পেমেন্ট নেই</div>
                  ) : (
                    selectedUser.payments.map((payment: any) => (
                      <div key={payment.id} className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">৳{Number(payment.amount_bdt).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {payment.method} • {payment.plan_purchased}
                          </div>
                        </div>
                        <Badge variant={payment.status === 'success' ? 'default' : 'destructive'}>
                          {payment.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="usage" className="space-y-2 mt-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    মোট ব্যবহার: {selectedUser.usage_summary.total_uses}
                  </div>
                  {Object.entries(selectedUser.usage_summary.by_feature).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">কোনো ব্যবহার নেই</div>
                  ) : (
                    Object.entries(selectedUser.usage_summary.by_feature).map(([feature, count]) => (
                      <div key={feature} className="flex items-center justify-between py-2">
                        <span className="text-sm">{feature}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ 
                                width: `${Math.min((count as number / selectedUser.usage_summary.total_uses) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{count as number}</span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
