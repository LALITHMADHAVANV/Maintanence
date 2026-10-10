'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Wrench,
  ShieldAlert,
  Package,
  Crown,
  Layers,
  Sparkles,
  Users,
  Eye,
} from 'lucide-react';
import type { Machine, RepairTicket, PPMSchedule, SparePart, PartRequisition, UserRole } from '@/types/cmms';
import { PlantOperationsDashboard } from '@/components/dashboard/PlantOperationsDashboard';
import { SeniorMechanicDashboard } from '@/components/dashboard/SeniorMechanicDashboard';
import { MechanicDeskDashboard } from '@/components/dashboard/MechanicDeskDashboard';
import { StoreDashboard } from '@/components/dashboard/StoreDashboard';
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const { showToast } = useToast();

  // ─── API data state ──────────────────────────────────────────────────
  const [machines, setMachines] = useState<Machine[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ─── Admin / Supervisor Role Preview Switcher ─────────────────────────
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  // ─── Fetch all data ──────────────────────────────────────────────────
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [machRes, repRes, ppmRes, partRes, reqRes] = await Promise.allSettled([
        fetch('/api/machines').then((r) => r.json()),
        fetch('/api/repairs').then((r) => r.json()),
        fetch('/api/ppm').then((r) => r.json()),
        fetch('/api/parts').then((r) => r.json()),
        fetch('/api/requisitions').then((r) => r.json()),
      ]);

      if (machRes.status === 'fulfilled' && machRes.value?.data) setMachines(machRes.value.data);
      if (repRes.status === 'fulfilled' && repRes.value?.data) setRepairs(repRes.value.data);
      if (ppmRes.status === 'fulfilled' && ppmRes.value?.data) setPpmSchedules(ppmRes.value.data);
      if (partRes.status === 'fulfilled' && partRes.value?.data) setParts(partRes.value.data);
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) setRequisitions(reqRes.value.data);

      setLastRefresh(new Date());
    } catch {
      showToast('Failed to load dashboard data', 'error');
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (!isLoading && user) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  // Determine active dashboard view: Preview role override or user's real role
  const activeRole: UserRole = previewRole || role || 'ADMIN';
  const isAdminOrManager = role === 'ADMIN' || role === 'ASSET_MANAGER';

  return (
    <div className="space-y-4">
      {/* ─── ADMIN ROLE SWITCHER STRIP (Only visible to Admin & Asset Manager) ─── */}
      {isAdminOrManager && (
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md border border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
              <Eye className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-slate-300">Admin Perspective:</span>
            <span className="text-slate-400">Preview role-specific dashboards live:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { r: null, label: '🏭 Plant Operations' },
              { r: 'SENIOR_MECHANIC' as UserRole, label: '👨‍🔧 Senior Mechanic' },
              { r: 'MECHANIC' as UserRole, label: '🦺 Junior Mechanic' },
              { r: 'STORE_PERSON' as UserRole, label: '📦 Store In-Charge' },
              { r: 'CEO' as UserRole, label: '👑 CEO Executive' },
            ].map((tab) => {
              const isSelected = previewRole === tab.r || (tab.r === null && previewRole === null);
              return (
                <button
                  key={tab.label}
                  onClick={() => setPreviewRole(tab.r)}
                  className={`px-3 py-1 rounded-xl font-semibold transition cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DYNAMIC ROLE-BASED DASHBOARD RENDER ───────────────────────── */}
      {activeRole === 'SENIOR_MECHANIC' || activeRole === 'SENIOR_ELECTRICIAN' ? (
        <SeniorMechanicDashboard
          machines={machines}
          repairs={repairs}
          ppmSchedules={ppmSchedules}
          parts={parts}
          requisitions={requisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'MECHANIC' || activeRole === 'ELECTRICIAN' ? (
        <MechanicDeskDashboard
          machines={machines}
          repairs={repairs}
          ppmSchedules={ppmSchedules}
          parts={parts}
          requisitions={requisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'STORE_PERSON' ? (
        <StoreDashboard
          parts={parts}
          requisitions={requisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'CEO' ? (
        <ExecutiveDashboard
          machines={machines}
          repairs={repairs}
          requisitions={requisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : (
        <PlantOperationsDashboard
          machines={machines}
          repairs={repairs}
          ppmSchedules={ppmSchedules}
          parts={parts}
          requisitions={requisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      )}
    </div>
  );
}
