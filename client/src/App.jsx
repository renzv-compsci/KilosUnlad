import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import DashboardView from './features/dashboard/DashboardView.jsx';
import TriageQueue from './features/triage/TriageQueue.jsx';
import FieldTaskForm from './features/verification/FieldTaskForm.jsx';
import AppealManager from './features/due-process/AppealManager.jsx';
import ChainInspector from './features/audit-ledger/ChainInspector.jsx';
import { AuthProvider } from './hooks/useAuth.js';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/triage" element={<TriageQueue />} />
          <Route path="/field-verification" element={<FieldTaskForm />} />
          <Route path="/appeals" element={<AppealManager />} />
          <Route path="/audit-ledger" element={<ChainInspector />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
