import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySuperAdmin } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await verifySuperAdmin(req, supabase);

    if (req.method === 'GET') {
      // List all admins
      const { data: admins, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ admins }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const { action, email, role, admin_id } = await req.json();

      if (action === 'add') {
        if (!email) {
          throw { code: 400, message_bn: 'ইমেইল প্রয়োজন।', message_en: 'Email is required.' };
        }

        // Find user by email in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', email)
          .single();

        if (profileError || !profile) {
          throw { code: 404, message_bn: 'ব্যবহারকারী পাওয়া যায়নি। প্রথমে তাদের AdDhoom অ্যাকাউন্ট তৈরি করতে হবে।', message_en: 'User not found. They must create an AdDhoom account first.' };
        }

        // Check if already admin
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', profile.id)
          .single();

        if (existing) {
          throw { code: 409, message_bn: 'এই ব্যবহারকারী ইতিমধ্যে অ্যাডমিন।', message_en: 'This user is already an admin.' };
        }

        // Add as admin
        const { error: insertError } = await supabase
          .from('admin_users')
          .insert({
            id: profile.id,
            email: profile.email,
            role: role || 'admin',
          });

        if (insertError) throw insertError;

        // Log action
        await supabase.from('admin_actions').insert({
          admin_id: admin.id,
          action: 'add_admin',
          target_user_id: profile.id,
          new_value: role || 'admin',
        });

        return new Response(
          JSON.stringify({
            success: true,
            message_bn: 'অ্যাডমিন সফলভাবে যোগ করা হয়েছে।',
            message_en: 'Admin added successfully.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'remove') {
        if (!admin_id) {
          throw { code: 400, message_bn: 'admin_id প্রয়োজন।', message_en: 'admin_id is required.' };
        }

        // Prevent self-removal
        if (admin_id === admin.id) {
          throw { code: 400, message_bn: 'আপনি নিজেকে সরাতে পারবেন না।', message_en: 'You cannot remove yourself.' };
        }

        const { error: deleteError } = await supabase
          .from('admin_users')
          .delete()
          .eq('id', admin_id);

        if (deleteError) throw deleteError;

        // Log action
        await supabase.from('admin_actions').insert({
          admin_id: admin.id,
          action: 'remove_admin',
          target_user_id: admin_id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message_bn: 'অ্যাডমিন সফলভাবে সরানো হয়েছে।',
            message_en: 'Admin removed successfully.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw { code: 400, message_bn: 'অবৈধ অ্যাকশন।', message_en: 'Invalid action.' };
    }

    throw { code: 405, message_bn: 'Method not allowed', message_en: 'Method not allowed' };
  } catch (error: any) {
    const status = error.code || 500;
    return new Response(
      JSON.stringify({
        error: true,
        code: status,
        message_bn: error.message_bn || 'কিছু একটা সমস্যা হয়েছে।',
        message_en: error.message_en || error.message || 'Something went wrong.',
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
