import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';

interface AdminVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: string;
  actionPayload?: any;
  actionLabel: string;
  onVerified: (payload: any) => void;
}

export default function AdminVerificationModal({
  open,
  onOpenChange,
  actionType,
  actionPayload,
  actionLabel,
  onVerified,
}: AdminVerificationModalProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-verification', {
        body: { action_type: actionType, action_payload: actionPayload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message_bn || data.message_en);
      
      toast.success('ভেরিফিকেশন কোড আপনার ইমেইলে পাঠানো হয়েছে।');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message || 'কোড পাঠাতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('৬ সংখ্যার কোড দিন।');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-verify-code', {
        body: { code, action_type: actionType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message_bn || data.message_en);
      
      toast.success('কোড যাচাই সফল!');
      onOpenChange(false);
      onVerified(data.action_payload || actionPayload);
      
      // Reset state
      setStep('request');
      setCode('');
    } catch (err: any) {
      toast.error(err.message || 'অবৈধ কোড।');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('request');
    setCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            নিরাপত্তা যাচাই
          </DialogTitle>
          <DialogDescription>
            {step === 'request' 
              ? `"${actionLabel}" করতে আপনার ইমেইলে একটি কোড পাঠানো হবে।`
              : 'আপনার ইমেইলে পাঠানো ৬ সংখ্যার কোডটি লিখুন।'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'request' ? (
          <div className="py-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              নিরাপত্তার জন্য আপনার অ্যাডমিন ইমেইলে একটি ভেরিফিকেশন কোড পাঠানো হবে।
            </p>
          </div>
        ) : (
          <div className="py-6 flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            বাতিল
          </Button>
          {step === 'request' ? (
            <Button onClick={handleRequestCode} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              কোড পাঠান
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('request')} disabled={loading}>
                আবার পাঠান
              </Button>
              <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                যাচাই করুন
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
