import { useState, useEffect } from 'react';
import { Mail, Edit, Eye, Send, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  variables: any[];
  is_active: boolean;
  updated_at: string;
}

const DEFAULT_TEMPLATES = [
  { template_key: 'welcome', name: 'Welcome Email', subject: 'Welcome to AdDhoom!', html_content: '<h1>Welcome!</h1><p>Hello {{user_name}}, welcome to AdDhoom.</p>' },
  { template_key: 'payment_success', name: 'Payment Success', subject: 'Payment Confirmed', html_content: '<h1>Payment Confirmed</h1><p>Your {{plan_name}} plan is now active.</p>' },
  { template_key: 'payment_failed', name: 'Payment Failed', subject: 'Payment Failed', html_content: '<h1>Payment Issue</h1><p>Your payment could not be processed.</p>' },
  { template_key: 'subscription_expiring', name: 'Subscription Expiring', subject: 'Your subscription expires soon', html_content: '<h1>Renewal Reminder</h1><p>Your {{plan_name}} plan renews on {{renewal_date}}.</p>' },
  { template_key: 'password_reset', name: 'Password Reset', subject: 'Reset your password', html_content: '<h1>Password Reset</h1><p>Click the link to reset your password.</p>' },
  { template_key: 'limit_reached', name: 'Limit Reached', subject: 'You\'ve reached your limit', html_content: '<h1>Limit Reached</h1><p>You\'ve reached your {{plan_name}} plan limit.</p>' },
];

const VARIABLES = ['{{user_name}}', '{{plan_name}}', '{{renewal_date}}', '{{support_email}}', '{{dashboard_url}}'];

export default function AdminEmails() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed defaults
        const { error: seedError } = await supabase
          .from('email_templates')
          .insert(DEFAULT_TEMPLATES.map(t => ({
            ...t,
            variables: VARIABLES,
          })));

        if (seedError) console.error('Seed error:', seedError);
        const { data: newData } = await supabase.from('email_templates').select('*').order('name');
        setTemplates((newData || []) as EmailTemplate[]);
      } else {
        setTemplates(data as EmailTemplate[]);
      }
    } catch (err: any) {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (template: EmailTemplate) => {
    setEditing(template);
    setEditSubject(template.subject);
    setEditContent(template.html_content);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editSubject,
          html_content: editContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);

      if (error) throw error;
      toast.success('Template saved');
      setEditing(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error('Failed to save template');
    }
  };

  const insertVariable = (variable: string) => {
    setEditContent(prev => prev + variable);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-xl md:text-2xl font-bold">Email Templates</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">{editing.name}</h1>
            <p className="text-muted-foreground">Edit email template</p>
          </div>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <Label>Subject Line</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div>
              <Label>Variables</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {VARIABLES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 font-mono transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>HTML Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Preview</Label>
              <div className="flex gap-1">
                <Button size="sm" variant={previewMode === 'desktop' ? 'default' : 'outline'} onClick={() => setPreviewMode('desktop')}>Desktop</Button>
                <Button size="sm" variant={previewMode === 'mobile' ? 'default' : 'outline'} onClick={() => setPreviewMode('mobile')}>Mobile</Button>
              </div>
            </div>
            <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
              <div className="p-4 bg-muted/30 border-b">
                <p className="text-xs text-muted-foreground">Subject:</p>
                <p className="text-sm font-medium">{editSubject}</p>
              </div>
              <div className="p-6" dangerouslySetInnerHTML={{ __html: editContent.replace(/\{\{user_name\}\}/g, 'John Doe').replace(/\{\{plan_name\}\}/g, 'Pro').replace(/\{\{renewal_date\}\}/g, '2025-12-31').replace(/\{\{support_email\}\}/g, 'hello@addhoom.com').replace(/\{\{dashboard_url\}\}/g, '#') }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground">Customize automated transactional emails</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 truncate">{template.subject}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Last edited: {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'Never'}
              </p>
              <Button size="sm" variant="outline" className="w-full" onClick={() => startEditing(template)}>
                <Edit className="h-3 w-3 mr-2" />
                Edit Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
