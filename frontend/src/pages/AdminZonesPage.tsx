import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getApiErrorMessage } from '../api/client';
import {
  addPincodes,
  createZone,
  listZonePincodes,
  listZones,
  removePincode,
  updatePincode,
  type Zone,
  type ZonePincode,
} from '../api/zones.api';

interface PincodeDraft {
  zoneId: string;
  pincodeId: string;
  pincode: string;
  newZoneId: string;
}

export default function AdminZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [pincodeText, setPincodeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expandedZoneId, setExpandedZoneId] = useState('');
  const [loadingZoneId, setLoadingZoneId] = useState('');
  const [pincodesByZone, setPincodesByZone] = useState<Record<string, ZonePincode[]>>({});
  const [editing, setEditing] = useState<PincodeDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listZones();
      setZones(result);
      setZoneId((current) => current || result[0]?.id || '');
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function refreshPincodes(id: string) {
    setLoadingZoneId(id);
    try {
      const result = await listZonePincodes(id);
      setPincodesByZone((current) => ({ ...current, [id]: result.pincodes }));
    } finally {
      setLoadingZoneId('');
    }
  }

  async function submitZone(event: FormEvent) {
    event.preventDefault();
    setBusy('zone'); setError(''); setMessage('');
    try {
      const zone = await createZone(name);
      setName(''); setMessage(`${zone.name} created.`);
      await load();
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  async function submitPincodes(event: FormEvent) {
    event.preventDefault();
    const pincodes = [...new Set(pincodeText.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
    if (!zoneId || !pincodes.length) return;
    setBusy('pincodes'); setError(''); setMessage('');
    try {
      await addPincodes(zoneId, pincodes);
      setPincodeText('');
      setMessage(`${pincodes.length} pincode${pincodes.length === 1 ? '' : 's'} mapped.`);
      await load();
      if (expandedZoneId === zoneId) await refreshPincodes(zoneId);
      else setPincodesByZone((current) => { const next = { ...current }; delete next[zoneId]; return next; });
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  async function expandZone(id: string) {
    if (expandedZoneId === id) {
      setExpandedZoneId(''); setEditing(null); return;
    }
    setExpandedZoneId(id); setEditing(null); setError('');
    if (pincodesByZone[id]) return;
    try {
      await refreshPincodes(id);
    } catch (caught) {
      setExpandedZoneId(''); setError(getApiErrorMessage(caught));
    }
  }

  async function removeMapping(zone: Zone, item: ZonePincode) {
    if (!window.confirm(`Remove pincode ${item.pincode} from ${zone.name}?`)) return;
    setBusy(item.id); setError(''); setMessage('');
    try {
      await removePincode(zone.id, item.id);
      setMessage(`Pincode ${item.pincode} removed from ${zone.name}.`);
      await Promise.all([load(), refreshPincodes(zone.id)]);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  async function savePincode() {
    if (!editing) return;
    setBusy(editing.pincodeId); setError(''); setMessage('');
    try {
      await updatePincode(editing.zoneId, editing.pincodeId, {
        pincode: editing.pincode,
        newZoneId: editing.newZoneId,
      });
      const sourceZoneId = editing.zoneId;
      const targetZoneId = editing.newZoneId;
      setEditing(null);
      setPincodesByZone((current) => {
        const next = { ...current };
        delete next[sourceZoneId];
        delete next[targetZoneId];
        return next;
      });
      setMessage(sourceZoneId === targetZoneId ? 'Pincode updated.' : 'Pincode moved to the selected zone.');
      await load();
      await refreshPincodes(sourceZoneId);
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setBusy('');
    }
  }

  return <div className="page-shell">
    <div><p className="eyebrow">Service geography</p><h1 className="mt-3 font-display text-4xl font-bold">Zones and pincodes</h1><p className="mt-3 max-w-2xl text-slate-600">Zones drive rate selection and pickup-agent eligibility. A pincode can belong to only one zone.</p></div>
    {(error || message) && <p className={`mt-5 rounded-xl p-4 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form className="panel" onSubmit={submitZone}><p className="eyebrow">Create</p><h2 className="mt-2 font-display text-2xl font-bold">New zone</h2><label className="mt-6 block"><span className="input-label">Zone name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} placeholder="e.g. Zone C" required /></label><button className="btn-primary mt-5 w-full" disabled={busy === 'zone'}>{busy === 'zone' ? 'Creating…' : 'Create zone'}</button></form>
      <form className="panel" onSubmit={submitPincodes}><p className="eyebrow">Coverage</p><h2 className="mt-2 font-display text-2xl font-bold">Bulk-add pincodes</h2><label className="mt-6 block"><span className="input-label">Zone</span><select className="input" value={zoneId} onChange={(event) => setZoneId(event.target.value)} required><option value="">Select a zone</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label className="mt-4 block"><span className="input-label">Pincodes</span><textarea className="input min-h-28" value={pincodeText} onChange={(event) => setPincodeText(event.target.value)} placeholder={'110001, 110002\n110003'} required /><span className="mt-1 block text-xs text-slate-500">Separate values with commas, spaces, or new lines. Maximum 100.</span></label><button className="btn-primary mt-5 w-full" disabled={busy === 'pincodes' || !zones.length}>{busy === 'pincodes' ? 'Mapping…' : 'Add pincodes'}</button></form>
    </div>
    <section className="mt-8">
      <div className="flex items-end justify-between"><div><p className="eyebrow">Current setup</p><h2 className="mt-2 font-display text-3xl font-bold">Configured zones</h2></div><button className="text-sm font-bold text-brand-700" onClick={() => void load()} disabled={loading}>Refresh</button></div>
      {loading ? <div className="panel mt-5 animate-pulse text-slate-500">Loading zones…</div> : zones.length ? <div className="mt-5 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => {
          const expanded = expandedZoneId === zone.id;
          const zonePincodes = pincodesByZone[zone.id];
          return <article className="panel" key={zone.id}>
            <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-100 font-display text-xl font-bold text-brand-700">{zone.name.charAt(0)}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{zone.pincodeCount} pincodes</span></div>
            <h3 className="mt-5 text-lg font-bold">{zone.name}</h3><p className="mt-1 text-xs text-slate-400">Created {new Date(zone.createdAt).toLocaleDateString()}</p>
            <button type="button" className="mt-5 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50" aria-expanded={expanded} aria-controls={`zone-pincodes-${zone.id}`} onClick={() => void expandZone(zone.id)}><span>{expanded ? 'Hide pincodes' : 'View pincodes'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
            {expanded && <div id={`zone-pincodes-${zone.id}`} className="mt-4 border-t border-slate-100 pt-4">
              {loadingZoneId === zone.id ? <p className="text-sm text-slate-500">Loading pincodes…</p> : zonePincodes?.length ? <ul className="space-y-2">{zonePincodes.map((item) => <li key={item.id}>
                {editing?.pincodeId === item.id ? <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50 p-3"><label><span className="input-label">Pincode value</span><input className="input" inputMode="numeric" pattern="[0-9]{4,10}" value={editing.pincode} onChange={(event) => setEditing({ ...editing, pincode: event.target.value })} /></label><label><span className="input-label">Move to zone</span><select className="input" value={editing.newZoneId} onChange={(event) => setEditing({ ...editing, newZoneId: event.target.value })}>{zones.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label><div className="flex gap-2"><button type="button" className="btn-primary min-h-9 flex-1 px-3 py-1.5" onClick={() => void savePincode()} disabled={busy === item.id || !/^\d{4,10}$/.test(editing.pincode)}>{busy === item.id ? 'Saving…' : 'Save'}</button><button type="button" className="btn-secondary min-h-9 px-3 py-1.5" onClick={() => setEditing(null)}>Cancel</button></div></div> : <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><span className="mr-auto font-mono text-xs font-bold text-slate-700">{item.pincode}</span><button type="button" className="text-xs font-bold text-brand-700 hover:underline" onClick={() => setEditing({ zoneId: zone.id, pincodeId: item.id, pincode: item.pincode, newZoneId: zone.id })}>Edit</button><button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => void removeMapping(zone, item)} disabled={busy === item.id}>{busy === item.id ? 'Removing…' : 'Remove'}</button></div>}
              </li>)}</ul> : <p className="text-sm text-slate-500">No pincodes assigned to this zone.</p>}
            </div>}
          </article>;
        })}
      </div> : <div className="panel mt-5 text-center text-slate-500">No zones configured.</div>}
    </section>
  </div>;
}
