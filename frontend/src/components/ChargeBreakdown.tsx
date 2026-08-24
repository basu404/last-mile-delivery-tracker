import type { ChargeBreakdown as Breakdown } from '../api/orders.api';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export function ChargeBreakdown({ quote }: { quote: Breakdown }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50" aria-label="Charge breakdown">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4"><div><p className="eyebrow">Verified quote</p><p className="mt-1 text-sm text-slate-600">{quote.pickupZoneName} → {quote.dropZoneName}</p></div><p className="font-display text-3xl font-bold text-brand-900">{money(quote.totalCharge)}</p></div>
      <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Actual weight</dt><dd className="font-semibold">{quote.actualWeightKg.toFixed(2)} kg</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Volumetric weight</dt><dd className="font-semibold">{quote.volumetricWeightKg.toFixed(2)} kg</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Chargeable weight</dt><dd className="font-semibold">{quote.chargeableWeightKg.toFixed(2)} kg</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Base charge</dt><dd className="font-semibold">{money(quote.baseCharge)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-slate-500">COD surcharge</dt><dd className="font-semibold">{money(quote.codSurcharge)}</dd></div>
        <div className="flex justify-between gap-4 border-t border-brand-100 pt-3 sm:col-span-2"><dt className="font-bold">Total</dt><dd className="font-bold text-brand-700">{money(quote.totalCharge)}</dd></div>
      </dl>
      <p className="px-5 pb-5 text-xs text-slate-500">The server recalculates this amount when you confirm the order.</p>
    </section>
  );
}
