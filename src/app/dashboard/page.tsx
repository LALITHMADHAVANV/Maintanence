'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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

  // Determine active dashboard view based on user's role
  const activeRole: UserRole = role || 'ADMIN';

  return (
    <div className="space-y-4">
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
          machines={machines}
          repairs={repairs}
          ppmSchedules={ppmSchedules}
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
          ppmSchedules={ppmSchedules}
          parts={parts}
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
