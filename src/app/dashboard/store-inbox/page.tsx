'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  CheckCircle2,
  Truck,
  ArrowRight,
  ClipboardList,
  Boxes,
  User,
  Calendar,
  AlertCircle,
  FileText,
  BadgeCheck,
  Search,
  Plus,
  ArrowUpRight,
  Sparkles,
  MapPin,
  RefreshCw,
  Trash2,
  X,
  IndianRupee,
  Layers,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PartRequisition, SparePart, RequisitionItem } from '@/types/cmms';
import {
  subscribeRequisitions,
  subscribeParts,
  fulfillMonthlyIndent,
  createRequisition,
} from '@/lib/services/cmmsService';

interface DraftIndentItem {
  id: string;
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

function StoreInboxContent() {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [requisitions, setRequisitions] = useState<PartRequisition[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [filter, setFilter] = useState<'PENDING_RECEIPT' | 'FULFILLED' | 'ALL'>('PENDING_RECEIPT');
  const [activeModalReq, setActiveModalReq] = useState<PartRequisition | null>(null);
  const [modalAction, setModalAction] = useState<'RECEIVE' | 'DISPATCH'>('RECEIVE');
  const [notes, setNotes] = useState('');
  const [challanNo, setChallanNo] = useState('');

  // Create New Indent Modal State
  const [isNewIndentModalOpen, setIsNewIndentModalOpen] = useState(false);
  const [indentMonth, setIndentMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );
  const [indentLine, setIndentLine] = useState('Line 01 & Line 02');
  const [indentJustification, setIndentJustification] = useState(
    'Monthly spare parts quota allocation and line buffer inventory.'
  );
  const [indentItems, setIndentItems] = useState<DraftIndentItem[]>([
    {
      id: 'item-1',
      partId: '',
      partName: '',
      sku: '',
      quantity: 10,
      unit: 'pcs',
      unitCost: 0,
    },
  ]);

  const isStorePerson = role === 'STORE_PERSON';

  // Check URL query to auto-open new indent modal
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsNewIndentModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubReqs = subscribeRequisitions((reqs) => {
      // Filter strictly for monthly indents assigned to the store person
      const storeMonthlyIndents = reqs.filter((r) => r.type === 'MONTHLY_INDENT');
      setRequisitions(storeMonthlyIndents);
    });

    const unsubParts = subscribeParts((allParts) => {
      setParts(allParts);
    });

    return () => {
      unsubReqs();
      unsubParts();
    };
  }, []);

  const pendingIndents = requisitions.filter(
    (r) => r.status !== 'FULFILLED' && r.status !== 'REJECTED'
  );
  const fulfilledIndents = requisitions.filter((r) => r.status === 'FULFILLED');

  const openActionModal = (req: PartRequisition, action: 'RECEIVE' | 'DISPATCH') => {
    setActiveModalReq(req);
    setModalAction(action);
    setChallanNo(action === 'RECEIVE' ? `DC-${Math.floor(100000 + Math.random() * 900000)}` : '');
    setNotes(
      action === 'RECEIVE'
        ? 'Verified physical box seal & QC pass certificate. Batch loaded into tool crib bins.'
        : `Handed over quota to line floor runner. Received signature for ${req.targetLine || 'Floor Lines'}.`
    );
  };

  const handleExecuteAction = async () => {
    if (!activeModalReq) return;
    try {
      const fullNote = challanNo ? `[Challan #${challanNo}] ${notes}` : notes;
      const storeOfficerName = user?.name ? `${user.name} (Store In-Charge)` : 'Store In-Charge';
      await fulfillMonthlyIndent(
        activeModalReq.id,
        storeOfficerName,
        fullNote,
        modalAction === 'RECEIVE' ? 'RECEIVE_INTO_CRIB' : 'DISPATCH_TO_LINE'
      );

      showToast(
        modalAction === 'RECEIVE'
          ? `Inward monthly shipment received & stock credited to tool crib!`
          : `Monthly supply quota dispatched to ${activeModalReq.targetLine || 'Floor Lines'}!`,
        'success'
      );
      setActiveModalReq(null);
    } catch (e) {
      showToast('Error processing store action', 'error');
      console.error(e);
    }
  };

  // Add Item to Draft Indent
  const handleAddIndentItem = () => {
    setIndentItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        partId: '',
        partName: '',
        sku: '',
        quantity: 5,
        unit: 'pcs',
        unitCost: 0,
      },
    ]);
  };

  // Remove Item from Draft Indent
  const handleRemoveIndentItem = (id: string) => {
    if (indentItems.length === 1) {
      showToast('An indent must have at least one item.', 'warning');
      return;
    }
    setIndentItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Handle selecting a registered part for an item row
  const handleItemPartSelect = (id: string, partId: string) => {
    const selected = parts.find((p) => p.partId === partId);
    if (!selected) return;
    setIndentItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              partId: selected.partId,
              partName: selected.name,
              sku: selected.sku,
              unit: selected.unit,
              unitCost: selected.unitCost,
            }
          : item
      )
    );
  };

  // Update Item fields
  const handleUpdateItemField = (id: string, field: keyof DraftIndentItem, value: any) => {
    setIndentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Calculate Draft Indent Totals
  const draftTotalCost = useMemo(() => {
    return indentItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0);
  }, [indentItems]);

  const draftTotalUnits = useMemo(() => {
    return indentItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  }, [indentItems]);

  // Submit New Monthly Indent
  const handleCreateNewIndent = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = indentItems.filter((i) => i.partName.trim() && (Number(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one item with a valid part name and quantity.', 'error');
      return;
    }

    try {
      const formattedItems: RequisitionItem[] = validItems.map((item) => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.unitCost) || 0;
        return {
          partId: item.partId || `PRT-${Date.now()}`,
          partName: item.partName.trim(),
          sku: item.sku.trim() || 'SKU-GEN',
          quantity: qty,
          unit: item.unit.trim() || 'pcs',
          unitCost: rate,
          totalCost: qty * rate,
        };
      });

      const totalCost = formattedItems.reduce((acc, it) => acc + it.totalCost, 0);
      const totalUnits = formattedItems.reduce((acc, it) => acc + it.quantity, 0);
      const storeOfficerName = user?.name ? `${user.name} (Store In-Charge)` : 'Store In-Charge';

      await createRequisition({
        type: 'MONTHLY_INDENT',
        items: formattedItems,
        itemCount: totalUnits,
        estimatedCost: totalCost,
        urgency: 'ROUTINE',
        requiresCeoApproval: false,
        requestedBy: storeOfficerName,
        requestedByRole: 'STORE_PERSON',
        monthYear: indentMonth,
        targetLine: indentLine,
        justification: indentJustification.trim() || 'Monthly tool crib spare parts quota indent.',
        status: 'ORDERED',
      });

      showToast(`Monthly indent created with ${formattedItems.length} items!`, 'success');
      setIsNewIndentModalOpen(false);

      // Reset form
      setIndentItems([
        {
          id: `item-${Date.now()}`,
          partId: '',
          partName: '',
          sku: '',
          quantity: 10,
          unit: 'pcs',
          unitCost: 0,
        },
      ]);
    } catch (err) {
      console.error(err);
      showToast('Error creating new indent.', 'error');
    }
  };

  const filteredList = requisitions.filter((r) => {
    if (filter === 'PENDING_RECEIPT') return r.status !== 'FULFILLED';
    if (filter === 'FULFILLED') return r.status === 'FULFILLED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Store Terminal Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tool Crib & Store Receiving Custody</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Assigned to: {user?.name || 'Store In-Charge'} (Tool Crib Storekeeper)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Monthly Indent Products &amp; Intake Receiving
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Manage monthly factory spare part indents. Add new indent requisitions, receive bulk supplier deliveries into bins, and dispatch quotas to sewing lines.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* ADD NEW INDENT BUTTON */}
            <button
              onClick={() => setIsNewIndentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Add a new monthly indent requisition with items"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Indent</span>
            </button>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-right">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Pending Receiving
              </span>
              <span className="text-xl font-black text-amber-600">{pendingIndents.length} Indents</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-right">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Completed
              </span>
              <span className="text-xl font-black text-emerald-600">{fulfilledIndents.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Authority Advisory Banner */}
      {!isStorePerson && (
        <div className="bg-blue-50 border border-blue-300 p-4 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-800 flex items-center justify-center font-bold shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Store Person Custody Only:</span> You are viewing the Monthly Store Indents in read-only mode as <span className="font-mono font-bold uppercase">{role || 'GUEST'}</span>. Only <strong>Store Manager / Store Person</strong> has authority to receive inward stock and dispatch parts to sewing lines.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Store Inbox Orders & Crib Current Stock Shelf */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Products Assigned to Storekeeper */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Monthly Supply Indents Under Your Name ({filteredList.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setFilter('PENDING_RECEIPT')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    filter === 'PENDING_RECEIPT'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  To Receive &amp; Dispatch ({pendingIndents.length})
                </button>
                <button
                  onClick={() => setFilter('FULFILLED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    filter === 'FULFILLED'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fulfilled ({fulfilledIndents.length})
                </button>
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    filter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({requisitions.length})
                </button>
              </div>

              <button
                onClick={() => setIsNewIndentModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Monthly Indents Pending</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active monthly indents found matching your filter. Create a new monthly indent to begin tracking stock allocation.
              </p>
              <button
                onClick={() => setIsNewIndentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Monthly Indent</span>
              </button>
            </div>
          ) : (
            filteredList.map((req) => {
              const isFulfilled = req.status === 'FULFILLED';
              const isOrdered = req.status === 'ORDERED';

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                    isFulfilled
                      ? 'border-emerald-200'
                      : isOrdered
                      ? 'border-indigo-200'
                      : 'border-amber-300 ring-2 ring-amber-500/10'
                  }`}
                >
                  {/* Indent Header Strip */}
                  <div
                    className={`px-5 py-3 flex items-center justify-between ${
                      isFulfilled
                        ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-100'
                        : isOrdered
                        ? 'bg-indigo-50 text-indigo-900 border-b border-indigo-100'
                        : 'bg-amber-50 text-amber-900 border-b border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">
                        {req.monthYear} • Monthly Parts Indent
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isFulfilled
                            ? 'bg-emerald-200 text-emerald-800'
                            : isOrdered
                            ? 'bg-indigo-200 text-indigo-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {isFulfilled ? 'Stock Dispatched to Lines' : isOrdered ? 'In Tool Crib' : 'Awaiting Store Intake'}
                      </span>
                      <span className="text-xs font-mono font-bold">{req.id}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    {/* Meta details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700">Target Production Lines:</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                          {req.targetLine || 'All Lines'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Requested by: </span>
                        <strong className="text-slate-800">{req.requestedBy}</strong>
                      </div>
                    </div>

                    {/* Itemized Parts Table */}
                    <div>
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Monthly Products Required Under Store Custody ({req.items?.length || (req.partName ? 1 : 0)} Parts):</span>
                        </span>
                        <span className="text-slate-500 font-mono">
                          Allocation Total: <strong className="text-slate-900">₹{req.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>

                      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse border border-slate-300">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300 select-none">
                            <tr>
                              <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300">Part Name &amp; Specs</th>
                              <th className="py-2.5 px-3 bg-slate-100 border-r border-b border-slate-300 font-mono">SKU</th>
                              <th className="py-2.5 px-3 text-right bg-slate-100 border-r border-b border-slate-300 font-mono">Quota Quantity</th>
                              <th className="py-2.5 px-3 text-right bg-slate-100 border-r border-b border-slate-300 font-mono">Unit Rate (₹)</th>
                              <th className="py-2.5 px-3 text-right bg-slate-100 border-b border-slate-300 font-mono">Subtotal (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white font-medium">
                            {req.items && req.items.length > 0 ? (
                              req.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/60 even:bg-slate-50/40 transition">
                                  <td className="py-2 px-3 font-semibold text-slate-900 border-r border-b border-slate-200">
                                    {item.partName}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-600 text-[11px] border-r border-b border-slate-200">
                                    {item.sku}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-indigo-700 font-mono border-r border-b border-slate-200 tabular-nums">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-700 font-mono border-r border-b border-slate-200 tabular-nums">
                                    ₹{item.unitCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono border-b border-slate-200 tabular-nums">
                                    ₹{item.totalCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="hover:bg-blue-50/60 transition">
                                <td className="py-2 px-3 font-semibold text-slate-900 border-r border-b border-slate-200">
                                  {req.partName || 'Spare Part'}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600 text-[11px] border-r border-b border-slate-200">
                                  {req.sku || 'N/A'}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-indigo-700 font-mono border-r border-b border-slate-200 tabular-nums">
                                  {req.quantity} {req.unit || 'pcs'}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-700 font-mono border-r border-b border-slate-200 tabular-nums">
                                  ₹{((req.estimatedCost || 0) / (req.quantity || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono border-b border-slate-200 tabular-nums">
                                  ₹{req.estimatedCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Operational Notes / Remarks */}
                    {req.storeNotes && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Store Receiving Log:</span>
                        </span>
                        <p className="text-slate-600 italic">&ldquo;{req.storeNotes}&rdquo;</p>
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Handled by {req.assignedStorePerson || user?.name || 'Store In-Charge'} on {new Date(req.fulfilledAt || req.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500 italic">
                        {req.justification ? `“${req.justification}”` : 'Monthly maintenance replenishment quota.'}
                      </div>

                      {isStorePerson ? (
                        <div className="flex items-center gap-2">
                          {!isFulfilled && (
                            <>
                              <button
                                onClick={() => openActionModal(req, 'RECEIVE')}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Receive Stock Intake</span>
                              </button>
                              <button
                                onClick={() => openActionModal(req, 'DISPATCH')}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>Dispatch to Line Floor</span>
                              </button>
                            </>
                          )}
                          {isFulfilled && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Fulfilled &amp; Signed Off</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Fulfillment requires Store Manager / Store Person
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Col: Crib Shelf Inventory Tracker */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Current Crib Stock Bins</h3>
              </div>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">
                {parts.length} Active SKUs
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Live inventory balances in Tool Crib for active factory lines:
            </p>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {parts.map((p) => {
                const isLow = p.stock <= p.minStock;
                const isCritical = p.stock <= Math.floor(p.minStock * 0.5);
                const maxRef = Math.max(p.minStock * 2, 20);
                const healthPct = Math.min(100, Math.round((p.stock / maxRef) * 100));
                const shelf = p.shelfLocation || 'Tool Crib';
                const returnRequired =
                  p.oldPartReturnRequired ??
                  (p.category === 'Hooks & Loopers' ||
                    p.category === 'Motors & Electrical' ||
                    p.unitCost > 400);

                return (
                  <div
                    key={p.partId}
                    className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/70 space-y-2 text-xs transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-indigo-700">{p.sku}</span>
                          <span>&bull;</span>
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <MapPin className="w-2.5 h-2.5 text-indigo-600" />
                            {shelf}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-md ${
                            isLow
                              ? 'bg-rose-100 text-rose-700 font-extrabold'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    </div>

                    {/* Live Stock Health Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCritical
                              ? 'bg-rose-600'
                              : isLow
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(8, healthPct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          Min Safe: {p.minStock} {p.unit}
                        </span>
                        {returnRequired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <RefreshCw className="w-2.5 h-2.5 text-rose-600" />
                            1:1 Scrap Return
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Standard</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store Person Duty Guidelines */}
          <div className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-200 space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-700" />
              <span>Storekeeper Operating Protocol</span>
            </h4>
            <ul className="text-xs text-emerald-900/80 space-y-1.5">
              <li>• Always cross-check supplier delivery challan before receiving into bins.</li>
              <li>• Needles and oil must be stored in humidity-controlled Tool Crib Bin A-04.</li>
              <li>• Mechanics must sign the floor issue chit upon collection for Line 01-04.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CREATE NEW INDENT MODAL */}
      {isNewIndentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create New Monthly Store Indent
                  </h3>
                  <p className="text-xs text-slate-500">
                    Request monthly spare parts quota and buffer items for tool crib custody
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewIndentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewIndent} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Config Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Month &amp; Year
                  </label>
                  <input
                    type="text"
                    value={indentMonth}
                    onChange={(e) => setIndentMonth(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Target Line / Area
                  </label>
                  <select
                    value={indentLine}
                    onChange={(e) => setIndentLine(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Line 01 & Line 02">Line 01 &amp; Line 02</option>
                    <option value="Line 01">Line 01 (Overlock &amp; SNLS)</option>
                    <option value="Line 02">Line 02 (Lockstitch &amp; Special)</option>
                    <option value="Line 03">Line 03</option>
                    <option value="Line 04">Line 04</option>
                    <option value="Line 05">Line 05</option>
                    <option value="Cutting Section">Cutting Section</option>
                    <option value="Finishing Bay">Finishing Bay</option>
                    <option value="Utility Plant">Utility Plant</option>
                    <option value="All Factory Lines">All Factory Lines (Plant-wide)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Requested By
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.name ? `${user.name} (Store In-Charge)` : 'Store In-Charge'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Items Section ("add things") */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Indent Line Items ({indentItems.length} Products)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add the parts and components needed for the monthly store quota
                    </p>
                  </div>

                  {/* BUTTON TO ADD THINGS */}
                  <button
                    type="button"
                    onClick={handleAddIndentItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Items Table / Form List */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-300 select-none">
                      <tr>
                        <th className="py-2.5 px-3 border-r border-slate-300 min-w-[190px]">
                          Select or Enter Part Name
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 font-mono w-28">
                          SKU
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-20 text-center">
                          Qty
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-20 text-center">
                          Unit
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-24 text-right font-mono">
                          Rate (₹)
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 w-28 text-right font-mono">
                          Subtotal (₹)
                        </th>
                        <th className="py-2.5 px-2 text-center w-10">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {indentItems.map((item, idx) => {
                        const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition">
                            {/* Part Name & Selection Dropdown */}
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div className="space-y-1">
                                {parts.length > 0 && (
                                  <select
                                    value={item.partId}
                                    onChange={(e) => handleItemPartSelect(item.id, e.target.value)}
                                    className="w-full text-[11px] p-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                                  >
                                    <option value="">-- Choose from Catalog --</option>
                                    {parts.map((p) => (
                                      <option key={p.partId} value={p.partId}>
                                        {p.name} ({p.sku}) - ₹{p.unitCost}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <input
                                  type="text"
                                  value={item.partName}
                                  onChange={(e) => handleUpdateItemField(item.id, 'partName', e.target.value)}
                                  placeholder="Or type part name..."
                                  className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-medium"
                                  required
                                />
                              </div>
                            </td>

                            {/* SKU */}
                            <td className="py-2 px-3 border-r border-slate-200">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleUpdateItemField(item.id, 'sku', e.target.value)}
                                placeholder="SKU-XXX"
                                className="w-full text-[11px] font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="py-2 px-2 border-r border-slate-200 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemField(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full text-xs font-mono font-bold text-center px-1 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                                required
                              />
                            </td>

                            {/* Unit */}
                            <td className="py-2 px-2 border-r border-slate-200 text-center">
                              <select
                                value={item.unit}
                                onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                                className="w-full text-[11px] px-1 py-1 bg-white border border-slate-200 rounded-lg text-center cursor-pointer"
                              >
                                <option value="pcs">pcs</option>
                                <option value="units">units</option>
                                <option value="sets">sets</option>
                                <option value="boxes">boxes</option>
                                <option value="jugs">jugs</option>
                                <option value="litres">litres</option>
                              </select>
                            </td>

                            {/* Unit Cost */}
                            <td className="py-2 px-2 border-r border-slate-200 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.unitCost}
                                onChange={(e) => handleUpdateItemField(item.id, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full text-xs font-mono text-right px-2 py-1 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Subtotal */}
                            <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                              ₹{lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Remove Action */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIndentItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-xs">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-700">
                          Total Indent Allocation
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-indigo-700">
                          {draftTotalUnits}
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          Grand Total:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                          ₹{draftTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Justification & Remarks */}
              <div className="text-xs space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase">
                  Indent Justification &amp; Purpose
                </label>
                <textarea
                  rows={2}
                  value={indentJustification}
                  onChange={(e) => setIndentJustification(e.target.value)}
                  placeholder="State the purpose for this monthly indent allocation..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                <div className="text-xs text-slate-500">
                  <strong className="text-slate-800">{indentItems.length}</strong> items • Estimated CapEx:{' '}
                  <strong className="text-slate-900 font-mono">
                    ₹{draftTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewIndentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Create &amp; Dispatch Indent</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Action Modal: Receive or Dispatch */}
      {activeModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    modalAction === 'RECEIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {modalAction === 'RECEIVE' ? <Truck className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalAction === 'RECEIVE'
                      ? 'Inward Delivery Receiving Intake'
                      : 'Dispatch Monthly Products to Floor'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Indent Ref: {activeModalReq.id} ({activeModalReq.monthYear})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-700 mb-1">Products Being Transferred:</div>
                <ul className="space-y-1 text-slate-600">
                  {activeModalReq.items && activeModalReq.items.length > 0 ? (
                    activeModalReq.items.map((item, i) => (
                      <li key={i} className="flex justify-between">
                        <span>• {item.partName}</span>
                        <strong className="text-indigo-700">
                          {item.quantity} {item.unit}
                        </strong>
                      </li>
                    ))
                  ) : (
                    <li className="flex justify-between">
                      <span>• {activeModalReq.partName || 'Spare Part'}</span>
                      <strong className="text-indigo-700">
                        {activeModalReq.quantity} {activeModalReq.unit || 'pcs'}
                      </strong>
                    </li>
                  )}
                </ul>
              </div>

              {modalAction === 'RECEIVE' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Supplier Delivery Challan / Invoice #
                  </label>
                  <input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="e.g. DC-984210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Store Notes / Verification Comments
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  modalAction === 'RECEIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {modalAction === 'RECEIVE' ? 'Confirm Inward Stock Intake' : 'Confirm Floor Dispatch'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreInboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading store inbox...</div>}>
      <StoreInboxContent />
    </Suspense>
  );
}
