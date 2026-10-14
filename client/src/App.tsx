import React, { useEffect, useState } from 'react';
import './styles/workspace.css';
import './styles/modules.css';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DataSourceNotice } from './components/common/DataSourceNotice';
import { Screen1Login } from './components/screens/Screen1Login';
import { Screen2Dashboard } from './components/screens/Screen2Dashboard';
import { Screen3TriageQueue } from './components/screens/Screen3TriageQueue';
import { Screen4TaskDispatchModal } from './components/screens/Screen4TaskDispatchModal';
import { Screen5DueProcessManager } from './components/screens/Screen5DueProcessManager';
import { AuditChainVerification } from './components/screens/AuditChainVerification';
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
  FieldTaskItem,
  FieldTaskSubmission,
  UserSession,
  TriagePagination,
} from './types/contracts';
import type { ScreenId } from './types/navigation';
import { apiErrorMessage, appealErrorMessage, completeGraduation, decideAppeal, fetchAssessmentExplanation, fetchDueProcessDocket, fetchTriagePage, fileAppeal, resolutionErrorMessage } from './services/api';
import { loadWorkerAssignments } from './services/workerAssignments';
import type { TriageSummary } from './services/api';
import { clearStoredSession, isUserRole, readStoredSession } from './services/authSession';
import { ROLE_CONFIG, canReadTriage, canDispatch } from './types/permissions';
import {
  getQueuedSubmissions,
  queueSubmission,
} from './services/indexedDB';
import { useOfflineSync } from './hooks/useOfflineSync';
import { CheckCircle2, Lock, LoaderCircle, AlertCircle, RefreshCw, ClipboardList } from 'lucide-react';


export default function App() {
  const mainColumnRef = React.useRef<HTMLDivElement>(null);
  const [compactNavigation, setCompactNavigation] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (window.matchMedia('(max-width: 767px)').matches) return true;
    try { return localStorage.getItem('kilosunlad_sidebar_collapsed') === 'true'; }
    catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed((collapsed) => !collapsed);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateNavigation = () => {
      setCompactNavigation(media.matches);
      if (media.matches) setSidebarCollapsed(true);
    };
    media.addEventListener('change', updateNavigation);
    return () => media.removeEventListener('change', updateNavigation);
  }, []);

  useEffect(() => {
    if (compactNavigation) return;
    try { localStorage.setItem('kilosunlad_sidebar_collapsed', String(sidebarCollapsed)); }
    catch { /* Navigation still works when browser storage is unavailable. */ }
  }, [sidebarCollapsed, compactNavigation]);

  useEffect(() => {
    if (sidebarCollapsed || !compactNavigation) return;
    const content = mainColumnRef.current;
    const previousOverflow = document.body.style.overflow;
    content?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#app-sidebar')?.focus();
    });
    const handleDrawerKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarCollapsed(true);
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(document.querySelectorAll<HTMLElement>('#app-sidebar, #app-sidebar button'));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!document.querySelector('#app-sidebar')?.contains(document.activeElement)) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleDrawerKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleDrawerKey);
      content?.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      document.querySelector<HTMLButtonElement>('.sidebar-mobile-toggle')?.focus();
    };
  }, [sidebarCollapsed, compactNavigation]);
  const [session, setSession] = useState<UserSession | null>(readStoredSession);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => session ? ROLE_CONFIG[session.user.role].defaultScreen : 'login');
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentScreen]);
  const [triageItems, setTriageItems] = useState<BeneficiaryTriageItem[]>([]);
  const [triagePage, setTriagePage] = useState(1);
  const [triagePagination, setTriagePagination] = useState<TriagePagination | null>(null);
  const [triageSummary, setTriageSummary] = useState<TriageSummary | null>(null);
  const [fieldTasks, setFieldTasks] = useState<FieldTaskItem[]>([]);
  const [assignmentSource, setAssignmentSource] = useState<'server' | 'device'>('server');
  const [dataState, setDataState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [targetHouseholdForDispatch, setTargetHouseholdForDispatch] = useState<BeneficiaryTriageItem | null>(null);
  const [selectedFieldTask, setSelectedFieldTask] = useState<FieldTaskItem | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [submissions, setSubmissions] = useState<FieldTaskSubmission[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const markSubmissionSynced = React.useCallback((taskId: string) => {
    setSubmissions((current) => current.map((item) => (
      item.task_id === taskId ? { ...item, sync_status: 'SYNCED' } : item
    )));
  }, []);
  const markSubmissionRejected = React.useCallback((taskId: string) => {
    setSubmissions((current) => current.map((item) => (
      item.task_id === taskId ? { ...item, sync_status: 'ERROR' } : item
    )));
  }, []);
  // INT-02/STR-02: POST /api/v1/tasks/:id/submit is mounted; queued reports sync when online.
  const { isOnline, isSyncing, syncPending } = useOfflineSync(submissions, markSubmissionSynced,
    session?.user.user_id ?? null, true, markSubmissionRejected);
  const isOffline = simulateOffline || !isOnline;

  const clearSession = React.useCallback(() => {
    clearStoredSession();
    setSession(null);
    setTriagePage(1);
    setTriagePagination(null);
    setTriageSummary(null);
    setSidebarCollapsed(true);
    setCurrentScreen('login');
    setTriageItems([]);
    setFieldTasks([]);
    setSelectedFieldTask(null);
    setTargetHouseholdForDispatch(null);
    setSubmissions([]);
    setIsDispatchModalOpen(false);
    setIsSyncDrawerOpen(false);
    setDataState('idle');
    setDataError(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setToastMessage('Your session is no longer authorized. Please sign in again.');
    };
    window.addEventListener('kilosunlad:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('kilosunlad:unauthorized', handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    if (!session) return;
    const expire = () => {
      clearSession();
      setToastMessage('Your session expired. Please sign in again.');
    };
    const timer = window.setTimeout(expire, Math.max(0, session.expires_at - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, clearSession]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setTriageSummary(null);
    setTriageItems([]);
    setFieldTasks([]);
    setSelectedFieldTask(null);
    setSubmissions([]);
    setDataState('loading');
    setDataError(null);

    async function loadOperationalData() {
      try {
        if (canReadTriage(session!.user.role)) {
          const { items, pagination, summary } = await fetchTriagePage(triagePage, controller.signal);
          if (controller.signal.aborted) return;
          setTriageItems(items);
          setTriagePagination(pagination);
          setTriageSummary(summary);
        } else if (session!.user.role === 'CASE_WORKER') {
          const ownerId = session!.user.user_id;
          try {
            const drafts = await getQueuedSubmissions(ownerId);
            if (!controller.signal.aborted) setSubmissions(drafts);
          } catch {
            if (!controller.signal.aborted) setToastMessage('Saved drafts could not be read from this device.');
          }
          const result = await loadWorkerAssignments(ownerId, navigator.onLine, controller.signal);
          if (controller.signal.aborted) return;
          setFieldTasks(result.tasks);
          setSelectedFieldTask(result.tasks[0] ?? null);
          setAssignmentSource(result.source);
          if (result.storageError) setToastMessage('Assignments loaded, but an offline copy could not be saved.');
        }
        if (!controller.signal.aborted) setDataState('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        setTriageItems([]);
        setTriagePagination(null);
        setFieldTasks([]);
        setDataState('error');
        setDataError(apiErrorMessage(error));
      }
    }
    void loadOperationalData();
    return () => controller.abort();
  }, [session, reloadCounter, triagePage]);

  const currentRoleConfig = session ? ROLE_CONFIG[session.user.role] : {
    defaultScreen: 'login' as ScreenId, allowedScreens: [] as ScreenId[], roleTitle: 'Signed out',
  };
  const isScreenAuthorized = currentRoleConfig.allowedScreens.includes(currentScreen);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const navigateToScreen = (screen: ScreenId) => {
    if (screen === 'login' || currentRoleConfig.allowedScreens.includes(screen)) {
      setCurrentScreen(screen);
      if (screen === 'field_sync') setIsSyncDrawerOpen(true);
      return;
    }

    showToast(`Access is restricted for ${currentRoleConfig.roleTitle}.`);
  };

  const handleLoginSuccess = (userSession: UserSession) => {
    if (!isUserRole(userSession.user.role)) {
      clearSession();
      showToast('This account role is not supported.');
      return;
    }
    setSession(userSession);
    setCurrentScreen(ROLE_CONFIG[userSession.user.role].defaultScreen);
    showToast(`Signed in as ${userSession.user.full_name}`);
  };

  const handleOpenDispatch = (item: BeneficiaryTriageItem) => {
    if (!session || !canDispatch(session.user.role)) return;
    setTargetHouseholdForDispatch(item);
    setIsDispatchModalOpen(true);
  };

  const handleStartVerification = (task: FieldTaskItem) => {
    if (session?.user.role !== 'CASE_WORKER' || !fieldTasks.some((item) => item.task_id === task.task_id)) return;
    setSelectedFieldTask(task);
    setCurrentScreen('field_verify');
  };

  const handleSubmitVerification = async (submission: FieldTaskSubmission) => {
    if (session?.user.role !== 'CASE_WORKER') return;
    const ownerId = session.user.user_id;
    if (readStoredSession()?.user.user_id !== ownerId) throw new Error('Sign in again before saving.');
    await queueSubmission(ownerId, submission);
    if (readStoredSession()?.user.user_id !== ownerId) return;
    setSubmissions((prev) => [submission, ...prev.filter(item => item.task_id !== submission.task_id)]);
    setCurrentScreen('field_sync');
    setIsSyncDrawerOpen(true);
    showToast(`Report for ${submission.household_id} saved on this device. Not submitted to the server.`);
  };

  const handleSyncAll = async () => {
    if (isOffline) return;
    const syncedCount = await syncPending();
    showToast(syncedCount > 0
      ? `${syncedCount} cached field report${syncedCount === 1 ? '' : 's'} synced.`
      : 'Reports remain queued until the backend submission endpoint is available.');
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
        className="mt-6 rounded-lg bg-[#13233f] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1a3d66]"
      >
        Return to Dashboard
      </button>
    </div>
  );

  const renderScreen = () => {
    if (!session) return <Screen1Login onLoginSuccess={handleLoginSuccess} />;
    if (!isScreenAuthorized && currentScreen !== 'login') return renderRestrictedScreen();
    const needsApiData = ['triage', 'field_tasks', 'field_dashboard', 'field_verify', 'dispatch_manager', 'dispatch_modal'].includes(currentScreen);
    if (needsApiData && (dataState === 'idle' || dataState === 'loading')) {
      return <div className="workspace-state" role="status"><LoaderCircle className="state-spinner" aria-hidden="true" /><p>Loading authorized records...</p></div>;
    }
    if (needsApiData && dataState === 'error') {
      return <div className="workspace-state workspace-state-error"><AlertCircle aria-hidden="true" /><p role="alert">{dataError}</p><button type="button" className="primary-triage-action" onClick={() => setReloadCounter((count) => count + 1)}><RefreshCw size={16} aria-hidden="true" />Retry</button></div>;
    }

    switch (currentScreen) {
      case 'login':
        return <Screen1Login onLoginSuccess={handleLoginSuccess} />;
      case 'dashboard':
        return <Screen2Dashboard onNavigateToScreen={navigateToScreen} triageSummary={dataState === 'ready' ? triageSummary : null} triageCount={dataState === 'ready' ? triagePagination?.total_records : undefined} triageItems={dataState === 'ready' ? triageItems : []} triageLoading={dataState === 'loading'} />;
      case 'triage':
        return <Screen3TriageQueue onDispatchTask={handleOpenDispatch} items={triageItems} readOnly={!canDispatch(session.user.role)} pagination={triagePagination ?? undefined} onPageChange={setTriagePage} loadExplanation={fetchAssessmentExplanation} />;
      case 'dispatch_manager':
        return (
          <AdminDispatchManager
            onSelectHousehold={() => navigateToScreen('triage')}
          />
        );
      case 'dispatch_modal':
        return (
          <div className="p-6">
            <Screen3TriageQueue onDispatchTask={handleOpenDispatch} items={triageItems} pagination={triagePagination ?? undefined} onPageChange={setTriagePage} loadExplanation={fetchAssessmentExplanation} />
          </div>
        );
      case 'admin_settings':
        return <AdminSettingsView />;
      case 'field_dashboard':
        return (
          <FieldCaseworkerDashboard
            user={session.user}
            tasks={fieldTasks}
            onStartVerification={handleStartVerification}
            onNavigateToTasks={() => setCurrentScreen('field_tasks')}
            onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
            isOffline={isOffline}
            onToggleOffline={() => setSimulateOffline((value) => !value)}
            pendingDrafts={submissions.filter((item) => item.sync_status !== 'SYNCED').length}
          />
        );
      case 'field_tasks':
        return (
          <div className="field-screen-wrapper">
            <Screen7FieldTasksList
              user={session.user}
              isOffline={isOffline}
              onToggleOffline={() => setSimulateOffline((value) => !value)}
              onStartVerification={handleStartVerification}
              onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
              tasks={fieldTasks}
            />
          </div>
        );
      case 'field_verify':
        if (!selectedFieldTask) return <div className="workspace-state" role="status"><ClipboardList aria-hidden="true" /><p>No assigned task selected.</p></div>;
        return (
          <div className="field-screen-wrapper">
            <Screen8FieldAssessmentForm
              key={selectedFieldTask.task_id}
              task={selectedFieldTask}
              onBackToTasks={() => setCurrentScreen('field_tasks')}
              onSubmitVerification={handleSubmitVerification}
            />
          </div>
        );
      case 'field_sync':
        return (
          <div className="field-screen-wrapper">
            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between rounded-xl border border-stone-200 bg-stone-100 p-3">
              <span className="text-xs font-medium text-stone-700">Drafts saved on this device; submitted when online</span>
              <button
                type="button"
                onClick={() => setIsSyncDrawerOpen(true)}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-900"
              >
                Open Saved Drafts
              </button>
            </div>
            <Screen7FieldTasksList
              user={session.user}
              isOffline={isOffline}
              onToggleOffline={() => setSimulateOffline((value) => !value)}
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
        return <Screen5DueProcessManager loadDocket={fetchDueProcessDocket} submitAppeal={fileAppeal} describeError={appealErrorMessage}
          completeGraduation={(householdId) => completeGraduation(householdId).catch((error) => { throw new Error(resolutionErrorMessage(error)); })}
          decideAppeal={(docketId, outcome, notes) => decideAppeal(docketId, outcome, notes).catch((error) => { throw new Error(resolutionErrorMessage(error)); })} />;
      case 'coa_dashboard':
        return (
          <CoaAuditDashboard
            auditorName={session.user.full_name}
            onNavigateToLedger={() => setCurrentScreen('audit_ledger')}
            onNavigateToSampling={() => setCurrentScreen('coa_sampling')}
          />
        );
      case 'audit_ledger':
        return <AuditChainVerification key={session.user.user_id} />;
      case 'coa_sampling':
        return <CoaEvidentiarySampling />;
      default:
        return <div className="p-12 text-center text-stone-500">Select a module from the sidebar navigation.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {toastMessage && (
        <div role="status" className="workspace-toast fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-stone-700 bg-[#13233f] px-4 py-3 text-sm text-stone-100 shadow-lg">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {!session || currentScreen === 'login' ? (
        <Screen1Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className={`app-shell ${sidebarCollapsed ? 'sidebar-minimized' : ''}`}>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              userRole={session.user.role}
              jurisdiction={[session.user.jurisdiction.municipality, session.user.jurisdiction.region].filter(Boolean).join(', ') || 'National scope'}
              currentScreen={currentScreen}
              onSelectScreen={(screen) => {
                navigateToScreen(screen);
                if (window.matchMedia('(max-width: 767px)').matches) setSidebarCollapsed(true);
              }}
              pendingTriageCount={triagePagination?.total_records ?? 0}
              assignedTasksCount={fieldTasks.length}
              dueProcessCount={triageSummary?.notice_of_ineligibility_count ?? 0}
              offlineSyncCount={submissions.filter((submission) => submission.sync_status === 'PENDING_SYNC').length}
            />
          {!sidebarCollapsed && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarCollapsed(true)} />}
          <div className="app-main-column" ref={mainColumnRef}>
            <Header
              session={session}
              sidebarCollapsed={sidebarCollapsed}
              onOpenSidebar={() => setSidebarCollapsed(false)}
              onLogout={clearSession}
              currentScreen={currentScreen}
            />
            <main id="main-content" tabIndex={-1} className="app-workspace">
              <DataSourceNotice screen={currentScreen} />
              {session.user.role === 'CASE_WORKER' && assignmentSource === 'device' && dataState === 'ready' && (
                <div className="mx-6 mb-3 flex flex-wrap items-center gap-3 text-sm text-stone-700" role="status">
                  <p>{fieldTasks.length ? 'Showing saved assignments. Current assignment status has not been checked with the server.' : 'No saved assignments for this account. Connect to load your tasks.'}</p>
                  <button type="button" className="record-action" style={{ width: 'auto' }} onClick={() => setReloadCounter(count => count + 1)}><RefreshCw size={16} aria-hidden="true" /> Check server</button>
                </div>
              )}
              {dataError && !['triage', 'field_tasks', 'field_dashboard', 'field_verify', 'dispatch_manager', 'dispatch_modal'].includes(currentScreen) && (
                <div className="mx-6 mb-3 flex flex-wrap items-center gap-3 text-sm text-rose-700">
                  <p role="alert">{dataError}</p>
                  <button type="button" className="record-action" style={{ width: 'auto' }} onClick={() => setReloadCounter((count) => count + 1)}>
                    <RefreshCw size={16} aria-hidden="true" /> Retry API connection
                  </button>
                </div>
              )}
              {renderScreen()}
            </main>
          </div>
        </div>
      )}

      <Screen4TaskDispatchModal
        key={isDispatchModalOpen ? targetHouseholdForDispatch?.household_id : 'closed'}
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        targetHousehold={targetHouseholdForDispatch}
        onDispatched={() => {
          setTriagePage(1);
          setReloadCounter(count => count + 1);
        }}
      />

      <Screen9OfflineSyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        isOffline={isOffline}
        onToggleOffline={() => setSimulateOffline((value) => !value)}
        submissions={submissions}
        onSyncAll={handleSyncAll}
        isSyncing={isSyncing}
        submissionAvailable
      />
    </div>
  );
}
