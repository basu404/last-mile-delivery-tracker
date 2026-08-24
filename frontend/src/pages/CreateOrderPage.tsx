import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { createOrder, getQuote, type ChargeBreakdown as Quote, type CreateOrderInput } from '../api/orders.api';
import { ChargeBreakdown } from '../components/ChargeBreakdown';

const initialForm: CreateOrderInput = { pickupAddress: '', pickupPincode: '', dropAddress: '', dropPincode: '', lengthCm: 1, breadthCm: 1, heightCm: 1, actualWeightKg: 1, orderType: 'B2C', paymentType: 'prepaid' };

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [creating, setCreating] = useState(false);

  const update = <K extends keyof CreateOrderInput>(field: K, value: CreateOrderInput[K]) => { setForm((current) => ({ ...current, [field]: value })); setQuote(null); setError(''); };
  const numberValue = (value: string) => Number(value);

  async function quoteOrder(event: FormEvent) {
    event.preventDefault(); setError(''); setQuoting(true);
    try { const { pickupAddress: _pickup, dropAddress: _drop, scheduledDate: _date, ...chargeInput } = form; setQuote(await getQuote(chargeInput)); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setQuoting(false); }
  }

  async function confirm() {
    if (!quote) return;
    setCreating(true); setError('');
    try { const order = await createOrder(form); navigate(`/orders/${order.id}`); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setCreating(false); }
  }

  return <div className="page-shell">
    <div className="mb-8 max-w-3xl"><p className="eyebrow">New shipment</p><h1 className="mt-3 font-display text-4xl font-bold">Create a delivery order</h1><p className="mt-3 text-slate-600">Enter the route and parcel details. We resolve the zones and calculate the charge on the server.</p></div>
    <form onSubmit={quoteOrder} className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="panel"><div className="mb-5"><p className="eyebrow">01 · Route</p><h2 className="mt-2 font-display text-2xl font-bold">Pickup and destination</h2></div><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="input-label">Pickup address</span><textarea className="input min-h-24 resize-y" value={form.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} minLength={5} required /></label><label className="block"><span className="input-label">Drop address</span><textarea className="input min-h-24 resize-y" value={form.dropAddress} onChange={(e) => update('dropAddress', e.target.value)} minLength={5} required /></label><label className="block"><span className="input-label">Pickup pincode</span><input className="input" inputMode="numeric" pattern="[0-9]{4,10}" value={form.pickupPincode} onChange={(e) => update('pickupPincode', e.target.value)} required /></label><label className="block"><span className="input-label">Drop pincode</span><input className="input" inputMode="numeric" pattern="[0-9]{4,10}" value={form.dropPincode} onChange={(e) => update('dropPincode', e.target.value)} required /></label></div></section>
        <section className="panel"><div className="mb-5"><p className="eyebrow">02 · Parcel</p><h2 className="mt-2 font-display text-2xl font-bold">Dimensions and weight</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(['lengthCm', 'breadthCm', 'heightCm', 'actualWeightKg'] as const).map((field) => <label key={field} className="block"><span className="input-label">{{ lengthCm: 'Length (cm)', breadthCm: 'Breadth (cm)', heightCm: 'Height (cm)', actualWeightKg: 'Weight (kg)' }[field]}</span><input className="input" type="number" min="0.01" step="0.01" value={form[field]} onChange={(e) => update(field, numberValue(e.target.value))} required /></label>)}</div></section>
        <section className="panel"><div className="mb-5"><p className="eyebrow">03 · Service</p><h2 className="mt-2 font-display text-2xl font-bold">Order and payment type</h2></div><div className="grid gap-5 sm:grid-cols-3"><label><span className="input-label">Order type</span><select className="input" value={form.orderType} onChange={(e) => update('orderType', e.target.value as CreateOrderInput['orderType'])}><option value="B2C">B2C</option><option value="B2B">B2B</option></select></label><label><span className="input-label">Payment</span><select className="input" value={form.paymentType} onChange={(e) => update('paymentType', e.target.value as CreateOrderInput['paymentType'])}><option value="prepaid">Prepaid</option><option value="cod">Cash on delivery</option></select></label><label><span className="input-label">Schedule <span className="font-normal text-slate-400">(optional)</span></span><input className="input" type="datetime-local" value={form.scheduledDate ?? ''} onChange={(e) => update('scheduledDate', e.target.value || undefined)} /></label></div></section>
      </div>
      <aside className="panel lg:sticky lg:top-24"><p className="eyebrow">Order estimate</p><h2 className="mt-2 font-display text-2xl font-bold">Review your charge</h2><p className="mt-2 text-sm text-slate-500">Rates depend on zones, parcel weight, order type, and payment method.</p>{error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}<button type="submit" className="btn-secondary mt-6 w-full" disabled={quoting || creating}>{quoting ? 'Calculating…' : quote ? 'Recalculate quote' : 'Get quote'}</button>{quote && <div className="mt-5"><ChargeBreakdown quote={quote} /><button type="button" className="btn-primary mt-5 w-full" onClick={() => void confirm()} disabled={creating}>{creating ? 'Confirming…' : 'Confirm order'}</button></div>}</aside>
    </form>
  </div>;
}
