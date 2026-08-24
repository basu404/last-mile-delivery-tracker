import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { listMyOrders, type Order } from '../api/orders.api';
import { OrderCard } from '../components/OrderCard';
import { useAuth } from '../context/AuthContext';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setOrders(await listMyOrders()); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  const active = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;
  const delivered = orders.filter((order) => order.status === 'delivered').length;

  return <div className="page-shell">
    <section className="flex flex-col gap-5 rounded-3xl bg-brand-900 p-6 text-white sm:flex-row sm:items-end sm:justify-between sm:p-8"><div><p className="eyebrow text-amber">Customer workspace</p><h1 className="mt-3 font-display text-4xl font-bold">Good to see you, {user?.name.split(' ')[0]}.</h1><p className="mt-2 text-emerald-100">Create a shipment or check where every order stands.</p></div><Link className="btn-primary bg-amber text-ink hover:bg-yellow-400" to="/customer/orders/new">+ Create order</Link></section>
    <section className="mt-6 grid gap-4 sm:grid-cols-3"><div className="panel"><p className="text-sm text-slate-500">Total orders</p><p className="mt-2 font-display text-4xl font-bold">{orders.length}</p></div><div className="panel"><p className="text-sm text-slate-500">Active</p><p className="mt-2 font-display text-4xl font-bold text-blue-700">{active}</p></div><div className="panel"><p className="text-sm text-slate-500">Delivered</p><p className="mt-2 font-display text-4xl font-bold text-brand-700">{delivered}</p></div></section>
    <div className="mt-8 flex items-end justify-between"><div><p className="eyebrow">Shipment history</p><h2 className="mt-2 font-display text-3xl font-bold">My orders</h2></div><button className="text-sm font-bold text-brand-700" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {loading ? <div className="mt-5 panel animate-pulse text-sm text-slate-500">Loading your orders…</div> : error ? <div className="mt-5 rounded-2xl bg-red-50 p-5 text-red-700"><p>{error}</p><button className="mt-3 font-bold underline" onClick={() => void load()}>Try again</button></div> : orders.length ? <div className="mt-5 grid gap-5 lg:grid-cols-2">{orders.map((order) => <OrderCard key={order.id} order={order} />)}</div> : <div className="mt-5 panel py-12 text-center"><p className="font-display text-2xl font-bold">No deliveries yet</p><p className="mt-2 text-slate-500">Your confirmed orders will appear here.</p><Link to="/customer/orders/new" className="btn-primary mt-5">Create your first order</Link></div>}
  </div>;
}
