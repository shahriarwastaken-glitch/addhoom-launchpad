import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanFormData {
  plan_key: string;
  name: string;
  description: string;
  color: string;
  is_popular: boolean;
  status: string;
  price_monthly_bdt: number;
  price_annual_bdt: number | null;
  trial_days: number;
  sslcommerz_plan_code: string;
  limits: Record<string, any>;
  features: any[];
  grandfather_policy: string;
}

const FEATURE_LIMITS = [
  {
    key: 'ad_generation',
    label: 'বিজ্ঞাপন কপি জেনারেশন',
    description: 'প্রতি মাসে কতটি বিজ্ঞাপন তৈরি করতে পারবে'
  },
  {
    key: 'image_generation',
    label: 'ইমেজ জেনারেশন',
    description: 'প্রতি মাসে কতটি ইমেজ তৈরি করতে পারবে'
  },
  {
    key: 'video_generation',
    label: 'ভিডিও জেনারেশন',
    description: 'প্রতি মাসে কতটি ভিডিও তৈরি করতে পারবে'
  },
  {
    key: 'workspaces',
    label: 'ওয়ার্কস্পেস',
    description: 'একসাথে কতটি শপ ম্যানেজ করতে পারবে'
  },
  {
    key: 'ai_chat',
    label: 'AI চ্যাট মেসেজ',
    description: 'প্রতিদিন কতটি মেসেজ পাঠাতে পারবে'
  },
  {
    key: 'competitor_intel',
    label: 'প্রতিযোগী বিশ্লেষণ',
    description: 'প্রতি মাসে কতটি বিশ্লেষণ করতে পারবে'
  },
  {
    key: 'account_doctor',
    label: 'অ্যাকাউন্ট ডক্টর',
    description: 'বিশ্লেষণ চালাতে পারবে কিনা'
  },
  {
    key: 'content_calendar',
    label: 'কনটেন্ট ক্যালেন্ডার',
    description: 'কনটেন্ট ক্যালেন্ডার ব্যবহার করতে পারবে'
  },
  {
    key: 'projects',
    label: 'প্রজেক্ট',
    description: 'কতটি প্রজেক্ট তৈরি করতে পারবে'
  }
];

const DEFAULT_FEATURES = [
  { name: 'সীমাহীন বিজ্ঞাপন কপি', enabled: true },
  { name: 'ধুম স্কোর বিশ্লেষণ', enabled: true },
  { name: 'AI চ্যাট বিশেষজ্ঞ', enabled: true },
  { name: 'কনটেন্ট ক্যালেন্ডার', enabled: true },
  { name: 'প্রতিযোগী বিশ্লেষণ', enabled: true },
  { name: 'অ্যাকাউন্ট ডক্টর', enabled: true },
  { name: 'ইমেজ জেনারেশন', enabled: true },
  { name: 'ভিডিও বিজ্ঞাপন', enabled: false },
  { name: 'হোয়াইট লেবেল রিপোর্ট', enabled: false },
  { name: 'দলগত অ্যাক্সেস', enabled: false },
  { name: 'অগ্রাধিকার সাপোর্ট', enabled: false },
  { name: 'API অ্যাক্সেস', enabled: false }
];

export default function AdminPlanForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customFeatures, setCustomFeatures] = useState<Array<{ name: string; enabled: boolean }>>([]);
  
  const [formData, setFormData] = useState<PlanFormData>({
    plan_key: '',
    name: '',
    description: '',
    color: '#FF5100',
    is_popular: false,
    status: 'active',
    price_monthly_bdt: 0,
    price_annual_bdt: null,
    trial_days: 0,
    sslcommerz_plan_code: '',
    limits: {},
    features: [...DEFAULT_FEATURES],
    grandfather_policy: 'next_cycle'
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchPlan(id);
    }
  }, [isEdit, id]);

  const fetchPlan = async (planId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;

      setFormData({
        ...data,
        price_annual_bdt: data.price_annual_bdt || null,
        limits: data.limits || {},
        features: data.features || [...DEFAULT_FEATURES]
      });
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast.error('Failed to load plan');
      navigate('/admin/plans');
    } finally {
      setLoading(false);
    }
  };

  const generatePlanKey = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('প্ল্যানের নাম আবশ্যক');
      return;
    }

    try {
      setSaving(true);
      
      const planData = {
        ...formData,
        plan_key: formData.plan_key || generatePlanKey(formData.name),
        price_annual_bdt: formData.price_annual_bdt || null
      };

      if (isEdit) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', id);

        if (error) throw error;
        toast.success('প্ল্যান সফলভাবে আপডেট হয়েছে');
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('নতুন প্ল্যান তৈরি হয়েছে');
      }

      navigate('/admin/plans');
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error(error.message || 'প্ল্যান সংরক্ষণে ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  const calculateDiscount = () => {
    if (!formData.price_annual_bdt || formData.price_annual_bdt >= formData.price_monthly_bdt) {
      return 0;
    }
    return Math.round(((formData.price_monthly_bdt - formData.price_annual_bdt) / formData.price_monthly_bdt) * 100);
  };

  const updateLimit = (featureKey: string, type: string, value?: number, period?: string) => {
    setFormData(prev => ({
      ...prev,
      limits: {
        ...prev.limits,
        [featureKey]: type === 'disabled' ? { type: 'disabled' } : 
                     type === 'unlimited' ? { type: 'unlimited' } : 
                     { type: 'number', value: value || 1, period: period || 'month' }
      }
    }));
  };

  const updateFeature = (index: number, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => 
        i === index ? { ...feature, enabled } : feature
      )
    }));
  };

  const addCustomFeature = () => {
    const featureName = prompt('কাস্টম ফিচার নাম লিখুন:');
    if (featureName?.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { name: featureName.trim(), enabled: true }]
      }));
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/plans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'প্ল্যান সম্পাদনা' : 'নতুন প্ল্যান তৈরি'}
          </h1>
          <p className="text-muted-foreground">সাবস্ক্রিপশন প্ল্যান কনফিগার করুন</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>মূল তথ্য</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">প্ল্যানের নাম *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name,
                      plan_key: prev.plan_key || generatePlanKey(name)
                    }));
                  }}
                  placeholder="Pro, Agency, Starter"
                  required
                />
              </div>
              <div>
                <Label htmlFor="plan_key">প্ল্যান ID (slug)</Label>
                <Input
                  id="plan_key"
                  value={formData.plan_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_key: e.target.value }))}
                  placeholder="pro, agency, starter"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  কোডে ব্যবহার হয়, গ্রাহক থাকলে পরিবর্তন করা যাবে না
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">বিবরণ</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="একক দোকানের জন্য পারফেক্ট"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">রঙ</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#FF5100"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                />
                <Label htmlFor="is_popular">"সবচেয়ে জনপ্রিয়" ব্যাজ দেখাবে?</Label>
              </div>
            </div>

            <div>
              <Label>প্ল্যান অবস্থা</Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active">সক্রিয়</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive">নিষ্ক্রিয়</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invite_only" id="invite_only" />
                  <Label htmlFor="invite_only">শুধু আমন্ত্রণে</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>মূল্য নির্ধারণ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_monthly">মাসিক মূল্য (৳) *</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  min="0"
                  value={formData.price_monthly_bdt}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_monthly_bdt: parseInt(e.target.value) || 0 }))}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">০ = বিনামূল্যে</p>
              </div>
              <div>
                <Label htmlFor="price_annual">বার্ষিক মূল্য (৳/মাস)</Label>
                <Input
                  id="price_annual"
                  type="number"
                  min="0"
                  value={formData.price_annual_bdt || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_annual_bdt: parseInt(e.target.value) || null }))}
                />
                {formData.price_annual_bdt && formData.price_annual_bdt < formData.price_monthly_bdt && (
                  <p className="text-xs text-green-600 mt-1">
                    মাসিকের তুলনায় {calculateDiscount()}% সাশ্রয়
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trial_days">ট্রায়াল পিরিয়ড (দিন)</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min="0"
                  value={formData.trial_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, trial_days: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground mt-1">০ = কোনো ট্রায়াল নেই</p>
              </div>
              <div>
                <Label htmlFor="sslcommerz_code">SSLCommerz প্ল্যান কোড</Label>
                <Input
                  id="sslcommerz_code"
                  value={formData.sslcommerz_plan_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, sslcommerz_plan_code: e.target.value }))}
                  placeholder="SSL_PLAN_CODE"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Feature Limits */}
        <Card>
          <CardHeader>
            <CardTitle>ফিচার সীমা</CardTitle>
            <p className="text-sm text-muted-foreground">প্রতিটি ফিচারের জন্য সীমা নির্ধারণ করুন</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {FEATURE_LIMITS.map((feature) => {
              const currentLimit = formData.limits[feature.key] || { type: 'unlimited' };
              
              return (
                <div key={feature.key} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h4 className="font-medium">{feature.label}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant={currentLimit.type === 'unlimited' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLimit(feature.key, 'unlimited')}
                    >
                      সীমাহীন
                    </Button>
                    <Button
                      type="button"
                      variant={currentLimit.type === 'number' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLimit(feature.key, 'number', 1, 'month')}
                    >
                      সংখ্যা
                    </Button>
                    <Button
                      type="button"
                      variant={currentLimit.type === 'disabled' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateLimit(feature.key, 'disabled')}
                    >
                      নিষ্ক্রিয়
                    </Button>
                  </div>

                  {currentLimit.type === 'number' && (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        value={currentLimit.value || 1}
                        onChange={(e) => updateLimit(feature.key, 'number', parseInt(e.target.value) || 1, currentLimit.period)}
                        className="w-20"
                      />
                      <Select
                        value={currentLimit.period || 'month'}
                        onValueChange={(value) => updateLimit(feature.key, 'number', currentLimit.value, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">/দিন</SelectItem>
                          <SelectItem value="month">/মাস</SelectItem>
                          <SelectItem value="total">/মোট</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Section 4: Feature Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>ফিচার চেকলিস্ট</CardTitle>
            <p className="text-sm text-muted-foreground">প্রাইসিং পেজে ✓ বা ✗ হিসেবে দেখানো হবে</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={(checked) => updateFeature(index, checked)}
                    />
                    {index >= DEFAULT_FEATURES.length && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(index)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addCustomFeature}
              className="mt-4"
            >
              + কাস্টম ফিচার যোগ করুন
            </Button>
          </CardContent>
        </Card>

        {/* Section 5: Grandfather Settings (only for edit) */}
        {isEdit && (
          <Card>
            <CardHeader>
              <CardTitle>গ্র্যান্ডফাদারিং</CardTitle>
              <p className="text-sm text-muted-foreground">বিদ্যমান গ্রাহকদের কী হবে?</p>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.grandfather_policy}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grandfather_policy: value }))}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="text-sm">
                    পরিবর্তন অবিলম্বে প্রযোজ্য হবে <span className="text-destructive">(ঝুঁকিপূর্ণ)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="next_cycle" id="next_cycle" />
                  <Label htmlFor="next_cycle" className="text-sm">
                    বর্তমান বিলিং সাইকেল শেষে প্রযোজ্য হবে <span className="text-green-600">(সুপারিশকৃত)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="forever" id="forever" />
                  <Label htmlFor="forever" className="text-sm">
                    বিদ্যমান গ্রাহকরা পুরনো সীমা রাখবে
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Save Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/plans')}
            disabled={saving}
          >
            বাতিল
          </Button>
          <Button type="submit" disabled={saving} className="min-w-32">
            {saving ? (
              'সংরক্ষণ হচ্ছে...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                পরিবর্তন সংরক্ষণ করুন
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}