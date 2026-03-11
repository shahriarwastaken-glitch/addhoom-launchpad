import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface CreditCostLabelProps {
  credits: number;
  className?: string;
}

const CreditCostLabel = ({ credits, className = '' }: CreditCostLabelProps) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const balance = profile?.credit_balance ?? 0;
  const isFree = credits === 0;
  const insufficient = !isFree && balance < credits;

  if (isFree) {
    return (
      <span className={`text-[11px] font-body ${className}`} style={{ color: '#00B96B' }}>
        · {t('ফ্রি', 'Free')}
      </span>
    );
  }

  return (
    <span className={`text-[11px] font-body ${className}`} style={{ color: insufficient ? '#FF4444' : '#9E9E9E' }}>
      · {credits.toLocaleString()} {t('ক্রেডিট', 'credits')}
      {insufficient && <span> · {t('অপর্যাপ্ত', 'Insufficient')}</span>}
    </span>
  );
};

export default CreditCostLabel;
