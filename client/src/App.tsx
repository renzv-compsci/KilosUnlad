import React, { useEffect, useState } from 'react';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Screen1Login } from './components/screens/Screen1Login';
import { Screen2Dashboard } from './components/screens/Screen2Dashboard';
import { Screen3TriageQueue } from './components/screens/Screen3TriageQueue';
import { Screen4TaskDispatchModal } from './components/screens/Screen4TaskDispatchModal';
import { Screen5DueProcessManager } from './components/screens/Screen5DueProcessManager';
import { Screen6AuditLedger } from './components/screens/Screen6AuditLedger';
import { Screen7FieldTasksList } from './components/screens/Screen7FieldTasksList';
import { Screen8FieldAssessmentForm } from './components/screens/Screen8FieldAssessmentForm';
import { Screen9OfflineSyncDrawer } from './components/screens/Screen9OfflineSyncDrawer';
import { AdminDispatchManager } from './components/persona/AdminDispatchManager';
import { AdminSettingsView } from './components/persona/AdminSettingsView';
import { FieldCaseworkerDashboard } from './components/persona/FieldCaseworkerDashboard';
import { GrievanceAppealsDashboard } from './components/persona/GrievanceAppealsDashboard';
import { CoaAuditDashboard } from './components/persona/CoaAuditDashboard';
import { CoaEvidentiarySampling } from './components/persona/CoaEvidentiarySampling';
import {
  BeneficiaryTriageItem,
  DispatchTaskPayload,
  FieldTaskItem,
  FieldTaskSubmission,
  UserSession,
} from './types/contracts';
import type { ScreenId } from './types/navigation';
import {
  MOCK_FIELD_TASKS,
  MOCK_TRIAGE_ITEMS,
  MOCK_USERS,
} from './data/mockContracts';
import { fetchAssignedTasks, fetchTriageQueue } from './services/api';
import { CheckCircle2, Lock } from 'lucide-react';

const ROLE_CONFIG: Record<string, {
  defaultScreen: ScreenId;
  allowedScreens: ScreenId[];
  roleTitle: string;
}> = {
  DSWD_DIRECTOR: {
    defaultScreen: 'dashboard',
    allowedScreens: ['dashboard', 'triage', 'dispatch_manager', 'dispatch_modal', 'due_process', 'admin_settings'],
    roleTitle: 'Regional Director',
  },
  MUNICIPAL_LINK: {
    defaultScreen: 'field_dashboard',
    allowedScreens: ['field_dashboard', 'field_tasks', 'field_verify', 'field_sync'],
    roleTitle: 'Municipal Link',
  },
  GRIEVANCE_OFFICER: {
    defaultScreen: 'grievance_dashboard',
    allowedScreens: ['grievance_dashboard', 'due_process', 'appeal_hearing'],
    roleTitle: 'Grievance Officer',
  },
  COA_AUDITOR: {
    defaultScreen: 'coa_dashboard',
    allowedScreens: ['coa_dashboard', 'audit_ledger', 'coa_sampling'],
    roleTitle: 'COA Auditor',
  },
};

const INITIAL_SUBMISSION: FieldTaskSubmission = {
  task_id: 'TSK-LAG-2026-0102',
  household_id: '4PS-04A-2026-00341',
  timestamp: '2026-09-20T17:15:00',
  wall_construction: 2,
  roof_construction: 2,
  water_access: 2,
  is_motorcycle_present: true,
  is_productive_asset: true,
  proof_type: 'MOVEIT',
  franchise_number: 'MV-2024-88190',
  physical_card_presented: true,
  card_matches_beneficiary: true,
  pawning_suspected: false,
  evidence_attachments: [
    {
      photo_url: 'blob://evidence_photo_01.jpg',
      captured_at: '2026-09-20T17:10:00',
      gps_readout: { latitude: 14.3160, longitude: 121.1180, accuracy_m: 3.8 },
      client_side_hash: 'SHA-256: 9b21f00a...c441',
    },
  ],
  worker_recommendation: 'RETAIN',
  narrative_report: 'Household verified in Sinalhan. Motorcycle used as daily delivery service. LandBank card produced in physical custody.',
  sync_status: 'PENDING_SYNC',
};

export default function App() {
  const [session, setSession] = useState<UserSession>(MOCK_USERS.director);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [triageItems, setTriageItems] = useState<BeneficiaryTriageItem[]>(MOCK_TRIAGE_ITEMS);
  const [fieldTasks, setFieldTasks] = useState<FieldTaskItem[]>(MOCK_FIELD_TASKS);
  const [isOffline, setIsOffline] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [targetHouseholdForDispatch, setTargetHouseholdForDispatch] = useState<BeneficiaryTriageItem | null>(MOCK_TRIAGE_ITEMS[0]);
  const [selectedFieldTask, setSelectedFieldTask] = useState<FieldTaskItem>(MOCK_FIELD_TASKS[0]);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [submissions, setSubmissions] = useState<FieldTaskSubmission[]>([INITIAL_SUBMISSION]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOperationalData() {
      try {
        const [remoteTriage, remoteTasks] = await Promise.all([
          fetchTriageQueue(),
          fetchAssignedTasks(),
        ]);

        if (!isMounted) return;

        if (remoteTriage.length > 0) {
          setTriageItems(remoteTriage);
          setTargetHouseholdForDispatch(remoteTriage[0]);
        }

        if (remoteTasks.length > 0) {
          setFieldTasks(remoteTasks);
          setSelectedFieldTask(remoteTasks[0]);
        }
      } catch {
        // Local backend may not be running during frontend review. Keep bundled sample data available.
      }
    }

    loadOperationalData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentRoleConfig = ROLE_CONFIG[session.user.role] || ROLE_CONFIG.DSWD_DIRECTOR;
  const isScreenAuthorized = currentRoleConfig.allowedScreens.includes(currentScreen);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const navigateToScreen = (screen: ScreenId) => {
    if (screen === 'login' || currentRoleConfig.allowedScreens.includes(screen)) {
      setCurrentScreen(screen);
      if (screen === 'dispatch_modal') setIsDispatchModalOpen(true);
      if (screen === 'field_sync') setIsSyncDrawerOpen(true);
      return;
    }

    showToast(`Access is restricted for ${currentRoleConfig.roleTitle}.`);
  };

  const handleSwitchUser = (roleKey: string) => {
    const nextSession = MOCK_USERS[roleKey];
    if (!nextSession) return;

    const nextConfig = ROLE_CONFIG[nextSession.user.role] || ROLE_CONFIG.DSWD_DIRECTOR;
    setSession(nextSession);
    setCurrentScreen(nextConfig.defaultScreen);
    showToast(`Switched to ${nextSession.user.full_name}`);
  };

  const handleLoginSuccess = (userSession: UserSession) => {
    const nextConfig = ROLE_CONFIG[userSession.user.role] || ROLE_CONFIG.DSWD_DIRECTOR;
    setSession(userSession);
    setCurrentScreen(nextConfig.defaultScreen);
    showToast(`Signed in as ${userSession.user.full_name}`);
  };

  const handleOpenDispatch = (item: BeneficiaryTriageItem) => {
    setTargetHouseholdForDispatch(item);
    setIsDispatchModalOpen(true);
  };

  const handleDispatchSuccess = (payload: DispatchTaskPayload) => {
    showToast(`Task dispatched to ${payload.assigned_worker_name}.`);
    setIsDispatchModalOpen(false);
    setCurrentScreen('triage');
  };

  const handleStartVerification = (task: FieldTaskItem) => {
    setSelectedFieldTask(task);
    setCurrentScreen('field_verify');
  };

  const handleSubmitVerification = (submission: FieldTaskSubmission) => {
    setSubmissions((prev) => [submission, ...prev]);
    setCurrentScreen('field_sync');
    setIsSyncDrawerOpen(true);
    showToast(`Verification for ${submission.household_id} was saved.`);
  };

  const handleSyncAll = () => {
    setSubmissions((prev) => prev.map((item) => ({ ...item, sync_status: 'SYNCED' as const })));
    showToast('Cached field reports synced successfully.');
  };

  const renderRestrictedScreen = () => (
    <div className="mx-auto my-12 max-w-2xl rounded-xl border border-stone-200 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700">
        <Lock className="h-6 w-6" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Role-Based Access Control</p>
      <h2 className="mt-2 font-display text-xl font-bold text-stone-900">Module Access Restricted</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
        This module is assigned to another operating role. You are currently signed in as {currentRoleConfig.roleTitle}.
      </p>
      <button
        type="button"
        onClick={() => setCurrentScreen(currentRoleConfig.defaultScreen)}
        className="mt-6 rounded-lg bg-[#132e4f] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1a3d66]"
      >
        Return to Dashboard
      </button>
    </div>
  );

  const renderScreen = () => {
    if (!isScreenAuthorized && currentScreen !== 'login') {
      return renderRestrictedScreen();
    }

    switch (currentScreen) {
      case 'login':
        return <Screen1Login onLoginSuccess={handleLoginSuccess} />;
      case 'dashboard':
        return <Screen2Dashboard onNavigateToScreen={navigateToScreen} />;
      case 'triage':
        return <Screen3TriageQueue onDispatchTask={handleOpenDispatch} items={triageItems} />;
      case 'dispatch_manager':
        return (
          <AdminDispatchManager
            onOpenDispatchModal={() => {
              setTargetHouseholdForDispatch(triageItems[0]);
              setIsDispatchModalOpen(true);
            }}
          />
        );
      case 'dispatch_modal':
        return (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
              <span className="font-semibold">Select a household and assign it to a municipal link for field verification.</span>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(true)}
                className="rounded-lg bg-[#132e4f] px-3 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                Open Dispatch
              </button>
            </div>
            <Screen3TriageQueue onDispatchTask={handleOpenDispatch} items={triageItems} />
          </div>
        );
      case 'admin_settings':
        return <AdminSettingsView />;
      case 'field_dashboard':
        return (
          <FieldCaseworkerDashboard
            onStartVerification={handleStartVerification}
            onNavigateToTasks={() => setCurrentScreen('field_tasks')}
            onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
            isOffline={isOffline}
            onToggleOffline={() => setIsOffline((value) => !value)}
          />
        );
      case 'field_tasks':
        return (
          <div className="p-4 sm:p-6">
            <Screen7FieldTasksList
              isOffline={isOffline}
              onToggleOffline={() => setIsOffline((value) => !value)}
              onStartVerification={handleStartVerification}
              onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
              tasks={fieldTasks}
            />
          </div>
        );
      case 'field_verify':
        return (
          <div className="p-4 sm:p-6">
            <Screen8FieldAssessmentForm
              task={selectedFieldTask}
              onBackToTasks={() => setCurrentScreen('field_tasks')}
              onSubmitVerification={handleSubmitVerification}
            />
          </div>
        );
      case 'field_sync':
        return (
          <div className="p-4 sm:p-6">
            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between rounded-xl border border-stone-200 bg-stone-100 p-3">
              <span className="text-xs font-medium text-stone-700">Offline reports pending synchronization</span>
              <button
                type="button"
                onClick={() => setIsSyncDrawerOpen(true)}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-900"
              >
                Open Sync Drawer
              </button>
            </div>
            <Screen7FieldTasksList
              isOffline={isOffline}
              onToggleOffline={() => setIsOffline((value) => !value)}
              onStartVerification={handleStartVerification}
              onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
              tasks={fieldTasks}
            />
          </div>
        );
      case 'grievance_dashboard':
        return <GrievanceAppealsDashboard onNavigateToScreen={navigateToScreen} />;
      case 'due_process':
      case 'appeal_hearing':
        return <Screen5DueProcessManager />;
      case 'coa_dashboard':
        return (
          <CoaAuditDashboard
            onNavigateToLedger={() => setCurrentScreen('audit_ledger')}
            onNavigateToSampling={() => setCurrentScreen('coa_sampling')}
          />
        );
      case 'audit_ledger':
        return <Screen6AuditLedger />;
      case 'coa_sampling':
        return <CoaEvidentiarySampling />;
      default:
        return <div className="p-12 text-center text-stone-500">Select a module from the sidebar navigation.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-stone-700 bg-[#132e4f] px-4 py-3 text-xs font-semibold text-stone-100 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {currentScreen === 'login' ? (
        <Screen1Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="flex min-h-screen flex-col">
          <Header
            session={session}
            onLogout={() => {
              setCurrentScreen('login');
              showToast('Logged out of session');
            }}
            onSwitchUser={handleSwitchUser}
          />

          <div className="flex flex-1">
            <Sidebar
              userRole={session.user.role}
              currentScreen={currentScreen}
              onSelectScreen={navigateToScreen}
              pendingTriageCount={triageItems.length}
              dueProcessCount={3}
              offlineSyncCount={submissions.filter((submission) => submission.sync_status === 'PENDING_SYNC').length}
            />

            <main className="min-w-0 flex-1 overflow-x-hidden bg-white">
              {renderScreen()}
            </main>
          </div>
        </div>
      )}

      <Screen4TaskDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        targetHousehold={targetHouseholdForDispatch}
        onDispatchSuccess={handleDispatchSuccess}
      />

      <Screen9OfflineSyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((value) => !value)}
        submissions={submissions}
        onSyncAll={handleSyncAll}
      />
    </div>
  );
}
