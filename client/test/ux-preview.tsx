// Development-only component fixture. No authentication, API calls or record writes.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/styles/workspace.css';
import '../src/styles/modules.css';
import { Sidebar } from '../src/components/common/Sidebar';
import { Screen2Dashboard } from '../src/components/screens/Screen2Dashboard';
import { Screen3TriageQueue } from '../src/components/screens/Screen3TriageQueue';
import { AdminDispatchManager } from '../src/components/persona/AdminDispatchManager';
import { Screen5DueProcessManager } from '../src/components/screens/Screen5DueProcessManager';
import { Screen8FieldAssessmentForm } from '../src/components/screens/Screen8FieldAssessmentForm';
import { Screen4TaskDispatchModal } from '../src/components/screens/Screen4TaskDispatchModal';
import { AdminSettingsView } from '../src/components/persona/AdminSettingsView';
import { MOCK_FIELD_TASKS, MOCK_TRIAGE_ITEMS } from '../src/data/mockContracts';
import type { ScreenId } from '../src/types/navigation';
import type { BeneficiaryTriageItem } from '../src/types/contracts';

function Preview() {
  const [screen, setScreen] = useState<ScreenId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [target, setTarget] = useState<BeneficiaryTriageItem | null>(null);
  return <div className={`app-shell ${collapsed ? 'sidebar-minimized' : ''}`}>
    <Sidebar userRole="REGIONAL_DIRECTOR" jurisdiction="Component fixtures" currentScreen={screen} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} onSelectScreen={setScreen} />
    <div className="app-main-column">
      <header className="app-header">
        <strong>Component QA: sample records, no backend</strong>
        <label>Screen <select aria-label="QA screen" value={screen} onChange={(e) => setScreen(e.target.value as ScreenId)}>
          <option value="dashboard">Dashboard</option><option value="dispatch_manager">Dispatch</option>
          <option value="due_process">Due process</option><option value="field_verify">Assessment</option>
          <option value="admin_settings">Settings</option><option value="triage">Triage</option>
        </select></label>
      </header>
      <main className="app-workspace">
        {screen === 'dashboard' && <Screen2Dashboard triageCount={2} onNavigateToScreen={setScreen} />}
        {screen === 'dispatch_manager' && <AdminDispatchManager onSelectHousehold={() => setScreen('triage')} />}
        {screen === 'triage' && <Screen3TriageQueue items={MOCK_TRIAGE_ITEMS} onDispatchTask={setTarget} />}
        {screen === 'due_process' && <Screen5DueProcessManager />}
        {screen === 'admin_settings' && <AdminSettingsView />}
        {screen === 'field_verify' && <Screen8FieldAssessmentForm task={MOCK_FIELD_TASKS[0]} onBackToTasks={() => setScreen('dispatch_manager')} onSubmitVerification={async () => { throw new Error('QA save failure'); }} />}
      </main>
    </div>
    {target && <Screen4TaskDispatchModal isOpen targetHousehold={target} onClose={() => setTarget(null)} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
