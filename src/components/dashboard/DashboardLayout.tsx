import { ReactNode } from 'react';
import DashboardSidebar from './DashboardSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Bell } from 'lucide-react';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { lang, toggle } = useLanguage();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggle} className="flex items-center bg-secondary rounded-full px-3 py-1 text-xs font-semibold">
                <span className={lang === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className={lang === 'bn' ? 'text-primary' : 'text-muted-foreground'}>বাং</span>
              </button>
              <button className="relative p-2 text-muted-foreground hover:text-foreground">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold">A</div>
            </div>
          </header>
          <main className="flex-1 bg-background p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
