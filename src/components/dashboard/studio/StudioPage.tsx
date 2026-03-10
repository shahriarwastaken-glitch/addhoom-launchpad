import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shirt, Camera, ArrowUpCircle } from 'lucide-react';
import TryOnTab from './TryOnTab';
import ProductPhotoTab from './ProductPhotoTab';
import UpscalerTab from './UpscalerTab';
import type { StudioTab } from './types';

const TABS: { key: StudioTab; icon: React.ElementType; labelBn: string; labelEn: string }[] = [
  { key: 'tryon', icon: Shirt, labelBn: 'ট্রাই-অন', labelEn: 'Try-On' },
  { key: 'product-photo', icon: Camera, labelBn: 'প্রোডাক্ট ফটো', labelEn: 'Product Photo' },
  { key: 'upscaler', icon: ArrowUpCircle, labelBn: 'আপস্কেলার', labelEn: 'Upscaler' },
];

const StudioPage = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as StudioTab) || 'tryon';
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab') as StudioTab;
    if (tab && ['tryon', 'product-photo', 'upscaler'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading-en tracking-tight">
          {t('স্টুডিও', 'Studio')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('ভিজ্যুয়াল তৈরি করুন। তারপর অ্যাড বানান।', 'Create visuals. Then make ads.')}
        </p>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
            `}
          >
            <tab.icon className="h-4 w-4" />
            {t(tab.labelBn, tab.labelEn)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tryon' && <TryOnTab />}
      {activeTab === 'product-photo' && <ProductPhotoTab />}
      {activeTab === 'upscaler' && <UpscalerTab />}
    </div>
  );
};

export default StudioPage;
