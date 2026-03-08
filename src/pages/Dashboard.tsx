import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AdGeneratorPage from '@/components/dashboard/ad-generator/AdGeneratorPage';
import VideoAd from '@/components/dashboard/VideoAd';
import ContentCalendar from '@/components/dashboard/ContentCalendar';
import AIChat from '@/components/dashboard/AIChat';
import CompetitorIntel from '@/components/dashboard/CompetitorIntel';
import AccountDoctor from '@/components/dashboard/AccountDoctor';
import FestivalTemplates from '@/components/dashboard/FestivalTemplates';
import CampaignsList from '@/components/dashboard/CampaignsList';
import Settings from '@/components/dashboard/Settings';
import DhoomScoreChecker from '@/components/dashboard/DhoomScoreChecker';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdGeneratorPage />} />
        <Route path="generate" element={<AdGeneratorPage />} />
        <Route path="video" element={<VideoAd />} />
        <Route path="calendar" element={<ContentCalendar />} />
        <Route path="chat" element={<AIChat />} />
        <Route path="competitors" element={<CompetitorIntel />} />
        <Route path="doctor" element={<AccountDoctor />} />
        <Route path="festival" element={<FestivalTemplates />} />
        <Route path="campaigns" element={<CampaignsList />} />
        <Route path="dhoom-score" element={<DhoomScoreChecker />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
