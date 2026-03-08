import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export async function verifyAdmin(
  req: Request,
  supabaseClient: SupabaseClient
): Promise<AdminUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw { code: 401, message_bn: 'অনুগ্রহ করে লগইন করুন।', message_en: 'Please log in.' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    throw { code: 401, message_bn: 'সেশন মেয়াদোত্তীর্ণ।', message_en: 'Session expired.' };
  }

  // Check if user is in admin_users table
  const { data: adminUser, error: adminError } = await supabaseClient
    .from('admin_users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  if (adminError || !adminUser) {
    throw { code: 403, message_bn: 'অ্যাডমিন অ্যাক্সেস প্রয়োজন।', message_en: 'Admin access required.' };
  }

  return adminUser as AdminUser;
}

export async function verifySuperAdmin(
  req: Request,
  supabaseClient: SupabaseClient
): Promise<AdminUser> {
  const admin = await verifyAdmin(req, supabaseClient);
  
  if (admin.role !== 'super_admin') {
    throw { code: 403, message_bn: 'সুপার অ্যাডমিন অ্যাক্সেস প্রয়োজন।', message_en: 'Super admin access required.' };
  }

  return admin;
}
