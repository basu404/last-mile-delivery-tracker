import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getOrder, getOrderTimeline, rescheduleOrder, type Order, type StatusHistory } from '../api/orders.api';
import { StatusBadge } from '../components/OrderCard';
import { OrderTimeline } from '../components/OrderTimeline';
import { useAuth } from '../context/AuthContext';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

export default function OrderDetailPage() {
  const { id = '' } = useParams(); const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null); const [timeline, setTimeline] = useState<StatusHistory[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [newDate, setNewDate] = useState(''); const [rescheduling, setRescheduling] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [nextOrder, nextTimeline] = await Promise.all([getOrder(id), getOrderTimeline(id)]); setOrder(nextOrder); setTimeline(nextTimeline); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  async function reschedule() { if (!newDate) return; setRescheduling(true); setError(''); try { await rescheduleOrder(id, new Date(newDate).toISOString()); setNewDate(''); await load(); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setRescheduling(false); } }
  if (loading) return <div className="page-shell"><div className="panel animate-pulse text-slate-500">Loading order details…</div></div>;
  if (!order) return <div className="page-shell"><div className="panel"><p className="font-bold text-red-700">{error || 'Order not found.'}</p><Link to="/" className="mt-4 inline-block font-bold text-brand-700">Return to dashboard</Link></div></div>;
  return <div className="page-shell">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Link to="/" className="text-sm font-bold text-brand-700">← Dashboard</Link><p className="eyebrow mt-5">Order #{order.id.slice(0, 8)}</p><h1 className="mt-2 font-display text-4xl font-bold">Delivery details</h1></div><StatusBadge status={order.status} /></div>
    {error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6"><section className="panel"><h2 className="font-display text-2xl font-bold">Route</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pickup · {order.pickupZone.name}</p><p className="mt-2 font-semibold">{order.pickupAddress}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Drop · {order.dropZone.name}</p><p className="mt-2 font-semibold">{order.dropAddress}</p></div></div></section>
      <section className="panel"><h2 className="font-display text-2xl font-bold">Shipment facts</h2><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-slate-500">Service</dt><dd className="mt-1 font-bold">{order.orderType} · {order.paymentType.toUpperCase()}</dd></div><div><dt className="text-slate-500">Dimensions</dt><dd className="mt-1 font-bold">{order.lengthCm} × {order.breadthCm} × {order.heightCm} cm</dd></div><div><dt className="text-slate-500">Chargeable weight</dt><dd className="mt-1 font-bold">{order.chargeableWeightKg.toFixed(2)} kg</dd></div><div><dt className="text-slate-500">Customer</dt><dd className="mt-1 font-bold">{order.customer.name}</dd></div><div><dt className="text-slate-500">Assigned agent</dt><dd className="mt-1 font-bold">{order.assignedAgent?.name ?? 'Not assigned'}</dd></div><div><dt className="text-slate-500">Scheduled</dt><dd className="mt-1 font-bold">{order.scheduledDate ? new Date(order.scheduledDate).toLocaleString() : 'Not scheduled'}</dd></div></dl></section>
      {user?.role === 'customer' && order.status === 'failed' && <section className="panel border-red-100"><p className="eyebrow text-red-600">Action required</p><h2 className="mt-2 font-display text-2xl font-bold">Reschedule delivery</h2>{order.failureReason && <p className="mt-2 text-sm text-red-700">Failure reason: {order.failureReason}</p>}<div className="mt-5 flex flex-col gap-3 sm:flex-row"><input className="input" type="datetime-local" min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} value={newDate} onChange={(e) => setNewDate(e.target.value)} /><button className="btn-primary" onClick={() => void reschedule()} disabled={!newDate || rescheduling}>{rescheduling ? 'Rescheduling…' : 'Reschedule'}</button></div></section>}</div>
      <aside className="space-y-6"><section className="panel bg-brand-900 text-white"><p className="eyebrow text-amber">Final charge</p><p className="mt-3 font-display text-4xl font-bold">{money(order.totalCharge)}</p><dl className="mt-5 space-y-3 text-sm text-emerald-100"><div className="flex justify-between"><dt>Base charge</dt><dd>{money(order.baseCharge)}</dd></div><div className="flex justify-between"><dt>COD surcharge</dt><dd>{money(order.codSurcharge)}</dd></div></dl></section><section className="panel"><h2 className="font-display text-2xl font-bold">Timeline</h2><div className="mt-6"><OrderTimeline history={timeline} /></div></section></aside>
    </div>
  </div>;
}
