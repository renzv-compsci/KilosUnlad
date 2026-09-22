import React, { useState } from 'react';
import { MOCK_FIELD_TASKS } from '../../data/mockContracts';
import { FieldTaskItem } from '../../types/contracts';
import { 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Send,
  Calendar,
  Building,
  ArrowUpRight
} from 'lucide-react';

interface AdminDispatchManagerProps {
  onOpenDispatchModal: () => void;
  showSpecAnnotations?: boolean;
}

export const AdminDispatchManager: React.FC<AdminDispatchManagerProps> = ({
  onOpenDispatchModal,
  showSpecAnnotations = false,
}) => {
  const [tasks, setTasks] = useState<FieldTaskItem[]>(MOCK_FIELD_TASKS);
  const [selectedMunicipality, setSelectedMunicipality] = useState('ALL');

  const caseworkers = [
    { name: 'Marvin Bautista, RSW', lgu: 'Calamba City', activeTasks: 3, completedMonth: 14, status: 'Active In Field' },
    { name: 'Elena Rosales, RSW', lgu: 'Santa Rosa City', activeTasks: 2, completedMonth: 18, status: 'Office / Report Filing' },
    { name: 'Danilo Cruz, RSW', lgu: 'Biñan City', activeTasks: 4, completedMonth: 12, status: 'Active In Field' },
    { name: 'Maria Santos, RSW', lgu: 'San Pedro City', activeTasks: 3, completedMonth: 11, status: 'Active In Field' },
  ];

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-7xl mx-auto">
      
      {/* Spec Annotation Banner */}
      {showSpecAnnotations && (
        <div className="bg-stone-100 border border-stone-200 rounded-lg p-2.5 text-[10px] font-mono text-stone-600 flex justify-between items-center">
          <div>
            <span className="font-semibold">PERSONA 1: Administrator Caseload & Task Dispatch Manager</span>
            <span className="ml-2">DSWD Regional Director Administrative Operations</span>
          </div>
          <div>admin-dispatch-manager.json</div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold bg-[#132e4f] text-white px-2 py-0.5 rounded font-mono">
              EXECUTIVE DISPATCH CONTROL
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1 font-display">
            Field Caseworker Operations & Dispatch
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitor and deploy Municipal Link field caseworkers across the 5 pilot LGUs in Laguna.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto shrink-0">
          <button
            id="admin-new-dispatch-btn"
            onClick={onOpenDispatchModal}
            className="px-3.5 py-2 bg-[#132e4f] hover:bg-[#0c2340] text-white font-semibold rounded-lg text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dispatch Verification Task</span>
          </button>
        </div>
      </div>

      {/* Caseworker Staff Allocation Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900 font-display">
          Municipal Link Field Staff Deployment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {caseworkers.map((worker) => (
            <div key={worker.name} className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 font-display">{worker.name}</h4>
                  <div className="text-[11px] text-stone-500">{worker.lgu}</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-100">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Active Cases</span>
                  <span className="font-mono font-bold text-[#132e4f] text-sm">{worker.activeTasks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase">Completed</span>
                  <span className="font-mono font-bold text-stone-800 text-sm">{worker.completedMonth}</span>
                </div>
              </div>

              <div className="text-[10px] font-semibold text-stone-600 bg-stone-50 p-1.5 rounded text-center">
                {worker.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatched Field Dockets Queue */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 bg-stone-50/70 border-b border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 font-display">
              Active Dispatched Investigations ({tasks.length})
            </h3>
            <p className="text-xs text-stone-500">
              Assigned verification tasks with statutory 14-day completion clocks under RA 11310.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="p-1.5 border border-stone-300 rounded-lg text-xs bg-white text-stone-700 outline-none"
            >
              <option value="ALL">All Municipalities</option>
              <option value="Calamba City">Calamba City</option>
              <option value="Santa Rosa City">Santa Rosa City</option>
              <option value="Biñan City">Biñan City</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {tasks.map((task) => (
            <div key={task.task_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/50 transition">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs text-[#132e4f]">{task.household_id}</span>
                  <span className="text-stone-300">|</span>
                  <span className="font-semibold text-xs text-stone-900">
                    {task.head_of_household.first_name} {task.head_of_household.last_name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                    {task.priority} Priority
                  </span>
                </div>

                <div className="text-xs text-stone-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{task.address.barangay}, {task.address.municipality}</span>
                </div>

                <p className="text-xs text-stone-600 italic mt-1">
                  &quot;{task.dispatch_instructions}&quot;
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="text-right text-xs">
                  <div className="text-stone-400 text-[10px] uppercase">Statutory Due Date</div>
                  <div className="font-mono font-bold text-stone-800">{task.due_date}</div>
                </div>

                <button
                  onClick={onOpenDispatchModal}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  Manage / Reassign
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
