import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardHome from '@/components/dashboard/DashboardHome';
import PageTransition from '@/components/PageTransition';
import { PageSkeleton } from '@/components/ui/ShimmerSkeleton';

// Lazy-loaded heavy components
const AdGeneratorPage = lazy(() => import('@/components/dashboard/ad-generator/AdGeneratorPage'));
const AdHistory = lazy(() => import('@/components/dashboard/ad-generator/AdHistory'));
const VideoAd = lazy(() => import('@/components/dashboard/VideoAd'));
const VideoHistory = lazy(() => import('@/components/dashboard/video/VideoHistory'));
const ContentCalendar = lazy(() => import('@/components/dashboard/ContentCalendar'));
const AIChat = lazy(() => import('@/components/dashboard/AIChat'));
const CompetitorIntel = lazy(() => import('@/components/dashboard/CompetitorIntel'));
const AccountDoctor = lazy(() => import('@/components/dashboard/AccountDoctor'));
const FestivalTemplates = lazy(() => import('@/components/dashboard/FestivalTemplates'));
const ProjectsList = lazy(() => import('@/components/dashboard/ProjectsList'));
const ProjectDetail = lazy(() => import('@/components/dashboard/ProjectDetail'));
const Settings = lazy(() => import('@/components/dashboard/Settings'));
const DhoomScoreChecker = lazy(() => import('@/components/dashboard/DhoomScoreChecker'));
const Analytics = lazy(() => import('@/components/dashboard/Analytics'));
const StudioPage = lazy(() => import('@/components/dashboard/studio/StudioPage'));
const CreditsPage = lazy(() => import('@/components/dashboard/CreditsPage'));
const WorkspaceManagement = lazy(() => import('@/components/dashboard/workspace/WorkspaceManagement'));

const Dashboard = () => {
  const location = useLocation();

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes location={location}>
              <Route index element={<DashboardHome />} />
              <Route path="generate" element={<AdGeneratorPage />} />
              <Route path="studio" element={<StudioPage />} />
              <Route path="ad-history" element={<AdHistory />} />
              <Route path="video" element={<VideoAd />} />
              <Route path="video/history" element={<VideoHistory />} />
              <Route path="calendar" element={<ContentCalendar />} />
              <Route path="chat" element={<AIChat />} />
              <Route path="competitors" element={<CompetitorIntel />} />
              <Route path="doctor" element={<AccountDoctor />} />
              <Route path="festival" element={<FestivalTemplates />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="dhoom-score" element={<DhoomScoreChecker />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="credits" element={<CreditsPage />} />
              <Route path="workspaces" element={<WorkspaceManagement />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Dashboard;
