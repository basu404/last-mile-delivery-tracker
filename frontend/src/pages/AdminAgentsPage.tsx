import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createAgent,
  listAgents,
  type AdminAgent,
  type CreateAgentInput,
} from '../api/agents.api';
import { getApiErrorMessage } from '../api/client';
import { listZones, type Zone } from '../api/zones.api';

const initialForm: CreateAgentInput = {
  name: '',
  email: '',
  password: '',
  phone: '',
  assignedZoneId: '',
};

export default function AdminAgentsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [form, setForm] = useState<CreateAgentInput>(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [zoneResult, agentResult] = await Promise.all([listZones(), listAgents()]);
      setZones(zoneResult);
      setAgents(agentResult);
      setForm((current) => ({
        ...current,
        assignedZoneId: current.assignedZoneId || zoneResult[0]?.id || '',
      }));
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof CreateAgentInput>(key: K, value: CreateAgentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const agent = await createAgent({
        ...form,
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
      });
      setForm((current) => ({ ...initialForm, assignedZoneId: current.assignedZoneId }));
      setMessage(`${agent.name} was added to ${agent.assignedZone?.name ?? 'the selected zone'}.`);
      await load();
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-shell">
    <div><p className="eyebrow">Delivery workforce</p><h1 className="mt-3 font-display text-4xl font-bold">Agents</h1><p className="mt-3 max-w-2xl text-slate-600">Create delivery-agent accounts and place each worker in the zone whose pickups they can serve.</p></div>
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`mt-5 rounded-xl p-4 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}

    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
      <form className="panel" onSubmit={submit}>
        <p className="eyebrow">Admin action</p><h2 className="mt-2 font-display text-2xl font-bold">Add an agent</h2>
        <div className="mt-6 space-y-4">
          <label><span className="input-label">Full name</span><input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Priya Sharma" required /></label>
          <label><span className="input-label">Email address</span><input className="input" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" placeholder="priya@example.com" required /></label>
          <label><span className="input-label">Phone number</span><input className="input" type="tel" value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} minLength={7} maxLength={20} autoComplete="tel" placeholder="9876543210" /></label>
          <label><span className="input-label">Temporary password</span><input className="input" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /><span className="mt-1 block text-xs text-slate-500">Use 8–72 characters and share it with the agent securely.</span></label>
          <label><span className="input-label">Assigned zone</span><select className="input" value={form.assignedZoneId} onChange={(event) => update('assignedZoneId', event.target.value)} required><option value="">Select a zone</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
        </div>
        <button className="btn-primary mt-6 w-full" disabled={busy || loading || !zones.length}>{busy ? 'Adding agent…' : 'Add agent'}</button>
        {!loading && !zones.length && <p className="mt-3 text-sm text-amber-700">Create a zone before adding an agent.</p>}
      </form>

      <section>
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Current staffing</p><h2 className="mt-2 font-display text-3xl font-bold">Agents by zone</h2></div><button type="button" className="text-sm font-bold text-brand-700" onClick={() => void load()} disabled={loading}>Refresh</button></div>
        {loading ? <div className="panel mt-5 animate-pulse text-slate-500">Loading agents…</div> : <div className="mt-5 space-y-4">{zones.map((zone) => {
          const zoneAgents = agents.filter((agent) => agent.assignedZoneId === zone.id);
          return <article className="panel" key={zone.id}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">{zone.name}</h3><p className="mt-1 text-sm text-slate-500">{zoneAgents.length} agent{zoneAgents.length === 1 ? '' : 's'}</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{zoneAgents.filter((agent) => agent.isAvailable).length} available</span></div>
            {zoneAgents.length ? <ul className="mt-5 grid gap-3 sm:grid-cols-2">{zoneAgents.map((agent) => <li className="rounded-2xl bg-slate-50 p-4" key={agent.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{agent.name}</p><p className="mt-1 truncate text-xs text-slate-500">{agent.email}</p>{agent.phone && <p className="mt-1 text-xs text-slate-500">{agent.phone}</p>}</div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${agent.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} title={agent.isAvailable ? 'Available' : 'Unavailable'} /></div><p className="mt-3 text-xs font-semibold text-slate-600">{agent.activeOrderCount} active order{agent.activeOrderCount === 1 ? '' : 's'}</p></li>)}</ul> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No agents assigned to this zone.</p>}
          </article>;
        })}</div>}
      </section>
    </div>
  </div>;
}
