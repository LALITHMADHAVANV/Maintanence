'use client';

import { ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import type { Machine } from '@/types/cmms';

type AssetMedia = { src: string; name?: string; mimeType?: string };

function getAssetMedia(asset: Machine, keys: string[]): AssetMedia | null {
  const record = asset as Machine & Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    const sourceObject = value && typeof value === 'object' ? value as Record<string, unknown> : null;
    const src = typeof value === 'string'
      ? value.trim()
      : [sourceObject?.url, sourceObject?.fileUrl, sourceObject?.downloadUrl, sourceObject?.src, sourceObject?.data].find((item): item is string => typeof item === 'string' && Boolean(item.trim()))?.trim();
    if (!src || !/^(https?:\/\/|\/|data:image\/|data:application\/pdf)/i.test(src)) continue;
    return {
      src,
      name: typeof sourceObject?.name === 'string' ? sourceObject.name : undefined,
      mimeType: typeof sourceObject?.mimeType === 'string' ? sourceObject.mimeType : undefined,
    };
  }
  return null;
}

export function AssetDetailsDialog({ asset, onClose }: { asset: Machine | null; onClose: () => void }) {
  if (!asset) return null;

  const record = asset as Machine & Record<string, unknown>;
  const assetImage = getAssetMedia(asset, ['assetImageUrl', 'machineImageUrl', 'imageUrl', 'photoUrl', 'assetImage', 'machineImage', 'image', 'photo']);
  const invoice = getAssetMedia(asset, ['invoiceUrl', 'purchaseInvoiceUrl', 'invoiceImageUrl', 'invoice', 'purchaseInvoice', 'invoiceFile', 'invoiceDocument']);
  const invoiceNumber = typeof record.invoiceNumber === 'string' ? record.invoiceNumber : typeof record.purchaseInvoiceNumber === 'string' ? record.purchaseInvoiceNumber : '';
  const isInvoiceImage = Boolean(invoice && (/^data:image\//i.test(invoice.src) || /^image\//i.test(invoice.mimeType || '') || /\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(invoice.src)));
  const isInvoicePdf = Boolean(invoice && (/^data:application\/pdf/i.test(invoice.src) || /application\/pdf/i.test(invoice.mimeType || '') || /\.pdf(?:[?#]|$)/i.test(invoice.src)));
  const location = [asset.unit, asset.zone || asset.area, asset.currentLine, asset.stationNo].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="asset-preview-title" className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Asset details</p><h2 id="asset-preview-title" className="truncate font-mono text-lg font-black text-slate-900">{asset.id}</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Close</button>
        </header>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><ImageIcon className="h-4 w-4 text-emerald-700" />Asset image</h3>
            {assetImage ? <img src={assetImage.src} alt={`Asset ${asset.id}`} className="max-h-[360px] w-full rounded-lg bg-white object-contain" /> : <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-xs text-slate-500"><ImageIcon className="mb-2 h-8 w-8 text-slate-300" />No asset image attached to this record.</div>}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4 text-indigo-700" />Purchase invoice</h3>
            {invoice ? <div className="space-y-2">
              {isInvoiceImage && <img src={invoice.src} alt={`Invoice for asset ${asset.id}`} className="max-h-[360px] w-full rounded-lg bg-white object-contain" />}
              {isInvoicePdf && <iframe src={invoice.src} title={`Purchase invoice for asset ${asset.id}`} className="h-[360px] w-full rounded-lg border border-slate-200 bg-white" />}
              {!isInvoiceImage && !isInvoicePdf && <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-500">Invoice file attached</div>}
              <a href={invoice.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline">{invoice.name || 'Open invoice'} <ExternalLink className="h-3.5 w-3.5" /></a>
            </div> : <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-xs text-slate-500"><FileText className="mb-2 h-8 w-8 text-slate-300" />{invoiceNumber ? `Invoice ${invoiceNumber} is recorded, but no file is attached.` : 'No invoice attached to this record.'}</div>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-2">
            <h3 className="mb-2 text-sm font-bold text-slate-800">Machine information</h3>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div><span className="block text-slate-500">Asset name</span><strong className="text-slate-900">{asset.name || `${asset.brand} ${asset.model}`}</strong></div>
              <div><span className="block text-slate-500">Brand / Model</span><strong className="text-slate-900">{asset.brand} / {asset.model}</strong></div>
              <div><span className="block text-slate-500">Machine type</span><strong className="text-slate-900">{asset.typeName || asset.type}</strong></div>
              <div><span className="block text-slate-500">Location</span><strong className="text-slate-900">{location || 'Not recorded'}</strong></div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
