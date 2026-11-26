import type { TnaRow } from './tna';
import { formatDuration } from './dailyTicketReport';

export const tnaExportColumns = ['#', 'Reported / Started (IST)', 'Ticket #', 'Type', 'Machine & Location', 'Issue / Task Details', 'Current Status', 'Attending Technician', 'Downtime', 'Action'];

function timestamp(value?: string | null) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(date) : '-';
}

export function tnaExportRecords(rows: TnaRow[]) {
  return rows.map((row, index) => [String(index + 1), `${timestamp(row.reportedAt)}\nStarted: ${timestamp(row.startedAt)}`, row.id || '-', row.type,
    [row.machineId, row.machineName, row.location].filter(Boolean).join('\n'), row.details || '-', row.status.replaceAll('_', ' '), row.technician,
    formatDuration(row.downtime), row.completed ? 'Completed' : 'Pending']);
}

export async function downloadTna(format: 'pdf' | 'excel', rows: TnaRow[], start: string, end: string) {
  const records = tnaExportRecords(rows);
  const dateRange = `Date range: ${start} to ${end} (IST)`;
  const filename = `T-and-A-${start}-to-${end}`;
  if (format === 'excel') {
    const XLSX = await import('xlsx');
    // Strings remain text cells, including values beginning with =, +, -, or @.
    const sheet = XLSX.utils.aoa_to_sheet([[dateRange], [], tnaExportColumns, ...records]);
    sheet['!cols'] = [6, 29, 22, 14, 35, 60, 19, 26, 16, 16].map(wch => ({ wch }));
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    sheet['!autofilter'] = { ref: `A3:J${records.length + 3}` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'T&A');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } else {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const document = new jsPDF({ orientation: 'landscape', format: 'a3' });
    document.setFontSize(10);
    document.text(dateRange, 12, 12);
    autoTable(document, {
      head: [tnaExportColumns], body: records, startY: 18, margin: 12,
      theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 }, 2: { cellWidth: 35 }, 3: { cellWidth: 21 }, 4: { cellWidth: 55 }, 5: { cellWidth: 80 }, 6: { cellWidth: 35 }, 7: { cellWidth: 50 }, 8: { cellWidth: 30 }, 9: { cellWidth: 40 } },
      showHead: 'everyPage', rowPageBreak: 'avoid',
    });
    document.save(`${filename}.pdf`);
  }
}
