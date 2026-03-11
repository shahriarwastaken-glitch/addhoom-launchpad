import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import UpgradeModal from '@/components/UpgradeModal';

type UpgradeType = 'video' | 'general' | 'credits';
type CreditInfo = { balance?: number; required?: number; action?: string };

interface UpgradeContextValue {
  showUpgrade: (type?: UpgradeType, creditInfo?: CreditInfo) => void;
}

const UpgradeContext = createContext<UpgradeContextValue>({ showUpgrade: () => {} });

export const useUpgrade = () => useContext(UpgradeContext);

export const UpgradeProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<UpgradeType>('general');
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({});

  const showUpgrade = useCallback((t: UpgradeType = 'general', info?: CreditInfo) => {
    setType(t);
    setCreditInfo(info || {});
    setOpen(true);
  }, []);

  // Listen for credits:insufficient custom events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      showUpgrade('credits', e.detail);
    };
    window.addEventListener('credits:insufficient', handler as EventListener);
    return () => window.removeEventListener('credits:insufficient', handler as EventListener);
  }, [showUpgrade]);

  return (
    <UpgradeContext.Provider value={{ showUpgrade }}>
      {children}
      <UpgradeModal open={open} onClose={() => setOpen(false)} type={type} creditInfo={creditInfo} />
    </UpgradeContext.Provider>
  );
};
