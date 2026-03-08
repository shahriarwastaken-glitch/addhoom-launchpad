import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AdGenerator from '@/components/dashboard/AdGenerator';
import VideoAd from '@/components/dashboard/VideoAd';
import ContentCalendar from '@/components/dashboard/ContentCalendar';
import AIChat from '@/components/dashboard/AIChat';
import CompetitorIntel from '@/components/dashboard/CompetitorIntel';
import AccountDoctor from '@/components/dashboard/AccountDoctor';
import FestivalTemplates from '@/components/dashboard/FestivalTemplates';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdGenerator />} />
        <Route path="video" element={<VideoAd />} />
        <Route path="calendar" element={<ContentCalendar />} />
        <Route path="chat" element={<AIChat />} />
        <Route path="competitors" element={<CompetitorIntel />} />
        <Route path="doctor" element={<AccountDoctor />} />
        <Route path="festival" element={<FestivalTemplates />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;
