'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';

import type { Machine, RepairTicket, PPMSchedule, SparePart, PartRequisition, UserRole } from '@/types/cmms';
const PlantOperationsDashboard = dynamic(() => import('@/components/dashboard/PlantOperationsDashboard').then((module) => module.PlantOperationsDashboard));
const SeniorMechanicDashboard = dynamic(() => import('@/components/dashboard/SeniorMechanicDashboard').then((module) => module.SeniorMechanicDashboard));
const MechanicDeskDashboard = dynamic(() => import('@/components/dashboard/MechanicDeskDashboard').then((module) => module.MechanicDeskDashboard));
const StoreDashboard = dynamic(() => import('@/components/dashboard/StoreDashboard').then((module) => module.StoreDashboard));
const ExecutiveDashboard = dynamic(() => import('@/components/dashboard/ExecutiveDashboard').then((module) => module.ExecutiveDashboard));
import { matchesUnit, getUserScopedUnit } from '@/lib/constants/units';
import { normalizeRole } from '@/lib/constants/roles';
import { useNav } from '@/context/NavContext';

import {
  subscribeMachines,
  fetchRepairsOnce,
  subscribeRepairs,
  subscribePPMSchedules,
  subscribeParts,
  subscribeRequisitions,
  fetchMachinesOnce,
  fetchPPMSchedulesOnce,
  fetchPartsOnce,
  fetchRequisitionsOnce,
} from '@/lib/services/cmmsService';

export default function DashboardPage() {

  const { user, role, isLoading } = useAuth();


  // ─── API data state ──────────────────────────────────────────────────
  const [machines, setMachines] = useState<Machine[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [ppmSchedules, setPpmSchedules] = useState<PPMSchedule[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ─── Scoped Unit State ───────────────────────────────────────────────
  const { selectedUnit } = useNav();

  // ─── Immediate local reactive subscriptions ─────────────────────────
  useEffect(() => {
    if (isLoading || !user) return;
    const unsubMachines = subscribeMachines((data) => {
      if (Array.isArray(data)) setMachines(data);
    });
    const unsubRepairs = subscribeRepairs((data) => {
      if (Array.isArray(data)) setRepairs(data);
    });
    const unsubPpm = subscribePPMSchedules((data) => {
      if (Array.isArray(data)) setPpmSchedules(data);
    });
    const unsubParts = subscribeParts((data) => {
      if (Array.isArray(data)) setParts(data);
    });
    const unsubReqs = subscribeRequisitions((data) => {
      if (Array.isArray(data)) setRequisitions(data);
    });

    return () => {
      unsubMachines();
      unsubRepairs();
      unsubPpm();
      unsubParts();
      unsubReqs();
    };
  }, [isLoading, user]);

  // ─── Fetch all data from MongoDB ─────────────────────────────────────
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.allSettled([
        fetchMachinesOnce(true), fetchRepairsOnce(true), fetchPPMSchedulesOnce(true),
        fetchPartsOnce(true), fetchRequisitionsOnce(true),
      ]);
      setLastRefresh(new Date());
    } finally {
      setDataLoading(false);
    }
  };

  // Determine active dashboard view based on user's normalized role
  const activeRole: UserRole = normalizeRole(user?.role || role);

  useEffect(() => {
    if (!user || activeRole !== 'STORE_PERSON') return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void fetchRepairsOnce();
    };
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user, activeRole]);

  // Multi-unit authority: ONLY Admin & CEO can access/switch all units
  const effectiveUnit = getUserScopedUnit(user, activeRole, selectedUnit);

  // Scoped data by unit - strictly categorized based on what unit they handle for all mechanics & personnel except admin
  const scopedMachines = useMemo(() => {
    if (!effectiveUnit || effectiveUnit === 'All Units') return machines;
    return machines.filter((m) => matchesUnit(m.unit, effectiveUnit));
  }, [machines, effectiveUnit]);

  const scopedRepairs = useMemo(() => {
    if (!effectiveUnit || effectiveUnit === 'All Units') return repairs;
    const machineIdSet = new Set(scopedMachines.map((m) => (m.id || '').toUpperCase()));
    return repairs.filter((r) => !r.machineId || machineIdSet.has((r.machineId || '').toUpperCase()));
  }, [repairs, scopedMachines, effectiveUnit]);

  const scopedPpmSchedules = useMemo(() => {
    if (!effectiveUnit || effectiveUnit === 'All Units') return ppmSchedules;
    const machineIdSet = new Set(scopedMachines.map((m) => (m.id || '').toUpperCase()));
    return ppmSchedules.filter((p) => !p.machineId || machineIdSet.has((p.machineId || '').toUpperCase()));
  }, [ppmSchedules, scopedMachines, effectiveUnit]);

  const scopedParts = useMemo(() => {
    // Spare parts are factory-wide inventory, categorized and mapped by machine type
    return parts;
  }, [parts]);

  const scopedRequisitions = useMemo(() => {
    if (!effectiveUnit || effectiveUnit === 'All Units') return requisitions;
    const machineIdSet = new Set(scopedMachines.map((m) => (m.id || '').toUpperCase()));
    return requisitions.filter((r) => !r.machineId || machineIdSet.has((r.machineId || '').toUpperCase()));
  }, [requisitions, scopedMachines, effectiveUnit]);

  return (
    <div className="space-y-4">
      {/* ─── DYNAMIC ROLE-BASED DASHBOARD RENDER ───────────────────────── */}
      {activeRole === 'SENIOR_MECHANIC' || activeRole === 'SENIOR_ELECTRICIAN' ? (
        <SeniorMechanicDashboard
          machines={scopedMachines}
          repairs={scopedRepairs}
          ppmSchedules={scopedPpmSchedules}
          parts={scopedParts}
          requisitions={scopedRequisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'MECHANIC' || activeRole === 'SERVICE_MECHANIC' || activeRole === 'ELECTRICIAN' ? (
        <MechanicDeskDashboard
          machines={scopedMachines}
          repairs={scopedRepairs}
          ppmSchedules={scopedPpmSchedules}
          parts={scopedParts}
          requisitions={scopedRequisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'STORE_PERSON' ? (
        <StoreDashboard
          machines={scopedMachines}
          repairs={scopedRepairs}
          ppmSchedules={scopedPpmSchedules}
          parts={scopedParts}
          requisitions={scopedRequisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : activeRole === 'CEO' ? (
        <ExecutiveDashboard
          machines={scopedMachines}
          repairs={scopedRepairs}
          ppmSchedules={scopedPpmSchedules}
          parts={scopedParts}
          requisitions={scopedRequisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      ) : (
        <PlantOperationsDashboard
          machines={scopedMachines}
          repairs={scopedRepairs}
          ppmSchedules={scopedPpmSchedules}
          parts={scopedParts}
          requisitions={scopedRequisitions}
          lastRefresh={lastRefresh}
          onRefresh={fetchAllData}
          isLoading={dataLoading}
        />
      )}
    </div>
  );
}
