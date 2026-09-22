import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';

export default function AppShell() {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 overflow-x-hidden p-4 lg:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
