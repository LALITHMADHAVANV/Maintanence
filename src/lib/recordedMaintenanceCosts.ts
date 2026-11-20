import type { RepairTicket, PPMSchedule } from '@/types/cmms';

const recordedAmount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

export function recordedMaintenanceCosts(cost: unknown, repairs: RepairTicket[], ppms: PPMSchedule[], allowance?: number) {
  const repairCost = (repair: RepairTicket) => typeof repair.repairCost === 'number'
    ? recordedAmount(repair.repairCost) : recordedAmount(repair.partsCost) + recordedAmount(repair.laborCost);
  const totalRepairCost = repairs.reduce((total, repair) => total + repairCost(repair), 0);
  const latest = [...repairs].sort((a, b) => (b.reportedAt || '').localeCompare(a.reportedAt || ''))[0];
  const completed = ppms.filter(ppm => ppm.status === 'COMPLETED');
  const preventiveMaintenancePrice = completed.reduce((total, ppm) => total + recordedAmount(Reflect.get(ppm, 'maintenanceCost')), 0);
  const predictedPreventiveCost = ppms.filter(ppm => ppm.status !== 'COMPLETED')
    .reduce((total, ppm) => total + recordedAmount(Reflect.get(ppm, 'estimatedCost')), 0);
  const monthlyAllowance = recordedAmount(allowance);
  const spentAmount = totalRepairCost + preventiveMaintenancePrice;
  return {
    monthlyAllowance, spentAmount, remainingBalance: monthlyAllowance ? monthlyAllowance - spentAmount : 0,
    allowanceStatus: monthlyAllowance === 0 ? 'NOT_CONFIGURED' as const : spentAmount > monthlyAllowance ? 'OVER_BUDGET' as const
      : spentAmount / monthlyAllowance >= 0.85 ? 'NEAR_LIMIT' as const : 'WITHIN_BUDGET' as const,
    purchasePrice: recordedAmount(cost), totalRepairCost, recentRepairCost: latest ? repairCost(latest) : 0,
    preventiveMaintenancePrice, predictedPreventiveCost,
  };
}
