import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardHome from '@/components/dashboard/DashboardHome';
import AdGeneratorPage from '@/components/dashboard/ad-generator/AdGeneratorPage';
import AdHistory from '@/components/dashboard/ad-generator/AdHistory';
import VideoAd from '@/components/dashboard/VideoAd';
import VideoHistory from '@/components/dashboard/video/VideoHistory';
import ContentCalendar from '@/components/dashboard/ContentCalendar';
import AIChat from '@/components/dashboard/AIChat';
import CompetitorIntel from '@/components/dashboard/CompetitorIntel';
import AccountDoctor from '@/components/dashboard/AccountDoctor';
import FestivalTemplates from '@/components/dashboard/FestivalTemplates';
import ProjectsList from '@/components/dashboard/ProjectsList';
import ProjectDetail from '@/components/dashboard/ProjectDetail';
import Settings from '@/components/dashboard/Settings';
import DhoomScoreChecker from '@/components/dashboard/DhoomScoreChecker';
import Analytics from '@/components/dashboard/Analytics';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="generate" element={<AdGeneratorPage />} />
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
        <Route path="settings" element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
