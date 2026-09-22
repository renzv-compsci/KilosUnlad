import React, { useEffect, useState } from 'react';
import { 
  ScreenId, 
  DeviceMode, 
  RenderFidelity, 
  ViewMode,
  WireframeToolbar, 
  SCREEN_CONFIGS 
} from './components/common/WireframeToolbar';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ContractInspectorModal } from './components/common/ContractInspectorModal';

// Specification Modules (Chapters 01, 06, and Screen Spec Cards)
import { DesignSystemSpec } from './components/specs/DesignSystemSpec';
import { UserFlowsSpec } from './components/specs/UserFlowsSpec';
import { DeveloperScreenSpecCard } from './components/specs/DeveloperScreenSpecCard';
import { SCREEN_SPECS } from './components/specs/screenSpecsData';

// Baseline Screens
import { Screen1Login } from './components/screens/Screen1Login';
import { Screen2Dashboard } from './components/screens/Screen2Dashboard';
import { Screen3TriageQueue } from './components/screens/Screen3TriageQueue';
import { Screen4TaskDispatchModal } from './components/screens/Screen4TaskDispatchModal';
import { Screen5DueProcessManager } from './components/screens/Screen5DueProcessManager';
import { Screen6AuditLedger } from './components/screens/Screen6AuditLedger';
import { Screen7FieldTasksList } from './components/screens/Screen7FieldTasksList';
import { Screen8FieldAssessmentForm } from './components/screens/Screen8FieldAssessmentForm';
import { Screen9OfflineSyncDrawer } from './components/screens/Screen9OfflineSyncDrawer';

// Dedicated Persona-Specific Screens
import { AdminDispatchManager } from './components/persona/AdminDispatchManager';
import { AdminSettingsView } from './components/persona/AdminSettingsView';
import { FieldCaseworkerDashboard } from './components/persona/FieldCaseworkerDashboard';
import { GrievanceAppealsDashboard } from './components/persona/GrievanceAppealsDashboard';
import { CoaAuditDashboard } from './components/persona/CoaAuditDashboard';
import { CoaEvidentiarySampling } from './components/persona/CoaEvidentiarySampling';

import { 
  UserSession, 
  BeneficiaryTriageItem, 
  DispatchTaskPayload, 
  FieldTaskItem, 
  FieldTaskSubmission 
} from './types/contracts';
import { 
  MOCK_USERS, 
  MOCK_TRIAGE_ITEMS, 
  MOCK_FIELD_TASKS 
} from './data/mockContracts';
import { fetchAssignedTasks, fetchTriageQueue } from './services/api';
import { 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  Tablet,
  ArrowLeft,
  Lock,
  Split,
  FileText
} from 'lucide-react';

// Role-Based Screen Permissions Definition
const ROLE_CONFIG: Record<string, {
  defaultScreen: ScreenId;
  allowedScreens: ScreenId[];
  roleTitle: string;
  defaultDevice: DeviceMode;
}> = {
  DSWD_DIRECTOR: {
    defaultScreen: 'dashboard',
    allowedScreens: ['dashboard', 'triage', 'dispatch_manager', 'dispatch_modal', 'due_process', 'admin_settings'],
    roleTitle: 'Regional Director (Executive Admin)',
    defaultDevice: 'desktop'
  },
  MUNICIPAL_LINK: {
    defaultScreen: 'field_dashboard',
    allowedScreens: ['field_dashboard', 'field_tasks', 'field_verify', 'field_sync'],
    roleTitle: 'Municipal Link (Field Caseworker)',
    defaultDevice: 'tablet'
  },
  GRIEVANCE_OFFICER: {
    defaultScreen: 'grievance_dashboard',
    allowedScreens: ['grievance_dashboard', 'due_process', 'appeal_hearing'],
    roleTitle: 'Social Welfare Officer II (Grievance & Appeals)',
    defaultDevice: 'desktop'
  },
  COA_AUDITOR: {
    defaultScreen: 'coa_dashboard',
    allowedScreens: ['coa_dashboard', 'audit_ledger', 'coa_sampling'],
    roleTitle: 'COA State Auditor (Audit Oversight)',
    defaultDevice: 'desktop'
  }
};

export default function App() {
  // Session & User Role
  const [session, setSession] = useState<UserSession>(MOCK_USERS.director);
  const [triageItems, setTriageItems] = useState<BeneficiaryTriageItem[]>(MOCK_TRIAGE_ITEMS);
  const [fieldTasks, setFieldTasks] = useState<FieldTaskItem[]>(MOCK_FIELD_TASKS);
  const [triageSourceLabel, setTriageSourceLabel] = useState('Static mock contract');
  const [taskSourceLabel, setTaskSourceLabel] = useState('Static mock contract');

  // Global Wireframe & Figma Specification State
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('live_ui');
  const [fidelity, setFidelity] = useState<RenderFidelity>('full');
  const [showSpecAnnotations, setShowSpecAnnotations] = useState(false);
  const [isContractDrawerOpen, setIsContractDrawerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Task Dispatch Modal State (Admin)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [targetHouseholdForDispatch, setTargetHouseholdForDispatch] = useState<BeneficiaryTriageItem | null>(
    triageItems[0]
  );

  // Field Verification State (Municipal Link)
  const [selectedFieldTask, setSelectedFieldTask] = useState<FieldTaskItem>(fieldTasks[0]);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [submissions, setSubmissions] = useState<FieldTaskSubmission[]>([
    {
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
          client_side_hash: 'SHA-256: 9b21f00a...c441'
        }
      ],
      worker_recommendation: 'RETAIN',
      narrative_report: 'Household verified in Sinalhan. Motorcycle used as daily delivery service. LandBank card produced in physical custody.',
      sync_status: 'PENDING_SYNC'
    }
  ]);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBackendMocks() {
      try {
        const [remoteTriage, remoteTasks] = await Promise.all([
          fetchTriageQueue(),
          fetchAssignedTasks(),
        ]);

        if (!isMounted) return;

        if (remoteTriage.length > 0) {
          setTriageItems(remoteTriage);
          setTargetHouseholdForDispatch(remoteTriage[0]);
          setTriageSourceLabel('Backend API: /beneficiaries/triage-queue');
        }

        if (remoteTasks.length > 0) {
          setFieldTasks(remoteTasks);
          setSelectedFieldTask(remoteTasks[0]);
          setTaskSourceLabel('Backend API: /tasks/assigned');
        }
      } catch {
        if (!isMounted) return;
        setTriageSourceLabel('Static mock fallback: backend unavailable');
        setTaskSourceLabel('Static mock fallback: backend unavailable');
      }
    }

    loadBackendMocks();

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Role Switching with Strict Navigation Enforcing
  const handleSwitchUser = (roleKey: string) => {
    const newUserSession = MOCK_USERS[roleKey];
    if (!newUserSession) return;

    setSession(newUserSession);
    const roleConfig = ROLE_CONFIG[newUserSession.user.role];

    if (roleConfig) {
      setCurrentScreen(roleConfig.defaultScreen);
      // Auto adjust viewport device recommendation if switching to field caseworker
      if (roleConfig.defaultDevice === 'tablet' && deviceMode === 'desktop') {
        setDeviceMode('tablet');
      } else if (roleConfig.defaultDevice === 'desktop' && (deviceMode === 'tablet' || deviceMode === 'mobile')) {
        setDeviceMode('desktop');
      }
      showToast(`Switched persona to ${newUserSession.user.full_name} (${roleConfig.roleTitle})`);
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    const roleConfig = ROLE_CONFIG[userSession.user.role];
    const defaultScr = roleConfig ? roleConfig.defaultScreen : 'dashboard';
    setCurrentScreen(defaultScr);
    showToast(`Signed in successfully as ${userSession.user.full_name}`);
  };

  const handleOpenDispatch = (item: BeneficiaryTriageItem) => {
    setTargetHouseholdForDispatch(item);
    setIsDispatchModalOpen(true);
  };

  const handleDispatchSuccess = (payload: DispatchTaskPayload) => {
    showToast(`Task successfully dispatched to ${payload.assigned_worker_name} for household ${payload.household_id}`);
    setIsDispatchModalOpen(false);
    setCurrentScreen('triage');
  };

  const handleStartVerification = (task: FieldTaskItem) => {
    setSelectedFieldTask(task);
    setCurrentScreen('field_verify');
    if (deviceMode === 'desktop') {
      setDeviceMode('tablet');
    }
  };

  const handleSubmitVerification = (submission: FieldTaskSubmission) => {
    setSubmissions((prev) => [submission, ...prev]);
    showToast(`Verification for ${submission.household_id} recorded in offline storage!`);
    setCurrentScreen('field_sync');
    setIsSyncDrawerOpen(true);
  };

  const handleSyncAll = () => {
    setSubmissions((prev) =>
      prev.map((s) => ({ ...s, sync_status: 'SYNCED' as const }))
    );
    showToast('All cached field reports pushed to DSWD Central MIS successfully!');
  };

  // RBAC Permission Check
  const currentRoleConfig = ROLE_CONFIG[session.user.role] || ROLE_CONFIG.DSWD_DIRECTOR;
  const isGlobalScreen = currentScreen === 'design_system' || currentScreen === 'user_flows' || currentScreen === 'login';
  const isScreenAuthorized = isGlobalScreen || currentRoleConfig.allowedScreens.includes(currentScreen);

  // Live Screen Renderer
  const renderLiveScreen = () => {
    // Role-Specific Screen Switch
    switch (currentScreen) {
      case 'design_system':
        return <DesignSystemSpec />;

      case 'user_flows':
        return <UserFlowsSpec />;

      case 'login':
        return (
          <Screen1Login 
            onLoginSuccess={handleLoginSuccess}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      // --- Director / Admin Screens ---
      case 'dashboard':
        return (
          <Screen2Dashboard
            onNavigateToScreen={(scr) => {
              if (currentRoleConfig.allowedScreens.includes(scr)) {
                setCurrentScreen(scr);
              } else {
                showToast(`Unauthorized module for ${currentRoleConfig.roleTitle}`);
              }
            }}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'triage':
        return (
              <Screen3TriageQueue
                onDispatchTask={handleOpenDispatch}
                showSpecAnnotations={showSpecAnnotations}
                items={triageItems}
                dataSourceLabel={triageSourceLabel}
              />
        );

      case 'dispatch_manager':
        return (
          <AdminDispatchManager
            onOpenDispatchModal={() => {
              setTargetHouseholdForDispatch(triageItems[0]);
              setIsDispatchModalOpen(true);
            }}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'dispatch_modal':
        return (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 text-xs text-blue-900 flex items-center justify-between">
              <div>
                <span className="font-bold">Task Dispatch Dialog:</span> Select household and assign to field municipal link.
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(true)}
                className="px-3 py-1.5 bg-[#132e4f] text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
              >
                Launch Dispatch Dialog
              </button>
            </div>
            <Screen3TriageQueue
              onDispatchTask={handleOpenDispatch}
              showSpecAnnotations={showSpecAnnotations}
              items={triageItems}
              dataSourceLabel={triageSourceLabel}
            />
          </div>
        );

      case 'admin_settings':
        return (
          <AdminSettingsView
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      // --- Municipal Link / Field Caseworker Screens (Persona 1) ---
      case 'field_dashboard':
        return (
          <FieldCaseworkerDashboard
            onStartVerification={handleStartVerification}
            onNavigateToTasks={() => setCurrentScreen('field_tasks')}
            onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
            isOffline={isOffline}
            onToggleOffline={() => setIsOffline(!isOffline)}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'field_tasks':
        return (
          <div className="p-4 sm:p-6">
            <Screen7FieldTasksList
              isOffline={isOffline}
              onToggleOffline={() => setIsOffline(!isOffline)}
              onStartVerification={handleStartVerification}
              onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
              showSpecAnnotations={showSpecAnnotations}
              tasks={fieldTasks}
              dataSourceLabel={taskSourceLabel}
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
              showSpecAnnotations={showSpecAnnotations}
            />
          </div>
        );

      case 'field_sync':
        return (
          <div className="p-4 sm:p-6">
            <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between bg-stone-100 p-3 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-700 font-medium">Local IndexedDB Storage Drawer</span>
              <button
                onClick={() => setIsSyncDrawerOpen(true)}
                className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition cursor-pointer"
              >
                Open Offline Sync Modal
              </button>
            </div>
            <Screen7FieldTasksList
              isOffline={isOffline}
              onToggleOffline={() => setIsOffline(!isOffline)}
              onStartVerification={handleStartVerification}
              onOpenSyncDrawer={() => setIsSyncDrawerOpen(true)}
              showSpecAnnotations={showSpecAnnotations}
              tasks={fieldTasks}
              dataSourceLabel={taskSourceLabel}
            />
          </div>
        );

      // --- Grievance & Statutory Appeals Screens (Persona 2) ---
      case 'grievance_dashboard':
        return (
          <GrievanceAppealsDashboard
            onNavigateToScreen={(scr) => setCurrentScreen(scr)}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'due_process':
      case 'appeal_hearing':
        return (
          <Screen5DueProcessManager
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      // --- COA State Auditor Screens (Persona 3) ---
      case 'coa_dashboard':
        return (
          <CoaAuditDashboard
            onNavigateToLedger={() => setCurrentScreen('audit_ledger')}
            onNavigateToSampling={() => setCurrentScreen('coa_sampling')}
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'audit_ledger':
        return (
          <Screen6AuditLedger
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      case 'coa_sampling':
        return (
          <CoaEvidentiarySampling
            showSpecAnnotations={showSpecAnnotations}
          />
        );

      default:
        return (
          <div className="p-12 text-center text-stone-500">
            Select a module from the sidebar navigation.
          </div>
        );
    }
  };

  // Content Dispatcher handling View Mode (Live UI, Dev Spec Sheet, or Split View)
  const renderScreenContent = () => {
    // If not authorized for this persona and not in Figma spec mode, show Access Restricted Warning
    if (!isScreenAuthorized && viewMode === 'live_ui') {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-stone-200/90 shadow-2xs text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <Lock className="w-6 h-6" />
          </div>
          <div className="inline-block text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-stone-100 text-stone-700 mb-2">
            HTTP 403: Role-Based Access Control
          </div>
          <h2 className="text-xl font-bold text-stone-900 font-display">
            Module Access Restricted
          </h2>
          <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto leading-relaxed">
            The screen <span className="font-mono font-semibold text-stone-900">"{currentScreen}"</span> is designated for another persona and not authorized for <strong className="text-stone-800">{currentRoleConfig.roleTitle}</strong>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setCurrentScreen(currentRoleConfig.defaultScreen)}
              className="px-4 py-2 bg-[#132e4f] text-white rounded-lg text-xs font-semibold hover:bg-[#1a3d66] transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to {currentRoleConfig.roleTitle} Dashboard</span>
            </button>
            <button
              onClick={() => setViewMode('spec_sheet')}
              className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Developer Specification</span>
            </button>
          </div>
        </div>
      );
    }

    // Direct Chapter Screens
    if (currentScreen === 'design_system') {
      return <DesignSystemSpec />;
    }
    if (currentScreen === 'user_flows') {
      return <UserFlowsSpec />;
    }

    // View Mode Handling
    if (viewMode === 'spec_sheet') {
      return (
        <DeveloperScreenSpecCard 
          spec={SCREEN_SPECS[currentScreen] || SCREEN_SPECS.dashboard}
          onNavigateToScreen={(scr) => setCurrentScreen(scr as ScreenId)}
        />
      );
    }

    if (viewMode === 'split_view') {
      return (
        <div className="space-y-8 pb-12">
          {/* Top Half: Live Screen Canvas */}
          <div className="bg-stone-100 p-3 sm:p-5 rounded-2xl border border-stone-300">
            <div className="flex items-center justify-between mb-3 text-xs font-mono text-stone-600">
              <span className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>LIVE UI CANVAS (Preserved Implementation)</span>
              </span>
              <span>{SCREEN_CONFIGS[currentScreen]?.number} · {SCREEN_CONFIGS[currentScreen]?.title}</span>
            </div>
            <div className="bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
              {renderLiveScreen()}
            </div>
          </div>

          {/* Bottom Half: Developer Specification Sheet */}
          <div className="pt-4 border-t-2 border-dashed border-stone-300">
            <DeveloperScreenSpecCard 
              spec={SCREEN_SPECS[currentScreen] || SCREEN_SPECS.dashboard}
              onNavigateToScreen={(scr) => setCurrentScreen(scr as ScreenId)}
            />
          </div>
        </div>
      );
    }

    // Default: Live UI Screen
    return renderLiveScreen();
  };

  return (
    <div className={`min-h-screen ${
      fidelity === 'wireframe' 
        ? 'bg-stone-100 text-stone-800 font-sans [background-image:linear-gradient(to_right,#e7e5e4_1px,transparent_1px),linear-gradient(to_bottom,#e7e5e4_1px,transparent_1px)] [background-size:24px_24px]' 
        : 'bg-stone-50 text-stone-900 font-sans'
    }`}>

      {/* Top Wireframe & Figma Specification Toolbar */}
      <WireframeToolbar
        currentScreen={currentScreen}
        onSelectScreen={(screen) => {
          setCurrentScreen(screen);
          if (screen === 'dispatch_modal') {
            setIsDispatchModalOpen(true);
          } else if (screen === 'field_sync') {
            setIsSyncDrawerOpen(true);
          }
        }}
        deviceMode={deviceMode}
        onToggleDeviceMode={setDeviceMode}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        fidelity={fidelity}
        onToggleFidelity={setFidelity}
        showSpecAnnotations={showSpecAnnotations}
        onToggleSpecAnnotations={() => setShowSpecAnnotations(!showSpecAnnotations)}
        onOpenContractDrawer={() => setIsContractDrawerOpen(true)}
        isOffline={isOffline}
        onToggleOffline={() => {
          setIsOffline(!isOffline);
          showToast(isOffline ? 'Online: Central GovCloud link restored' : 'Offline: Simulated field mode active');
        }}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#132e4f] text-stone-100 px-4 py-3 rounded-xl shadow-2xl border border-stone-700 flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="w-full">
        {deviceMode === 'tablet' ? (
          /* Mobile Tablet Frame Container (768px - 1024px) */
          <div className="py-6 px-3 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
            
            {/* Tablet Frame Header Indicator */}
            <div className="mb-2 flex items-center space-x-2 text-xs text-stone-500 font-mono">
              <Tablet className="w-4 h-4 text-emerald-700" />
              <span>Tablet PWA Viewport (768px - 1024px Touch Frame · Active: {currentRoleConfig.roleTitle})</span>
              <button 
                onClick={() => setDeviceMode('desktop')}
                className="ml-2 text-stone-700 underline text-[11px] hover:text-stone-900 cursor-pointer"
              >
                Expand to Desktop
              </button>
            </div>

            {/* Tablet Shell */}
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-8 border-stone-800 overflow-hidden flex flex-col min-h-[750px]">
              
              {/* Tablet Top Camera Notch Bar */}
              <div className="bg-stone-800 py-1.5 px-4 flex items-center justify-between text-stone-400 text-[10px] font-mono">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-stone-200">KilosUnlad PWA</span>
                  <span>·</span>
                  <span className={isOffline ? 'text-amber-400' : 'text-emerald-400'}>
                    {isOffline ? 'Offline Cache' : 'GovCloud Connected'}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-stone-700 border border-stone-600"></div>
                <div>Battery: 92% | Calamba Cluster</div>
              </div>

              {/* Tablet App Content */}
              <div className="flex-1 overflow-y-auto bg-stone-50">
                {renderScreenContent()}
              </div>

            </div>
          </div>
        ) : deviceMode === 'mobile' ? (
          /* Mobile Phone Frame Container (375px) */
          <div className="py-6 px-3 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
            
            {/* Mobile Frame Header Indicator */}
            <div className="mb-2 flex items-center space-x-2 text-xs text-stone-500 font-mono">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>Mobile Viewport (375px Phone Frame · Responsive Inspection)</span>
              <button 
                onClick={() => setDeviceMode('desktop')}
                className="ml-2 text-stone-700 underline text-[11px] hover:text-stone-900 cursor-pointer"
              >
                Expand to Desktop
              </button>
            </div>

            {/* Mobile Shell */}
            <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl border-[10px] border-stone-800 overflow-hidden flex flex-col min-h-[720px]">
              {/* Dynamic Island / Top Notch */}
              <div className="bg-stone-800 py-2 px-5 flex items-center justify-between text-stone-400 text-[10px] font-mono">
                <span className="text-stone-200 font-bold">9:41</span>
                <div className="w-16 h-4 bg-black rounded-full"></div>
                <span>5G · 100%</span>
              </div>

              {/* Mobile Content */}
              <div className="flex-1 overflow-y-auto bg-stone-50">
                {renderScreenContent()}
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Web Experience (>= 1024px) */
          <div>
            {currentScreen === 'login' ? (
              <Screen1Login
                onLoginSuccess={handleLoginSuccess}
                showSpecAnnotations={showSpecAnnotations}
              />
            ) : currentScreen === 'design_system' || currentScreen === 'user_flows' ? (
              <div className="min-h-screen bg-stone-50">
                {renderScreenContent()}
              </div>
            ) : (
              <div className="flex flex-col min-h-screen">
                {/* Official Global Header */}
                <Header
                  session={session}
                  onLogout={() => {
                    setCurrentScreen('login');
                    showToast('Logged out of session');
                  }}
                  onSwitchUser={handleSwitchUser}
                  showSpecAnnotations={showSpecAnnotations}
                />

                {/* Portal Body with Role-Filtered Sidebar */}
                <div className="flex-1 flex">
                  <Sidebar
                    userRole={session.user.role}
                    currentScreen={currentScreen}
                    onSelectScreen={(scr) => {
                      setCurrentScreen(scr);
                      if (scr === 'dispatch_modal') {
                        setIsDispatchModalOpen(true);
                      } else if (scr === 'field_sync') {
                        setIsSyncDrawerOpen(true);
                      }
                    }}
                    pendingTriageCount={32}
                    dueProcessCount={3}
                    offlineSyncCount={submissions.filter(s => s.sync_status === 'PENDING_SYNC').length}
                    showSpecAnnotations={showSpecAnnotations}
                  />

                  {/* Main Desktop Screen Viewport */}
                  <main className="flex-1 overflow-x-hidden min-w-0 bg-white">
                    {renderScreenContent()}
                  </main>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Screen 4: Task Dispatch Modal Dialog */}
      <Screen4TaskDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        targetHousehold={targetHouseholdForDispatch}
        onDispatchSuccess={handleDispatchSuccess}
        showSpecAnnotations={showSpecAnnotations}
      />

      {/* Screen 9: Offline Sync Status Drawer */}
      <Screen9OfflineSyncDrawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        submissions={submissions}
        onSyncAll={handleSyncAll}
        showSpecAnnotations={showSpecAnnotations}
      />

      {/* Contract & Specification Inspector Drawer */}
      <ContractInspectorModal
        isOpen={isContractDrawerOpen}
        onClose={() => setIsContractDrawerOpen(false)}
        activeScreen={currentScreen}
      />

    </div>
  );
}
