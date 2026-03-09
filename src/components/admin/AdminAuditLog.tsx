import { useState, useEffect } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  admin_id: string | null;
  action: string;
  target_user_id: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
  admin_email?: string;
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchLogs(); }, [actionFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get admin emails
      const adminIds = [...new Set((data || []).filter(d => d.admin_id).map(d => d.admin_id))];
      let adminMap: Record<string, string> = {};
      
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('admin_users')
          .select('id, email')
          .in('id', adminIds as string[]);

        admins?.forEach(a => { adminMap[a.id] = a.email || 'Unknown'; });
      }

      setLogs((data || []).map(entry => ({
        ...entry,
        admin_email: entry.admin_id ? adminMap[entry.admin_id] || 'Unknown' : 'System',
      })));
    } catch (err: any) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = 'Timestamp,Admin,Action,Target,Old Value,New Value,Reason\n';
    const rows = logs.map(l => 
      `"${new Date(l.created_at).toLocaleString()}","${l.admin_email || ''}","${l.action}","${l.target_user_id || ''}","${l.old_value || ''}","${l.new_value || ''}","${l.reason || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (action.includes('update') || action.includes('change')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Record of all admin activities</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          placeholder="To"
        />
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No audit entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{entry.admin_email}</TableCell>
                      <TableCell>
                        <Badge className={getActionColor(entry.action)}>{entry.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        {entry.old_value && entry.new_value ? (
                          <span>{entry.old_value} → {entry.new_value}</span>
                        ) : entry.reason ? (
                          <span>{entry.reason}</span>
                        ) : entry.new_value ? (
                          <span>{entry.new_value}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
