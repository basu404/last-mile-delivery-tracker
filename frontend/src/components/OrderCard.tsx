import { Link } from 'react-router-dom';
import { formatStatus, type Order, type OrderStatus } from '../api/orders.api';

const badgeStyles: Record<OrderStatus, string> = {
  created: 'bg-slate-100 text-slate-700', assigned: 'bg-blue-100 text-blue-700', picked_up: 'bg-indigo-100 text-indigo-700', in_transit: 'bg-violet-100 text-violet-700', out_for_delivery: 'bg-amber-100 text-amber-800', delivered: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', rescheduled: 'bg-orange-100 text-orange-700', cancelled: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }: { status: OrderStatus }) { return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeStyles[status]}`}>{formatStatus(status)}</span>; }

export function OrderCard({ order, footer }: { order: Order; footer?: React.ReactNode }) {
  return (
    <article className="panel flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Order #{order.id.slice(0, 8)}</p><p className="mt-2 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p></div><StatusBadge status={order.status} /></div>
      <div className="mt-6 flex-1 space-y-4">
        <div className="relative pl-6 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-slate-200"><p className="relative text-sm font-semibold before:absolute before:-left-6 before:top-1 before:h-2.5 before:w-2.5 before:rounded-full before:bg-brand-500">{order.pickupAddress}</p><p className="relative mt-4 text-sm font-semibold before:absolute before:-left-6 before:top-1 before:h-2.5 before:w-2.5 before:rounded-full before:bg-amber">{order.dropAddress}</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>{order.orderType}</span><span>{order.paymentType.toUpperCase()}</span><span>{order.chargeableWeightKg.toFixed(2)} kg</span><span className="font-bold text-ink">₹{order.totalCharge.toFixed(2)}</span></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">{order.assignedAgent ? `Agent: ${order.assignedAgent.name}` : 'Awaiting assignment'}</span><Link to={`/orders/${order.id}`} className="text-sm font-bold text-brand-700 hover:underline">View details →</Link></div>
      {footer && <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div>}
    </article>
  );
}
