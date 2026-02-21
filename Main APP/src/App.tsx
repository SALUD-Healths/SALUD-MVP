import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout';
import { DashboardPage, RecordsPage, DoctorPage, SharedAccessPage } from '@/pages';

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/shared" element={<SharedAccessPage />} />
            <Route path="/settings" element={<DashboardPage />} /> {/* TODO: Settings page */}
            <Route path="/doctor" element={<DoctorPage />} />
            <Route path="/help" element={<DashboardPage />} /> {/* TODO: Help page */}
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}
