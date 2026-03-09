import { useState, useEffect } from 'react';
import { Plus, Megaphone, Edit, Trash2, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  type: string;
  target_audience: string;
  target_plans: string[] | null;
  location: string[] | null;
  is_dismissible: boolean;
  link_url: string | null;
  link_text: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  view_count: number;
  dismiss_count: number;
  click_count: number;
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  feature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const TYPE_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  critical: 'Critical',
  feature: 'New Feature',
};

const emptyForm = {
  title: '',
  description: '',
  type: 'info',
  target_audience: 'all',
  target_plans: [] as string[],
  location: ['dashboard'],
  is_dismissible: true,
  link_url: '',
  link_text: '',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
  is_active: true,
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (err: any) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        type: form.type,
        target_audience: form.target_audience,
        target_plans: form.target_plans.length > 0 ? form.target_plans : null,
        location: form.location,
        is_dismissible: form.is_dismissible,
        link_url: form.link_url || null,
        link_text: form.link_text || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Announcement updated');
      } else {
        const { error } = await supabase.from('announcements').insert([payload]);
        if (error) throw error;
        toast.success('Announcement created');
      }

      setShowModal(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      description: a.description || '',
      type: a.type,
      target_audience: a.target_audience,
      target_plans: a.target_plans || [],
      location: a.location || ['dashboard'],
      is_dismissible: a.is_dismissible,
      link_url: a.link_url || '',
      link_text: a.link_text || '',
      starts_at: a.starts_at ? new Date(a.starts_at).toISOString().slice(0, 16) : '',
      ends_at: a.ends_at ? new Date(a.ends_at).toISOString().slice(0, 16) : '',
      is_active: a.is_active,
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const toggleLocation = (loc: string) => {
    setForm(prev => ({
      ...prev,
      location: prev.location.includes(loc)
        ? prev.location.filter(l => l !== loc)
        : [...prev.location, loc]
    }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Announcements</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Push messages to users</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowModal(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-48 truncate">{a.title}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[a.type] || ''}>{TYPE_LABELS[a.type] || a.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{a.target_audience}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? 'default' : 'secondary'}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span>{a.view_count} views</span>
                      {a.dismiss_count > 0 && <span className="text-muted-foreground ml-2">· {a.dismiss_count} dismissed</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {announcements.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No announcements yet</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Full message..." rows={3} />
            </div>
            <div>
              <Label>Type</Label>
              <RadioGroup value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))} className="flex flex-wrap gap-4 mt-2">
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={`type-${key}`} />
                    <Label htmlFor={`type-${key}`}>{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label>Target Audience</Label>
              <RadioGroup value={form.target_audience} onValueChange={(v) => setForm(p => ({ ...p, target_audience: v }))} className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="target-all" />
                  <Label htmlFor="target-all">All Users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific_plans" id="target-plans" />
                  <Label htmlFor="target-plans">Specific Plans</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new_users" id="target-new" />
                  <Label htmlFor="target-new">New Users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive_users" id="target-inactive" />
                  <Label htmlFor="target-inactive">Inactive Users</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Location</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {['dashboard', 'all_pages', 'login'].map(loc => (
                  <div key={loc} className="flex items-center space-x-2">
                    <Checkbox checked={form.location.includes(loc)} onCheckedChange={() => toggleLocation(loc)} id={`loc-${loc}`} />
                    <Label htmlFor={`loc-${loc}`} className="capitalize">{loc.replace('_', ' ')}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_dismissible} onCheckedChange={(v) => setForm(p => ({ ...p, is_dismissible: v }))} />
              <Label>Dismissible</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Link URL (optional)</Label>
                <Input value={form.link_url} onChange={(e) => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Link Text</Label>
                <Input value={form.link_text} onChange={(e) => setForm(p => ({ ...p, link_text: e.target.value }))} placeholder="Learn more" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm(p => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div className={`mt-2 p-4 rounded-lg border ${
                form.type === 'info' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                form.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                form.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                form.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{form.title || 'Announcement Title'}</p>
                    {form.description && <p className="text-sm mt-1 opacity-80">{form.description}</p>}
                    {form.link_text && <a className="text-sm font-medium underline mt-1 inline-block">{form.link_text}</a>}
                  </div>
                  {form.is_dismissible && <X className="h-4 w-4 opacity-50" />}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
