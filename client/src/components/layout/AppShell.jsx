import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';

export default function AppShell() {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
