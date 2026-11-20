'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X, LoaderCircle } from 'lucide-react';
import { importDefinitions, ImportKind, stockImportTemplate } from '@/lib/imports';
import { apiFetch, fetchMachinesOnce, fetchPartsOnce, fetchRequisitionsOnce } from '@/lib/services/cmmsService';

interface Preview {
  count: number;
  existing: number;
  columns: string[];
  rows: Record<string, string>[];
}

export function ImportButton({ kind }: { kind: ImportKind }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const requestVersion = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const definition = importDefinitions[kind];
  const template = kind === 'parts' ? stockImportTemplate : definition;

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  const downloadTemplate = () => {
    const content = '\uFEFF' + [template.columns, template.example].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${kind}-import-template.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  const selectFile = async (file?: File) => {
    const version = ++requestVersion.current;
    setCsv(''); setPreview(null); setError(''); setResult('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 2 * 1024 * 1024) {
      setError('Choose a CSV UTF-8 file up to 2 MB.'); return;
    }
    try {
      const text = await file.text();
      if (version === requestVersion.current) setCsv(text);
    } catch { if (version === requestVersion.current) setError('The file could not be read. Choose it again.'); }
  };

  const submit = async (previewOnly: boolean) => {
    setBusy(true); setError('');
    try {
      const response = await apiFetch('/api/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, csv, preview: previewOnly }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Import failed. Retry the file.');
      if (previewOnly) setPreview(data);
      else {
        setResult(kind === 'parts'
          ? `${data.imported} imported. ${data.updated || 0} vendor details updated. ${data.skipped} existing records kept.`
          : `${data.imported} imported. ${data.skipped} existing records skipped.`);
        setPreview(null); setCsv('');
        const refresh = { assets: fetchMachinesOnce, parts: fetchPartsOnce, indents: fetchRequisitionsOnce }[kind];
        await refresh(true);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Import failed. Retry the file.'); }
    finally { setBusy(false); }
  };

  const close = () => { requestVersion.current++; setOpen(false); setCsv(''); setPreview(null); setError(''); setResult(''); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer">
        <Upload className="h-4 w-4" /> Import {definition.label}
      </button>
      {open && (
        <dialog ref={dialog} aria-label={`Import ${definition.label}`} onCancel={event => { event.preventDefault(); if (!busy) close(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-950/50">
          <section className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Import {definition.label}</h2>
              <button type="button" autoFocus disabled={busy} onClick={close} aria-label="Close import" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-3 text-sm text-slate-600">Upload a CSV UTF-8 file with up to 2,000 rows. You can fill the template in Excel and save it as CSV UTF-8. Existing IDs are skipped.</p>
            <p className="mt-2 text-xs text-slate-500">Required columns — {template.required.join(', ')}.</p>
            {kind === 'parts' && <p className="mt-2 text-sm text-slate-600">Vendor is optional (Vender is also accepted). Cost is the price per item; quantities use pcs by default. Keep the same S.No for the same spare on later imports. Existing stock quantities stay unchanged; provided vendor details can be updated.</p>}
            {kind === 'indents' && <p className="mt-2 text-sm text-slate-600">Use existing part IDs. For monthly indents, repeat the indent ID across its part rows. Request types are MONTHLY_INDENT, URGENT_NEED and CRITICAL_CEO.</p>}
            {kind === 'assets' && <p className="mt-2 text-sm text-slate-600">Use Unit 1 or Unit 2. Purchase dates use YYYY-MM-DD.</p>}
            <button type="button" onClick={downloadTemplate} className="my-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"><Download className="h-4 w-4" /> Download template</button>
            <label className="block text-sm font-semibold text-slate-700">
              CSV file
              <input type="file" accept=".csv,text/csv" disabled={busy} onChange={event => void selectFile(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" />
            </label>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            {result && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>}
            {preview && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-800">{preview.count} records validated. {preview.existing} existing records {kind === 'parts' ? 'will keep their stock quantities; provided vendors will be saved.' : 'will be skipped.'}</p>
                <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <caption className="p-2 text-left text-slate-500">First {preview.rows.length} data rows</caption>
                    <thead className="bg-slate-50"><tr>{preview.columns.map(column => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{kind === 'parts' ? ({ sNo: 'S.No', name: 'Spare Name', machineType: 'Machine Type', unitCost: 'Cost', stock: 'Quantity', vendor: 'Vendor' } as Record<string, string>)[column] || column : column}</th>)}</tr></thead>
                    <tbody>{preview.rows.map((row, index) => <tr key={index} className="border-t border-slate-100">{preview.columns.map(column => <td key={column} className="max-w-64 break-words px-3 py-2">{row[column] || '—'}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={close} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">{result ? 'Done' : 'Cancel'}</button>
              {!result && <button type="button" disabled={busy || !csv} onClick={() => void submit(!preview)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? 'Processing…' : preview ? 'Import records' : 'Validate & preview'}</button>}
            </div>
          </section>
        </dialog>
      )}
    </>
  );
}
