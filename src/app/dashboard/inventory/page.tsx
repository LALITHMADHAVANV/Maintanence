'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Boxes,
  PackageOpen,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Truck,
  X,
  FileSpreadsheet,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  IndianRupee,
  AlertOctagon,
  Clock,
  User,
  Users,
  ArrowRight,
  Send,
  Building,
  Zap,
  Trash2,
  ListPlus,
  Layers,
  Lock,
  ChevronDown,
  Wrench,
  Gauge,
} from 'lucide-react';
import {
  SparePart,
  PartRequisition,
  RequisitionType,
  RequisitionUrgency,
  RequisitionItem,
} from '@/types/cmms';
import {
  subscribeParts,
  adjustPartStock,
  restockPart,
  subscribeRequisitions,
  createRequisition,
  approveRequisition,
  rejectRequisition,
} from '@/lib/services/cmmsService';
import { FACTORY_MECHANICS_ROSTER, MechanicDuty } from '@/lib/constants/mechanics';
import { MechanicCustodyModal } from '@/components/mechanic/MechanicCustodyModal';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export default function InventoryPage() {
  const { showToast } = useToast();
  const { user, role } = useAuth();

  const isStorePersonOrAdmin = role === 'STORE_PERSON' || role === 'ADMIN' || role === 'ASSET_MANAGER';
  const isMechanicOrAdmin = role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN' || role === 'SENIOR_ELECTRICIAN' || role === 'ADMIN' || role === 'ASSET_MANAGER';

  // Strict authorization matrix: only authorized executives/admin can approve critical needs
  const isAuthorizedToApproveCritical = role === 'CEO' || role === 'ADMIN' || role === 'ASSET_MANAGER';
  const isAuthorizedToApproveGeneral = role === 'STORE_PERSON' || role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'CEO';

  const [parts, setParts] = useState<SparePart[]>([]);
  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);

  // Mechanic Custody details state
  const [selectedMechanic, setSelectedMechanic] = useState<MechanicDuty | null>(null);
  const [isMechCustodyOpen, setIsMechCustodyOpen] = useState(false);
  const [activeMechanicId, setActiveMechanicId] = useState<string>('ELEC-02');
  const [showFullPartsTable, setShowFullPartsTable] = useState(false);

  // For Senior Electrician, ONLY show junior electricians
  const visibleMechanics = useMemo(() => {
    if (role === 'SENIOR_ELECTRICIAN') {
      return FACTORY_MECHANICS_ROSTER.filter(
        (m) => m.trade === 'ELECTRICIAN' && m.id !== 'ELEC-01' && !m.role.toLowerCase().includes('senior')
      );
    }
    if (role === 'SENIOR_MECHANIC') {
      return FACTORY_MECHANICS_ROSTER.filter((m) => m.trade === 'MECHANIC');
    }
    return FACTORY_MECHANICS_ROSTER;
  }, [role]);

  // Sync active selected mechanic
  useEffect(() => {
    if (visibleMechanics.length > 0 && !visibleMechanics.some((m) => m.id === activeMechanicId)) {
      setActiveMechanicId(visibleMechanics[0].id);
    }
  }, [visibleMechanics, activeMechanicId]);

  const currentMechanicData = useMemo(
    () => visibleMechanics.find((m) => m.id === activeMechanicId) || visibleMechanics[0] || FACTORY_MECHANICS_ROSTER[0],
    [activeMechanicId, visibleMechanics]
  );

  const handleOpenMechanicCustody = (mechIdentifier: string | MechanicDuty) => {
    if (typeof mechIdentifier === 'object' && mechIdentifier !== null) {
      setSelectedMechanic(mechIdentifier);
      setActiveMechanicId(mechIdentifier.id);
      setIsMechCustodyOpen(true);
      return;
    }
    const cleanName = (mechIdentifier || '').toLowerCase();
    const found = FACTORY_MECHANICS_ROSTER.find(
      (m) =>
        m.name.toLowerCase().includes(cleanName) ||
        cleanName.includes(m.name.toLowerCase()) ||
        m.id.toLowerCase() === cleanName
    );
    const mech = found || FACTORY_MECHANICS_ROSTER[0];
    setSelectedMechanic(mech);
    setActiveMechanicId(mech.id);
    setIsMechCustodyOpen(true);
  };

  // Requisition Hub Modal tab: 'MONTHLY_INDENT' | 'URGENT_NEED' | 'CRITICAL_CEO' | 'VIEW_ALL'
  const [reqModalTab, setReqModalTab] = useState<RequisitionType | 'VIEW_ALL'>('MONTHLY_INDENT');

  // Search & filters for inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Search & filters for requisitions
  const [reqFilter, setReqFilter] = useState<
    'ALL' | 'CRITICAL' | 'URGENT' | 'MONTHLY' | 'PENDING' | 'APPROVED'
  >('ALL');

  // Restock Modal state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockPartId, setRestockPartId] = useState('');
  const [restockQty, setRestockQty] = useState<number>(50);
  const [restockPO, setRestockPO] = useState('');

  // Requisition Modal state
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [reqMode, setReqMode] = useState<RequisitionType>('MONTHLY_INDENT');

  // Single-part fields (for Critical or Urgent)
  const [reqPartId, setReqPartId] = useState<string>('');
  const [reqCustomPartName, setReqCustomPartName] = useState<string>('');
  const [reqQty, setReqQty] = useState<number>(2);
  const [reqCostOverride, setReqCostOverride] = useState<number>(0);
  const [reqMonthYear, setReqMonthYear] = useState<string>('October 2026');
  const [reqTargetLine, setReqTargetLine] = useState<string>('Line 02');
  const [reqTargetMachine, setReqTargetMachine] = useState<string>('MC-OVK-204');
  const [reqJustification, setReqJustification] = useState<string>('');

  // Multi-part list state (for Monthly Indent)
  const [indentItems, setIndentItems] = useState<RequisitionItem[]>([]);
  const [newIndentPartId, setNewIndentPartId] = useState<string>('');
  const [newIndentQty, setNewIndentQty] = useState<number>(50);

  // Centralized Indent & Requisition Dropdown Menu state
  const [isIndentMenuOpen, setIsIndentMenuOpen] = useState(false);
  const indentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (indentMenuRef.current && !indentMenuRef.current.contains(event.target as Node)) {
        setIsIndentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  useEffect(() => {
    const unsubParts = subscribeParts((data) => {
      setParts(data);
      if (data.length > 0) {
        if (!restockPartId) setRestockPartId(data[0].partId);
        if (!reqPartId) setReqPartId(data[0].partId);
        if (!newIndentPartId) setNewIndentPartId(data[0].partId);
      }
    });

    const unsubReqs = subscribeRequisitions((data) => {
      setRequisitions(data);
    });

    return () => {
      unsubParts();
      unsubReqs();
    };
  }, [restockPartId, reqPartId, newIndentPartId]);

  // Inventory stats
  const totalSkus = parts.length;
  const lowStockItems = useMemo(
    () => parts.filter((p) => p.stock <= p.minStock),
    [parts]
  );
  const totalValuation = useMemo(
    () => parts.reduce((acc, cur) => acc + cur.stock * cur.unitCost, 0),
    [parts]
  );

  // User-scoped requisitions:
  // For Senior Electrician, strictly filter to ONLY junior electricians and their indents
  const displayedRequisitions = useMemo(() => {
    if (role === 'SENIOR_ELECTRICIAN') {
      return requisitions.filter((r) => {
        const reqName = (r.requestedBy || '').trim().toLowerCase();
        const reqRole = (r.requestedByRole || '').trim().toLowerCase();
        // Matches junior electricians (Rajesh G., Karthik M., or non-senior electrician)
        return (
          reqName.includes('rajesh') ||
          reqName.includes('karthik') ||
          (reqRole.includes('electrician') && !reqRole.includes('senior') && !reqRole.includes('lead')) ||
          reqRole.includes('junior')
        );
      });
    }

    if (role === 'ELECTRICIAN') {
      const currentUserName = (user?.name || '').trim().toLowerCase();
      return requisitions.filter((r) => {
        const reqName = (r.requestedBy || '').trim().toLowerCase();
        if (currentUserName) {
          const userParts = currentUserName.split(' ').filter((p) => p.length > 2);
          const hasMatch = userParts.some((p) => reqName.includes(p));
          if (hasMatch || reqName.includes(currentUserName) || currentUserName.includes(reqName)) {
            return true;
          }
        }
        return reqName.includes('rajesh') || reqName.includes('karthik') || reqName.includes('electrician');
      });
    }

    if (role === 'MECHANIC' || role === 'SENIOR_MECHANIC') {
      const currentUserName = (user?.name || '').trim().toLowerCase();
      return requisitions.filter((r) => {
        const reqName = (r.requestedBy || '').trim().toLowerCase();
        if (currentUserName) {
          const userParts = currentUserName.split(' ').filter((p) => p.length > 2);
          const hasMatch = userParts.some((p) => reqName.includes(p));
          if (hasMatch || reqName.includes(currentUserName) || currentUserName.includes(reqName)) {
            return true;
          }
        }
        if (role === 'MECHANIC' && (reqName.includes('suresh') || reqName.includes('mechanic'))) return true;
        if (role === 'SENIOR_MECHANIC' && (reqName.includes('ramesh') || reqName.includes('senior') || reqName.includes('lead'))) return true;
        return false;
      });
    }
    return requisitions;
  }, [requisitions, role, user]);

  // Requisitions stats (scoped to displayed requisitions)
  const pendingCeoApprovals = useMemo(
    () => displayedRequisitions.filter((r) => r.status === 'PENDING_CEO_APPROVAL'),
    [displayedRequisitions]
  );
  const pendingManagerApprovals = useMemo(
    () => displayedRequisitions.filter((r) => r.status === 'PENDING_MANAGER_APPROVAL' || r.status === 'PENDING_REVIEW'),
    [displayedRequisitions]
  );
  const approvedRequisitions = useMemo(
    () => displayedRequisitions.filter((r) => r.status === 'APPROVED_BY_CEO' || r.status === 'APPROVED_BY_MANAGER'),
    [displayedRequisitions]
  );
  const totalReqValue = useMemo(
    () => displayedRequisitions.reduce((acc, r) => acc + (r.estimatedCost || 0), 0),
    [displayedRequisitions]
  );

  // Filtered parts table
  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      const isLow = p.stock <= p.minStock;
      if (lowStockOnly && !isLow) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCompat = p.compat.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCompat) return false;
      }
      return true;
    });
  }, [parts, lowStockOnly, categoryFilter, searchQuery]);

  // Filtered requisitions list (scoped to displayed requisitions)
  const filteredRequisitions = useMemo(() => {
    return displayedRequisitions.filter((r) => {
      if (reqFilter === 'CRITICAL') return r.type === 'CRITICAL_CEO';
      if (reqFilter === 'URGENT') return r.type === 'URGENT_NEED';
      if (reqFilter === 'MONTHLY') return r.type === 'MONTHLY_INDENT';
      if (reqFilter === 'PENDING')
        return (
          r.status === 'PENDING_CEO_APPROVAL' ||
          r.status === 'PENDING_MANAGER_APPROVAL' ||
          r.status === 'PENDING_REVIEW'
        );
      if (reqFilter === 'APPROVED')
        return r.status === 'APPROVED_BY_CEO' || r.status === 'APPROVED_BY_MANAGER';
      return true;
    });
  }, [displayedRequisitions, reqFilter]);

  const handleAdjust = async (part: SparePart, delta: number) => {
    if (part.stock + delta < 0) {
      showToast('Stock cannot fall below zero.', 'warning');
      return;
    }
    await adjustPartStock(part.partId, delta);
    showToast(`${part.sku} updated (${part.stock + delta} ${part.unit})`, 'info');
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockPartId || restockQty <= 0) return;
    const target = parts.find((p) => p.partId === restockPartId);
    if (!target) return;

    await restockPart(restockPartId, restockQty, restockPO);
    showToast(`Received ${restockQty} ${target.unit} for ${target.sku}!`, 'success');
    setIsRestockOpen(false);
    setRestockPO('');
  };

  const handleOpenReqModal = (mode: RequisitionType | 'VIEW_ALL' = 'MONTHLY_INDENT', initialPartId?: string) => {
    if (mode === 'VIEW_ALL') {
      setReqModalTab('VIEW_ALL');
      setIsReqModalOpen(true);
      return;
    }

    setReqModalTab(mode);
    setReqMode(mode);
    setReqJustification('');
    setReqCostOverride(0);

    if (initialPartId) {
      setReqPartId(initialPartId);
      setNewIndentPartId(initialPartId);
      const targetPart = parts.find((p) => p.partId === initialPartId);
      if (targetPart) {
        setReqCustomPartName(targetPart.name);
      }
    }

    if (mode === 'MONTHLY_INDENT') {
      if (initialPartId) {
        const targetPart = parts.find((p) => p.partId === initialPartId);
        if (targetPart && !indentItems.some((it) => it.partId === initialPartId)) {
          setIndentItems((prev) => [
            ...prev,
            {
              partId: targetPart.partId,
              partName: targetPart.name,
              sku: targetPart.sku,
              quantity: targetPart.minStock * 2 || 50,
              unit: targetPart.unit,
              unitCost: targetPart.unitCost,
              totalCost: Math.round((targetPart.minStock * 2 || 50) * targetPart.unitCost * 100) / 100,
            },
          ]);
        }
      }
    }
    setIsReqModalOpen(true);
  };

  // Add item to Monthly Indent list
  const handleAddIndentItem = () => {
    if (!newIndentPartId || newIndentQty <= 0) return;
    const targetPart = parts.find((p) => p.partId === newIndentPartId);
    if (!targetPart) return;

    // Check if already in list
    const existingIndex = indentItems.findIndex((i) => i.partId === newIndentPartId);
    if (existingIndex >= 0) {
      const updated = [...indentItems];
      const newTotalQty = updated[existingIndex].quantity + newIndentQty;
      updated[existingIndex].quantity = newTotalQty;
      updated[existingIndex].totalCost = Math.round(newTotalQty * targetPart.unitCost * 100) / 100;
      setIndentItems(updated);
    } else {
      const newItem: RequisitionItem = {
        partId: targetPart.partId,
        partName: targetPart.name,
        sku: targetPart.sku,
        quantity: newIndentQty,
        unit: targetPart.unit,
        unitCost: targetPart.unitCost,
        totalCost: Math.round(newIndentQty * targetPart.unitCost * 100) / 100,
      };
      setIndentItems([...indentItems, newItem]);
    }

    showToast(`Added ${newIndentQty} ${targetPart.unit} of ${targetPart.sku} to indent list`, 'info');
    setNewIndentQty(50);
  };

  const handleRemoveIndentItem = (partId: string) => {
    setIndentItems(indentItems.filter((i) => i.partId !== partId));
  };

  // Total calculated budget for monthly indent list
  const indentTotalCost = useMemo(() => {
    return indentItems.reduce((acc, cur) => acc + cur.totalCost, 0);
  }, [indentItems]);

  const handleRequisitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReq(true);

    try {
      if (reqMode === 'MONTHLY_INDENT') {
        if (indentItems.length === 0) {
          showToast('Please add at least one spare part to your monthly indent list.', 'warning');
          setIsSubmittingReq(false);
          return;
        }

        const reqId = await createRequisition({
          type: 'MONTHLY_INDENT',
          items: indentItems,
          itemCount: indentItems.length,
          estimatedCost: Math.round(indentTotalCost * 100) / 100,
          urgency: 'ROUTINE',
          requiresCeoApproval: false,
          requestedBy: user?.name || 'Ramesh Kumar',
          requestedByRole: user?.title || 'Lead Sewing Mechanic',
          monthYear: reqMonthYear,
          targetLine: reqTargetLine,
          justification:
            reqJustification.trim() ||
            `Monthly planned spare inventory indent for ${reqMonthYear} (${indentItems.length} line items).`,
          status: 'PENDING_REVIEW',
        });

        showToast(
          `Monthly indent #${reqId} submitted with ${indentItems.length} parts (Total: ₹${indentTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })})!`,
          'success'
        );
      } else if (reqMode === 'CRITICAL_CEO') {
        const selectedPart = parts.find((p) => p.partId === reqPartId);
        const partName = selectedPart ? selectedPart.name : reqCustomPartName.trim() || 'Custom Emergency Part';
        const sku = selectedPart ? selectedPart.sku : 'CUST-CRITICAL';
        const unit = selectedPart ? selectedPart.unit : 'units';
        const unitCost = selectedPart ? selectedPart.unitCost : reqCostOverride || 100;
        const estimatedCost = reqCostOverride > 0 ? reqCostOverride : Math.round(unitCost * reqQty * 100) / 100;

        const reqId = await createRequisition({
          type: 'CRITICAL_CEO',
          partId: reqPartId || 'CUSTOM',
          partName,
          sku,
          quantity: reqQty,
          unit,
          itemCount: 1,
          estimatedCost,
          urgency: 'CRITICAL_CEO_APPROVAL',
          requiresCeoApproval: true,
          requestedBy: user?.name || 'Ramesh Kumar',
          requestedByRole: user?.title || 'Lead Sewing Mechanic',
          monthYear: reqMonthYear,
          targetLine: reqTargetLine,
          targetMachineId: reqTargetMachine,
          justification:
            reqJustification.trim() ||
            'CRITICAL LINE STOP: Emergency machine breakdown halting line. Immediate CEO permission required.',
          status: 'PENDING_CEO_APPROVAL',
        });

        showToast(
          `🚨 Critical requisition #${reqId} dispatched! Flagged for CEO Permission.`,
          'warning'
        );
      } else {
        // URGENT_NEED (Manager Fast-Track)
        const selectedPart = parts.find((p) => p.partId === reqPartId);
        const partName = selectedPart ? selectedPart.name : reqCustomPartName.trim() || 'Urgent Spare Part';
        const sku = selectedPart ? selectedPart.sku : 'CUST-URGENT';
        const unit = selectedPart ? selectedPart.unit : 'units';
        const unitCost = selectedPart ? selectedPart.unitCost : reqCostOverride || 40;
        const estimatedCost = reqCostOverride > 0 ? reqCostOverride : Math.round(unitCost * reqQty * 100) / 100;

        const reqId = await createRequisition({
          type: 'URGENT_NEED',
          partId: reqPartId || 'CUSTOM',
          partName,
          sku,
          quantity: reqQty,
          unit,
          itemCount: 1,
          estimatedCost,
          urgency: 'URGENT_MANAGER',
          requiresCeoApproval: false,
          requestedBy: user?.name || 'Ramesh Kumar',
          requestedByRole: user?.title || 'Lead Sewing Mechanic',
          monthYear: reqMonthYear,
          targetLine: reqTargetLine,
          targetMachineId: reqTargetMachine,
          justification:
            reqJustification.trim() ||
            'URGENT SHIFT NEED: High risk of quality defect or imminent stock-out during peak shift.',
          status: 'PENDING_MANAGER_APPROVAL',
        });

        showToast(
          `⚡ Urgent requisition #${reqId} submitted for Maintenance Manager fast-track approval!`,
          'info'
        );
      }

      setReqModalTab('VIEW_ALL');
      setIsReqModalOpen(true);
    } catch (err) {
      showToast('Failed to submit requisition', 'error');
      console.error(err);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleApprove = async (req: PartRequisition) => {
    const isCritical = req.type === 'CRITICAL_CEO' || req.urgency === 'CRITICAL_CEO_APPROVAL' || req.requiresCeoApproval;

    if (isCritical && !isAuthorizedToApproveCritical) {
      showToast('Access Denied: Only authorized executives (CEO / Plant Admin) can approve critical tool requisitions.', 'error');
      return;
    }

    if (!isCritical && !isAuthorizedToApproveGeneral) {
      showToast('Access Denied: Mechanics cannot approve requisitions. Awaiting authorized store or admin approval.', 'error');
      return;
    }

    try {
      if (isCritical) {
        const approver = role === 'CEO'
          ? `${user?.name || 'Dr. K. Ramanathan'} (CEO)`
          : `${user?.name || 'V. Sundaram'} (Plant Admin)`;
        await approveRequisition(
          req.id,
          approver,
          'CEO / Executive emergency sanction granted for line restoration.',
          'APPROVED_BY_CEO'
        );
        showToast(`Critical Requisition #${req.id} authorized by ${approver}!`, 'success');
      } else {
        const approver = user?.name ? `${user.name} (${user.title})` : 'Store In-Charge';
        await approveRequisition(
          req.id,
          approver,
          'Approved within operational quota and maintenance allocation.',
          'APPROVED_BY_MANAGER'
        );
        showToast(`Requisition #${req.id} approved by ${approver}!`, 'success');
      }
    } catch (err) {
      showToast('Failed to approve requisition', 'error');
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    const targetReq = requisitions.find((r) => r.id === id);
    const isCritical = targetReq?.type === 'CRITICAL_CEO' || targetReq?.urgency === 'CRITICAL_CEO_APPROVAL' || targetReq?.requiresCeoApproval;

    if (isCritical && !isAuthorizedToApproveCritical) {
      showToast('Access Denied: Only authorized executives can reject critical requisitions.', 'error');
      return;
    }
    if (!isCritical && !isAuthorizedToApproveGeneral) {
      showToast('Access Denied: Mechanics cannot reject requisitions.', 'error');
      return;
    }

    try {
      await rejectRequisition(
        id,
        user?.name ? `${user.name} (${user.title})` : 'Authorized Approver',
        'Deferred or rejected by authorized management.'
      );
      showToast(`Requisition #${id} marked as rejected.`, 'info');
    } catch (err) {
      showToast('Failed to reject requisition', 'error');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <span>Sewing Spare Parts, Monthly Indents & Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crib stock levels, mechanic monthly planned indents (part list), and distinct critical (CEO) vs urgent (Manager) needs.
          </p>
        </div>

        {/* Action Buttons: Critical vs Urgent vs Monthly Indent */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Centralized Action: Monthly Indents, Critical Parts, and Urgent Needs under a Specific Button */}
          {isMechanicOrAdmin && (
            <div className="relative" ref={indentMenuRef}>
              <button
                type="button"
                onClick={() => setIsIndentMenuOpen(!isIndentMenuOpen)}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                title="Centralized Indents & Requisitions: Monthly Indents, Critical Parts (CEO), and Urgent Needs (Manager)"
              >
                <ListPlus className="w-4 h-4 text-white" />
                <span>Central Indents &amp; Requisitions</span>
                {pendingCeoApprovals.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-extrabold urgent-pulse">
                    {pendingCeoApprovals.length} CEO
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isIndentMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Centralized Dropdown Menu */}
              {isIndentMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Centralized Indent Desk
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Select Indent or Requisition Track:
                    </span>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {/* 1. Monthly Indent (Part List) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndentMenuOpen(false);
                        handleOpenReqModal('MONTHLY_INDENT');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <ListPlus className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                            📦 Monthly Indents
                          </span>
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                            Multi-Part List
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Planned store replenishment list for upcoming production month.
                        </p>
                      </div>
                    </button>

                    {/* 2. Critical Need (CEO Approval) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndentMenuOpen(false);
                        handleOpenReqModal('CRITICAL_CEO');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-rose-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-600 group-hover:text-white transition">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                            🚨 Critical Parts
                          </span>
                          <span className="text-[9px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded urgent-pulse">
                            CEO Sanction
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Emergency line stoppage breakdown sanction &amp; budget override.
                        </p>
                      </div>
                    </button>

                    {/* 3. Urgent Need (Manager Fast-Track) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndentMenuOpen(false);
                        handleOpenReqModal('URGENT_NEED');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50/70 transition flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                            ⚡ Urgent Needs
                          </span>
                          <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            Manager Fast-Track
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          High risk shift defect prevention &amp; rapid floor procurement.
                        </p>
                      </div>
                    </button>

                    {/* 4. Active Requisitions & Approvals */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndentMenuOpen(false);
                        handleOpenReqModal('VIEW_ALL');
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition flex items-start gap-2.5 group cursor-pointer border-t border-slate-100"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                            📋 Requisitions &amp; Approvals
                          </span>
                          {pendingCeoApprovals.length > 0 ? (
                            <span className="text-[9px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded urgent-pulse">
                              {pendingCeoApprovals.length} CEO Needed
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {requisitions.length} Items
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Audit, sanction pending indents, and inspect track history.
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2 pb-1 px-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Centralized Requisition Engine</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndentMenuOpen(false);
                        handleOpenReqModal('VIEW_ALL');
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Open Full Hub ➜
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Store Person & Admin Action: Restock Intake */}
          {isStorePersonOrAdmin && (
            <button
              onClick={() => setIsRestockOpen(true)}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PackageOpen className="w-4 h-4 text-emerald-600" />
              <span>Restock Tool Crib</span>
            </button>
          )}

          {/* CEO View Indicator */}
          {role === 'CEO' && (
            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              👑 Executive Inventory & Valuation Audit
            </span>
          )}
        </div>
      </div>

      {/* INVENTORY CATALOG & CRIB STOCK */}
      <div className="space-y-6 animate-in fade-in duration-150">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Catalog Items
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalSkus}</div>
              <div className="text-[11px] text-emerald-600 font-medium">
                Categorized for 7 Machine Types
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Low Stock Warnings
              </div>
              <div className="text-2xl font-extrabold text-rose-600 font-mono">
                {lowStockItems.length} Items
              </div>
              <div className="text-[11px] text-rose-600 font-medium">
                Below safe buffer threshold
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pending Approvals
              </div>
              <div className="text-2xl font-extrabold text-amber-600 font-mono">
                {pendingCeoApprovals.length + pendingManagerApprovals.length}
              </div>
              <div className="text-[11px] text-slate-500">
                {pendingCeoApprovals.length} CEO • {pendingManagerApprovals.length} Manager
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Inventory Value
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                ₹{Math.round(totalValuation).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500">Tool crib stock valuation</div>
            </div>
          </div>

          {/* MECHANIC & ELECTRICIAN TOOL CUSTODY SECTION */}
          {role !== 'MECHANIC' && role !== 'ELECTRICIAN' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {role === 'SENIOR_ELECTRICIAN' ? (
                      <Zap className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <Wrench className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>
                      {role === 'SENIOR_ELECTRICIAN'
                        ? 'Junior Electricians Tool Custody'
                        : 'Mechanic Tool Custody'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {role === 'SENIOR_ELECTRICIAN'
                      ? 'Click any junior electrician below to see the calibration tools and electrical components in their custody.'
                      : 'Click any mechanic below to see the tools and spare parts they are currently handling.'}
                  </p>
                </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {visibleMechanics.length} {role === 'SENIOR_ELECTRICIAN' ? 'Junior Electricians' : 'Technicians On Duty'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullPartsTable(!showFullPartsTable)}
                  className="text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                >
                  {showFullPartsTable ? 'Hide Stock Catalog' : 'View Stock Catalog'}
                </button>
              </div>
            </div>

            {/* Mechanic Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {visibleMechanics.map((mech) => {
                const isSelected = mech.id === activeMechanicId;
                const specialToolsCount = mech.checkedOutTools?.length || 0;
                const drawnSparesCount = mech.activePartsDrawn?.reduce((acc, p) => acc + p.quantity, 0) || 0;

                return (
                  <button
                    key={mech.id}
                    type="button"
                    onClick={() => {
                      setActiveMechanicId(mech.id);
                    }}
                    className={`text-left p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${mech.avatarColor}`}
                      >
                        {mech.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {mech.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {mech.id}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] bg-white/80 p-2 rounded-xl border border-slate-200/70 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">Tools:</span>
                        <span className="font-bold text-amber-700 font-mono">
                          {specialToolsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">Drawn:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {drawnSparesCount} pcs
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-indigo-600 font-bold flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>{isSelected ? '✓ Active Table' : 'Click to View'}</span>
                      <span>➜</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* DYNAMIC ITEM TABLE FOR SELECTED MECHANIC */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${currentMechanicData.avatarColor}`}>
                    {currentMechanicData.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {currentMechanicData.name} &mdash; Handled Tools &amp; Parts Register
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {currentMechanicData.role} • Shift: {currentMechanicData.shift} • {currentMechanicData.assignedLines}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenMechanicCustody(currentMechanicData)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Full Custody Dossier</span>
                </button>
              </div>

              {/* Table 1: Checked-Out Tools */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>1. Checked-Out Special Tools ({currentMechanicData.checkedOutTools?.length || 0}):</span>
                  <span className="text-[11px] font-normal text-slate-500">From Tool Crib</span>
                </div>

                {(!currentMechanicData.checkedOutTools || currentMechanicData.checkedOutTools.length === 0) ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                    No specialized calibration tools currently logged out.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Tool Name</th>
                            <th className="py-2.5 px-3">Tool ID &amp; S/N</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Location</th>
                            <th className="py-2.5 px-3">Return Due</th>
                            <th className="py-2.5 px-3">Condition</th>
                            <th className="py-2.5 px-3">Purpose</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {currentMechanicData.checkedOutTools.map((tool) => (
                            <tr key={tool.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{tool.toolName}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                <span className="font-bold text-indigo-700">{tool.id}</span>
                                <span className="text-slate-400 block">S/N: {tool.serialNo}</span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                {tool.category.replace('_', ' ')}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-700 font-medium">{tool.location}</td>
                              <td className="py-2.5 px-3 font-mono text-amber-700 font-semibold text-[11px]">{tool.returnDue}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {tool.condition.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={tool.purpose}>
                                {tool.purpose}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Table 2: Active Drawn Spare Parts */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>2. Spare Parts in Active Hand ({currentMechanicData.activePartsDrawn?.length || 0}):</span>
                  <span className="text-[11px] font-normal text-slate-500">Drawn for Active Machine Repairs</span>
                </div>

                {(!currentMechanicData.activePartsDrawn || currentMechanicData.activePartsDrawn.length === 0) ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                    No spare parts currently drawn from crib.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Part Description</th>
                            <th className="py-2.5 px-3">Part SKU</th>
                            <th className="py-2.5 px-3">Quantity</th>
                            <th className="py-2.5 px-3">Target Machine</th>
                            <th className="py-2.5 px-3">Floor Line</th>
                            <th className="py-2.5 px-3">Drawn At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {currentMechanicData.activePartsDrawn.map((part, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{part.partName}</td>
                              <td className="py-2.5 px-3 font-mono text-indigo-700 text-[11px] font-bold">{part.sku}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {part.quantity} {part.unit}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{part.forMachineId}</td>
                              <td className="py-2.5 px-3 text-emerald-700 font-medium">{part.line}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{part.drawnAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* CRIB STOCK CATALOG (Always shown for line mechanics who do not have tool custody, or when toggled) */}
          {(showFullPartsTable || role === 'MECHANIC') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-in fade-in duration-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>Tool Crib &amp; Spare Parts Catalog</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time bin quantities, catalog pricing (₹), and SKU details for monthly indents.
                  </p>
                </div>
                {role !== 'MECHANIC' && (
                  <button
                    type="button"
                    onClick={() => setShowFullPartsTable(false)}
                    className="text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer self-start sm:self-auto"
                  >
                    Hide Catalog
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search spare parts..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 outline-none font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Needles">Needles &amp; Pins</option>
                    <option value="Hooks & Loopers">Rotary Hooks &amp; Loopers</option>
                    <option value="Feed & Plates">Feed Dogs &amp; Plates</option>
                    <option value="Motors & Electrical">Electronics &amp; Motors</option>
                    <option value="Fluids & Consumables">Fluids &amp; Consumables</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Part SKU</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Stock on Hand</th>
                      <th className="py-2.5 px-3">Min Safe Stock</th>
                      <th className="py-2.5 px-3">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Quick Adjust</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredParts.map((part) => (
                      <tr key={part.partId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{part.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{part.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {part.stock} {part.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{part.minStock} {part.unit}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">₹{part.unitCost}</td>
                        <td className="py-2.5 px-3 text-right space-x-1">
                          <button
                            onClick={() => handleAdjust(part, -1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold inline-flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleAdjust(part, 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold inline-flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* MODAL 1: RAISE SPARE NEED / MONTHLY INDENT MODAL */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col ${reqModalTab === 'VIEW_ALL' ? 'max-w-4xl' : 'max-w-2xl'}`}>
            {/* Modal Header with Mode Switcher */}
            <div
              className={`p-5 text-white flex items-center justify-between shrink-0 ${
                reqModalTab === 'CRITICAL_CEO'
                  ? 'bg-rose-950'
                  : reqModalTab === 'URGENT_NEED'
                  ? 'bg-amber-950'
                  : reqModalTab === 'VIEW_ALL'
                  ? 'bg-slate-900'
                  : 'bg-indigo-950'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                    reqModalTab === 'CRITICAL_CEO'
                      ? 'bg-rose-600 urgent-pulse'
                      : reqModalTab === 'URGENT_NEED'
                      ? 'bg-amber-500'
                      : reqModalTab === 'VIEW_ALL'
                      ? 'bg-indigo-600'
                      : 'bg-indigo-600'
                  }`}
                >
                  {reqModalTab === 'CRITICAL_CEO' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : reqModalTab === 'URGENT_NEED' ? (
                    <Zap className="w-5 h-5 text-amber-950" />
                  ) : reqModalTab === 'VIEW_ALL' ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : (
                    <ListPlus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">
                    {reqModalTab === 'CRITICAL_CEO'
                      ? 'Critical Spare Need (CEO Permission Required)'
                      : reqModalTab === 'URGENT_NEED'
                      ? 'Urgent Spare Need (Manager Fast-Track)'
                      : reqModalTab === 'VIEW_ALL'
                      ? 'Centralized Requisitions & Approvals Desk'
                      : 'Monthly Spare Inventory Indent (List of Parts)'}
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    {reqModalTab === 'CRITICAL_CEO'
                      ? 'Emergency machine downtime & budget override'
                      : reqModalTab === 'URGENT_NEED'
                      ? 'Urgent shift operational requirement for defect prevention'
                      : reqModalTab === 'VIEW_ALL'
                      ? 'Review active indents, manager approvals, and CEO emergency sanctions'
                      : 'Mechanic planned itemized requirement for upcoming production month'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReqModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold bg-slate-50 shrink-0 overflow-x-auto">
              {/* Tab 1: Monthly Indent (Part List) */}
              <button
                type="button"
                onClick={() => {
                  setReqModalTab('MONTHLY_INDENT');
                  setReqMode('MONTHLY_INDENT');
                }}
                className={`flex-1 min-w-[130px] py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  reqModalTab === 'MONTHLY_INDENT'
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>1. Monthly Indent</span>
              </button>

              {/* Tab 2: Urgent Need (Manager) */}
              <button
                type="button"
                onClick={() => {
                  setReqModalTab('URGENT_NEED');
                  setReqMode('URGENT_NEED');
                }}
                className={`flex-1 min-w-[130px] py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  reqModalTab === 'URGENT_NEED'
                    ? 'border-amber-500 text-amber-800 bg-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>2. ⚡ Urgent Need</span>
              </button>

              {/* Tab 3: Critical Need (CEO) */}
              <button
                type="button"
                onClick={() => {
                  setReqModalTab('CRITICAL_CEO');
                  setReqMode('CRITICAL_CEO');
                }}
                className={`flex-1 min-w-[130px] py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  reqModalTab === 'CRITICAL_CEO'
                    ? 'border-rose-600 text-rose-600 bg-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>3. 🚨 Critical (CEO)</span>
              </button>

              {/* Tab 4: All Requisitions & Approvals */}
              <button
                type="button"
                onClick={() => setReqModalTab('VIEW_ALL')}
                className={`flex-1 min-w-[150px] py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  reqModalTab === 'VIEW_ALL'
                    ? 'border-indigo-600 text-indigo-600 bg-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>4. 📋 All Requisitions ({requisitions.length})</span>
                {pendingCeoApprovals.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-600 text-white font-extrabold urgent-pulse">
                    {pendingCeoApprovals.length} CEO
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body: Either View All Requisitions Desk OR Indent Request Form */}
            {reqModalTab === 'VIEW_ALL' ? (
              <div className="p-6 space-y-6 overflow-y-auto flex-grow max-h-[calc(90vh-140px)]">
                {/* Requisition KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Requisitions
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">{requisitions.length}</div>
              <div className="text-[11px] text-slate-500">Critical + Urgent + Monthly lists</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm space-y-1 bg-rose-50/40">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Critical (CEO Needed)</span>
              </div>
              <div className="text-2xl font-extrabold text-rose-600 font-mono urgent-pulse">
                {pendingCeoApprovals.length} Urgent
              </div>
              <div className="text-[11px] text-rose-700 font-medium">Requires CEO emergency sign-off</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-1 bg-amber-50/30">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Urgent Needs (Manager)</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-700 font-mono">
                {pendingManagerApprovals.length} Pending
              </div>
              <div className="text-[11px] text-amber-800 font-medium">Fast-track maintenance review</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Sanctioned Value
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                ₹{Math.round(totalReqValue).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">
                {approvedRequisitions.length} Approved orders
              </div>
            </div>
          </div>

          {/* Filter Bar with separated Critical, Urgent, and Monthly List */}
          {role === 'SENIOR_ELECTRICIAN' ? (
            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-cyan-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse shrink-0" />
                <span className="font-bold">Junior Electrician Indents Filter:</span>
                <span>Showing only requisitions and monthly indents raised by Junior Electricians.</span>
              </div>
              <span className="font-mono font-bold bg-white px-2.5 py-0.5 rounded-lg border border-cyan-200 text-cyan-700 shrink-0 self-start sm:self-auto">
                {displayedRequisitions.length} Indent{displayedRequisitions.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : (role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN') ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                <span className="font-bold">Personal Indents Filter:</span>
                <span>Showing only requisitions and monthly indents raised by {user?.name || (role === 'SENIOR_MECHANIC' ? 'Ramesh Kumar' : role === 'MECHANIC' ? 'Suresh Babu' : 'Staff')}.</span>
              </div>
              <span className="font-mono font-bold bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 text-indigo-700 shrink-0 self-start sm:self-auto">
                {displayedRequisitions.length} Indent{displayedRequisitions.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : null}

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setReqFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  reqFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {role === 'SENIOR_ELECTRICIAN'
                  ? 'Junior Electricians Indents'
                  : role === 'MECHANIC' || role === 'SENIOR_MECHANIC' || role === 'ELECTRICIAN'
                  ? 'My Indents'
                  : 'All Requests'}{' '}
                ({displayedRequisitions.length})
              </button>

              {/* Critical (CEO) */}
              <button
                onClick={() => setReqFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  reqFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>🚨 Critical (CEO)</span>
              </button>

              {/* Urgent Need (Manager) */}
              <button
                onClick={() => setReqFilter('URGENT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  reqFilter === 'URGENT'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Urgent Needs</span>
              </button>

              {/* Monthly Indents (Multi-Part List) */}
              <button
                onClick={() => setReqFilter('MONTHLY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  reqFilter === 'MONTHLY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>📦 Monthly Indents (Lists)</span>
              </button>

              <button
                onClick={() => setReqFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  reqFilter === 'PENDING'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Pending
              </button>

              <button
                onClick={() => setReqFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  reqFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Approved
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {isMechanicOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenReqModal('MONTHLY_INDENT')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Raise Indent / Requisition</span>
                </button>
              )}
              <div className="text-xs text-slate-500 font-medium hidden md:block">
                Signed in as: <span className="font-bold text-slate-800">{user?.title || 'Lead Mechanic'}</span>
              </div>
            </div>
          </div>

          {/* Requisitions List Cards */}
          <div className="space-y-4">
            {filteredRequisitions.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Requisitions Found</h4>
                <p className="text-xs text-slate-500">
                  Try adjusting your filter or raise a new monthly indent / critical request.
                </p>
              </div>
            ) : (
              filteredRequisitions.map((req) => {
                const isCritical = req.type === 'CRITICAL_CEO';
                const isUrgent = req.type === 'URGENT_NEED';
                const isMonthly = req.type === 'MONTHLY_INDENT';

                const isPendingCeo = req.status === 'PENDING_CEO_APPROVAL';
                const isPendingManager =
                  req.status === 'PENDING_MANAGER_APPROVAL' || req.status === 'PENDING_REVIEW';
                const isApproved =
                  req.status === 'APPROVED_BY_CEO' || req.status === 'APPROVED_BY_MANAGER';
                const isRejected = req.status === 'REJECTED';

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm space-y-4 transition ${
                      isPendingCeo
                        ? 'border-rose-300 ring-2 ring-rose-200/70 bg-rose-50/20'
                        : isPendingManager
                        ? 'border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/10'
                        : isApproved
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">{req.id}</span>

                        {/* Distinct Badges for Critical vs Urgent vs Monthly */}
                        {isCritical ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 urgent-pulse">
                            <ShieldAlert className="w-3 h-3" />
                            <span>🚨 CRITICAL NEED • REQUIRES CEO PERMISSION</span>
                          </span>
                        ) : isUrgent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>⚡ URGENT NEED • MANAGER APPROVAL</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                            <ListPlus className="w-3 h-3 text-indigo-600" />
                            <span>📦 MONTHLY PLANNED INDENT (ITEMIZED LIST)</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-medium">
                          Period: <span className="font-semibold text-slate-700">{req.monthYear}</span>
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPendingCeo && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-600" />
                            <span>Awaiting CEO Permission</span>
                          </span>
                        )}
                        {isPendingManager && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Awaiting Manager Approval</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {req.status === 'APPROVED_BY_CEO' ? 'CEO Sanctioned' : 'Manager Approved'}
                            </span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700">
                            Rejected / Deferred
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body Grid */}
                    {isMonthly && req.items && req.items.length > 0 ? (
                      /* MULTI-ITEM MONTHLY INDENT DISPLAY */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            Indented Parts List ({req.items.length} Distinct Items):
                          </span>
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            Total Est. Budget: ₹{req.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Itemized Table of parts */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="py-2 px-3">Part Description</th>
                                <th className="py-2 px-3">SKU</th>
                                <th className="py-2 px-3">Quantity</th>
                                <th className="py-2 px-3">Unit Cost (₹)</th>
                                <th className="py-2 px-3 text-right">Subtotal (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {req.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    {item.partName}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-500">{item.sku}</td>
                                  <td className="py-2 px-3 font-bold text-slate-900">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-600">
                                    ₹{item.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800 text-right">
                                    ₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center text-slate-600">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span><b>Target Lines:</b> {req.targetLine || 'Universal Plant'} • <b>Raised by:</b></span>
                            <button
                              type="button"
                              onClick={() => handleOpenMechanicCustody(req.requestedBy)}
                              className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition"
                              title="Click to view tools and parts handled by this mechanic"
                            >
                              <Wrench className="w-3 h-3 text-indigo-600" />
                              <span>{req.requestedBy}</span>
                            </button>
                            <span className="text-slate-500">({req.requestedByRole})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 italic max-w-md truncate">
                            {req.justification}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* SINGLE-ITEM (CRITICAL OR URGENT) DISPLAY */
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        {/* Left: Part Details */}
                        <div className="md:col-span-5 space-y-1.5">
                          <div className="font-extrabold text-sm text-slate-900">{req.partName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            SKU: <span className="text-indigo-700 font-bold">{req.sku}</span>
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <span className="font-bold text-slate-800 text-sm">
                              {req.quantity} {req.unit}
                            </span>
                            <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Est. ₹{req.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Justification & Line Impact */}
                        <div className="md:col-span-7 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Target Line:{' '}
                              <span className="font-bold text-slate-800">
                                {req.targetLine || 'Universal Plant'}
                              </span>
                              {req.targetMachineId && (
                                <span className="text-rose-600 font-mono font-bold ml-1">
                                  [M/C: {req.targetMachineId}]
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <span>Raised by:</span>
                              <button
                                type="button"
                                onClick={() => handleOpenMechanicCustody(req.requestedBy)}
                                className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition"
                                title="Click to view tools and parts handled by this mechanic"
                              >
                                <Wrench className="w-3 h-3 text-indigo-600" />
                                <span>{req.requestedBy}</span>
                              </button>
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed font-medium">
                            {req.justification}
                          </p>
                          {req.reviewedBy && (
                            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                              <span>
                                <b>Reviewed by:</b> {req.reviewedBy}
                              </span>
                              <span>{req.reviewNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Card Footer Actions */}
                    {(isPendingCeo || isPendingManager) && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          {isCritical ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          ) : isUrgent ? (
                            <Zap className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>
                            {isCritical
                              ? '🚨 High-risk line stop: Requires CEO / Plant Head digital permission.'
                              : isUrgent
                              ? '⚡ Fast-track shift requirement: Requires Maintenance Manager sign-off.'
                              : '📦 Monthly indent: Awaiting manager quota authorization.'}
                          </span>
                        </div>

                        {/* Authorization Check: Only authorized personnel can approve */}
                        {isCritical ? (
                          isAuthorizedToApproveCritical ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReject(req.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer urgent-pulse"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Authorize as CEO / Plant Head</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                                <span>Approval Restricted: Awaiting Authorized Person (CEO / Plant Admin)</span>
                              </span>
                            </div>
                          )
                        ) : (
                          isAuthorizedToApproveGeneral ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleReject(req.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Approve Requisition</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Approval Restricted: Awaiting Store In-Charge / Admin</span>
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReqModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Close Desk
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequisitionSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow max-h-[calc(90vh-140px)]">
              {/* MODE 1: MONTHLY INDENT (LIST OF PARTS) */}
              {reqMode === 'MONTHLY_INDENT' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Indented Production Month *
                      </label>
                      <select
                        value={reqMonthYear}
                        onChange={(e) => setReqMonthYear(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                      >
                        <option value="October 2026">October 2026</option>
                        <option value="November 2026">November 2026</option>
                        <option value="December 2026">December 2026</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Target Production Lines *
                      </label>
                      <select
                        value={reqTargetLine}
                        onChange={(e) => setReqTargetLine(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium"
                      >
                        <option value="Universal Plant">Universal Plant (All Lines)</option>
                        <option value="Line 01 & Line 02">Line 01 & Line 02 (Knit Lines)</option>
                        <option value="Line 03 & Line 04">Line 03 & Line 04 (Woven & Denim)</option>
                        <option value="Workshop Buffer Bay">Workshop Buffer Bay</option>
                      </select>
                    </div>
                  </div>

                  {/* DYNAMIC LIST BUILDER: Add Part Row */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
                    <span className="text-xs font-bold text-indigo-950 block">
                      + Add Spare Part to Monthly List:
                    </span>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <select
                          value={newIndentPartId}
                          onChange={(e) => setNewIndentPartId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800"
                        >
                          {parts.map((p) => (
                            <option key={p.partId} value={p.partId}>
                              {p.name} ({p.sku}) — ₹{p.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/{p.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={newIndentQty}
                          onChange={(e) => setNewIndentQty(parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={handleAddIndentItem}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of Indented Parts Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-slate-100 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex justify-between">
                      <span>Itemized Indent List ({indentItems.length} Parts)</span>
                      <span>Subtotal (₹)</span>
                    </div>

                    {indentItems.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No parts added to this monthly indent yet. Select a part above and click "+ Add".
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {indentItems.map((item) => (
                          <div
                            key={item.partId}
                            className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="font-bold text-slate-900 truncate">{item.partName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {item.sku} • {item.quantity} {item.unit} @ ₹{item.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold font-mono text-slate-800">
                                ₹{item.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveIndentItem(item.partId)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
                      <span className="text-slate-700">Total Monthly Indent Budget:</span>
                      <span className="font-mono text-base text-emerald-700">
                        ₹{indentTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Monthly Production Target & Justification Notes *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={reqJustification}
                      onChange={(e) => setReqJustification(e.target.value)}
                      placeholder="e.g. Planned requirement for upcoming 50,000 unit woven shirt order on Line 01 and Line 03."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* MODE 2: URGENT NEED (FAST-TRACK MANAGER APPROVAL) */}
              {reqMode === 'URGENT_NEED' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>⚡ Fast-Track Shift Need (Maintenance Manager Approval)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      High priority operational part needed during the active shift to prevent seam defects or imminent machine stoppage. Fast-tracked for immediate supervisor authorization.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Affected Floor Line *
                      </label>
                      <select
                        value={reqTargetLine}
                        onChange={(e) => setReqTargetLine(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 font-medium"
                      >
                        <option value="Line 01">Line 01 (Polo / Knit)</option>
                        <option value="Line 02">Line 02 (T-Shirts Basic)</option>
                        <option value="Line 03">Line 03 (Woven Shirts)</option>
                        <option value="Line 04">Line 04 (Denim Heavy)</option>
                        <option value="Buffer Workshop">Buffer Workshop</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Target Machine ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={reqTargetMachine}
                        onChange={(e) => setReqTargetMachine(e.target.value)}
                        placeholder="e.g. MC-OVK-204"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Select Urgent Catalog Part *
                    </label>
                    <select
                      value={reqPartId}
                      onChange={(e) => setReqPartId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 font-semibold"
                    >
                      {parts.map((p) => (
                        <option key={p.partId} value={p.partId}>
                          {p.name} ({p.sku}) — Stock: {p.stock} {p.unit} (₹{p.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/unit)
                        </option>
                      ))}
                      <option value="CUSTOM">Custom Urgent Spare</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Required Quantity *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={reqQty}
                        onChange={(e) => setReqQty(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Estimated Cost (₹ INR)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={reqCostOverride}
                        onChange={(e) => setReqCostOverride(parseFloat(e.target.value) || 0)}
                        placeholder="Auto or override"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Urgent Justification & Reason *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={reqJustification}
                      onChange={(e) => setReqJustification(e.target.value)}
                      placeholder="e.g. Frequent needle-looper clash causing puckering on active shift. Fast-track approval needed to prevent seam rejects."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: CRITICAL NEED (REQUIRES CEO PERMISSION) */}
              {reqMode === 'CRITICAL_CEO' && (
                <div className="space-y-4">
                  <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>🚨 CRITICAL LINE STOPPAGE (CEO Authorization Required)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-900">
                      Reserved for major breakdown emergencies, motor driver failure, or budget exceptions halting sewing output. Enters directly into the executive CEO permission ledger.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Halted Machine Asset ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={reqTargetMachine}
                        onChange={(e) => setReqTargetMachine(e.target.value)}
                        placeholder="e.g. MC-OVK-204"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Halted Line Location *
                      </label>
                      <select
                        value={reqTargetLine}
                        onChange={(e) => setReqTargetLine(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 font-bold"
                      >
                        <option value="Line 01">Line 01 (Polo / Knit)</option>
                        <option value="Line 02">Line 02 (T-Shirts Basic)</option>
                        <option value="Line 03">Line 03 (Woven Shirts)</option>
                        <option value="Line 04">Line 04 (Denim Heavy)</option>
                        <option value="Buffer Workshop">Buffer Workshop</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Select Component or Part *
                    </label>
                    <select
                      value={reqPartId}
                      onChange={(e) => setReqPartId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 font-semibold"
                    >
                      {parts.map((p) => (
                        <option key={p.partId} value={p.partId}>
                          {p.name} ({p.sku}) — ₹{p.unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/{p.unit}
                        </option>
                      ))}
                      <option value="CUSTOM">Custom Burnt Component / Emergency Part</option>
                    </select>
                  </div>

                  {reqPartId === 'CUSTOM' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Component Description & Part Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={reqCustomPartName}
                        onChange={(e) => setReqCustomPartName(e.target.value)}
                        placeholder="e.g. Servo Main PCB Circuit Assembly Board"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Quantity Needed *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={reqQty}
                        onChange={(e) => setReqQty(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Total Emergency Expenditure (₹ INR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={reqCostOverride}
                        onChange={(e) => setReqCostOverride(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 220"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Emergency Justification & Production Line Halt Details *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={reqJustification}
                      onChange={(e) => setReqJustification(e.target.value)}
                      placeholder="e.g. Controller circuit burnt out during voltage spike. Entire 4-thread line stopped. Zero backup in tool crib. Immediate CEO permission needed for emergency courier procurement."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Modal Submit Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    reqMode === 'CRITICAL_CEO'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 urgent-pulse'
                      : reqMode === 'URGENT_NEED'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {reqMode === 'CRITICAL_CEO'
                      ? 'Dispatch for CEO Permission'
                      : reqMode === 'URGENT_NEED'
                      ? 'Submit Urgent Need (Manager)'
                      : `Submit Monthly Indent (${indentItems.length} Parts)`}
                  </span>
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      )}

      {/* MODAL 2: RESTOCK INTAKE MODAL */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Receive / Restock Spare Parts</h4>
                  <p className="text-[10px] text-slate-400">Inventory Tool Crib Intake</p>
                </div>
              </div>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Item to Restock *
                </label>
                <select
                  value={restockPartId}
                  onChange={(e) => setRestockPartId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                >
                  {parts.map((p) => (
                    <option key={p.partId} value={p.partId}>
                      {p.name} ({p.sku}) — Stock: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Quantity Received *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supplier PO / Invoice Reference
                </label>
                <input
                  type="text"
                  value={restockPO}
                  onChange={(e) => setRestockPO(e.target.value)}
                  placeholder="e.g. PO-TEX-2026-89"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  Confirm Stock Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mechanic Handled Tools & Crib Custody Modal */}
      <MechanicCustodyModal
        mechanic={selectedMechanic}
        isOpen={isMechCustodyOpen}
        onClose={() => setIsMechCustodyOpen(false)}
      />
    </div>
  );
}
