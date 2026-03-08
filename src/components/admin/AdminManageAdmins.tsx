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
  SelectValue,
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import AdminVerificationModal from './AdminVerificationModal';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export default function AdminManageAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Verification modal state
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'add' | 'remove';
    payload: any;
    label: string;
  } | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-admins', {
        method: 'GET',
      });
      if (error) throw error;
      setAdmins(data.admins || []);
    } catch (err: any) {
      toast.error(err.message || 'অ্যাডমিন লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const initiateAddAdmin = () => {
    if (!newEmail.trim()) {
      toast.error('ইমেইল প্রয়োজন।');
      return;
    }
    
    setPendingAction({
      type: 'add',
      payload: { email: newEmail.trim(), role: newRole },
      label: `${newEmail.trim()} কে ${newRole} হিসেবে যোগ করুন`,
    });
    setVerificationOpen(true);
  };

  const initiateRemoveAdmin = (adminId: string) => {
    const admin = admins.find(a => a.id === adminId);
    setPendingAction({
      type: 'remove',
      payload: { admin_id: adminId },
      label: `${admin?.email || 'এই অ্যাডমিন'} কে সরান`,
    });
    setVerificationOpen(true);
    setDeleteId(null);
  };

  const handleVerifiedAction = async (payload: any) => {
    if (!pendingAction) return;

    if (pendingAction.type === 'add') {
      setAdding(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-manage-admins', {
          body: { action: 'add', ...payload },
        });
        if (error) throw error;
        toast.success(data.message_bn || 'অ্যাডমিন যোগ করা হয়েছে।');
        setNewEmail('');
        fetchAdmins();
      } catch (err: any) {
        toast.error(err.message || 'অ্যাডমিন যোগ করতে সমস্যা হয়েছে।');
      } finally {
        setAdding(false);
      }
    } else if (pendingAction.type === 'remove') {
      setDeleting(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-manage-admins', {
          body: { action: 'remove', ...payload },
        });
        if (error) throw error;
        toast.success(data.message_bn || 'অ্যাডমিন সরানো হয়েছে।');
        fetchAdmins();
      } catch (err: any) {
        toast.error(err.message || 'অ্যাডমিন সরাতে সমস্যা হয়েছে।');
      } finally {
        setDeleting(false);
      }
    }

    setPendingAction(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">অ্যাডমিন ব্যবস্থাপনা</h1>

      {/* Add Admin Form */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold mb-4">নতুন অ্যাডমিন যোগ করুন</h3>
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="ইমেইল ঠিকানা"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={initiateAddAdmin} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" />
            যোগ করুন
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          নোট: ব্যবহারকারীর প্রথমে AdDhoom অ্যাকাউন্ট থাকতে হবে। যোগ করার জন্য ইমেইল ভেরিফিকেশন প্রয়োজন।
        </p>
      </div>

      {/* Admin Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ইমেইল</TableHead>
              <TableHead>ভূমিকা</TableHead>
              <TableHead>যোগদান</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  কোনো অ্যাডমিন নেই
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {admin.role === 'super_admin' ? (
                        <ShieldCheck className="h-4 w-4 text-purple-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                      <span>{admin.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={admin.role === 'super_admin' ? 'border-purple-500 text-purple-500' : ''}
                    >
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(admin.created_at).toLocaleDateString('bn-BD')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(admin.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>অ্যাডমিন সরান?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে এই অ্যাডমিনকে সরাতে চান? তারা আর অ্যাডমিন প্যানেলে প্রবেশ করতে পারবে না।
              এই পরিবর্তনের জন্য ইমেইল ভেরিফিকেশন প্রয়োজন হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteId && initiateRemoveAdmin(deleteId)}
              disabled={deleting}
            >
              {deleting ? 'সরানো হচ্ছে...' : 'ভেরিফাই করে সরান'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Modal */}
      <AdminVerificationModal
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        actionType={pendingAction?.type === 'add' ? 'add_admin' : 'remove_admin'}
        actionPayload={pendingAction?.payload}
        actionLabel={pendingAction?.label || ''}
        onVerified={handleVerifiedAction}
      />
    </div>
  );
}
