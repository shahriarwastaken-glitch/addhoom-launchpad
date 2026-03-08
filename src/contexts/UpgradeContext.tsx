import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import UpgradeModal from '@/components/UpgradeModal';

type UpgradeType = 'video' | 'general';

interface UpgradeContextValue {
  showUpgrade: (type?: UpgradeType) => void;
}

const UpgradeContext = createContext<UpgradeContextValue>({ showUpgrade: () => {} });

export const useUpgrade = () => useContext(UpgradeContext);

export const UpgradeProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<UpgradeType>('general');

  const showUpgrade = useCallback((t: UpgradeType = 'general') => {
    setType(t);
    setOpen(true);
  }, []);

  return (
    <UpgradeContext.Provider value={{ showUpgrade }}>
      {children}
      <UpgradeModal open={open} onClose={() => setOpen(false)} type={type} />
    </UpgradeContext.Provider>
  );
};
