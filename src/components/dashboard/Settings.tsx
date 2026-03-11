import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User, Bell, Layers, CreditCard, Shield, type LucideIcon,
} from 'lucide-react';
import ProfileTab from './settings/ProfileTab';
import NotificationsTab from './settings/NotificationsTab';
import WorkspaceTab from './settings/WorkspaceTab';
import BillingTab from './settings/BillingTab';
import SecurityTab from './settings/SecurityTab';

type SettingsTabId = 'profile' | 'notifications' | 'workspace' | 'billing' | 'security';

interface TabDef {
  id: SettingsTabId;
  icon: LucideIcon;
  labelBn: string;
  labelEn: string;
}

const TABS: TabDef[] = [
  { id: 'profile', icon: User, labelBn: 'প্রোফাইল', labelEn: 'Profile' },
  { id: 'notifications', icon: Bell, labelBn: 'নোটিফিকেশন', labelEn: 'Notifications' },
  { id: 'workspace', icon: Layers, labelBn: 'ওয়ার্কস্পেস', labelEn: 'Workspace' },
  { id: 'billing', icon: CreditCard, labelBn: 'বিলিং', labelEn: 'Billing' },
  { id: 'security', icon: Shield, labelBn: 'নিরাপত্তা', labelEn: 'Security' },
];

const Settings = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const hash = location.hash.replace('#', '') as SettingsTabId;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    TABS.some(tab => tab.id === hash) ? hash : 'profile'
  );

  const handleTabChange = (id: SettingsTabId) => {
    setActiveTab(id);
    navigate(`/dashboard/settings#${id}`, { replace: true });
  };

  useEffect(() => {
    if (hash && TABS.some(tab => tab.id === hash)) {
      setActiveTab(hash);
    }
  }, [hash]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('সেটিংস', 'Settings')}</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar / Tab bar */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-[200px] flex-shrink-0 pb-2 md:pb-0 scrollbar-none">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <tab.icon size={16} />
                {t(tab.labelBn, tab.labelEn)}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'workspace' && <WorkspaceTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
