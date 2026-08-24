import { formatStatus, type StatusHistory } from '../api/orders.api';

export function OrderTimeline({ history }: { history: StatusHistory[] }) {
  if (!history.length) return <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No status history is available.</p>;
  return (
    <ol className="space-y-0" aria-label="Order status history">
      {history.map((entry, index) => (
        <li key={entry.id} className="relative grid grid-cols-[28px_1fr] gap-3 pb-7 last:pb-0">
          {index < history.length - 1 && <span className="absolute bottom-0 left-[13px] top-4 w-px bg-slate-200" />}
          <span className={`relative z-10 mt-1 h-7 w-7 rounded-full border-4 border-white ${index === history.length - 1 ? 'bg-brand-500' : 'bg-slate-300'}`} />
          <div><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-bold">{formatStatus(entry.status)}</p><time className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</time></div>{entry.notes && <p className="mt-1 text-sm text-slate-600">{entry.notes}</p>}{entry.changedBy && <p className="mt-1 text-xs text-slate-400">Updated by {entry.changedBy.name} ({entry.changedBy.role})</p>}</div>
        </li>
      ))}
    </ol>
  );
}
