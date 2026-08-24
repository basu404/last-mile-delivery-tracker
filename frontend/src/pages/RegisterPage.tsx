import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getRoleHome, useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={getRoleHome(user.role)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const registered = await register({ ...form, phone: form.phone || undefined, role: 'customer' });
      navigate(getRoleHome(registered.role), { replace: true });
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <main className="min-h-screen bg-ink p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-canvas shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber font-display text-ink">L</span>Last-Mile</div>
          <div><p className="eyebrow text-amber">Customer account</p><h1 className="mt-4 font-display text-5xl leading-tight">Ship with the full picture.</h1><p className="mt-5 leading-7 text-emerald-100">See the price before confirming, follow every milestone, and reschedule failed deliveries without calling support.</p></div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-emerald-100"><span className="rounded-xl bg-white/10 p-3">Instant quotes</span><span className="rounded-xl bg-white/10 p-3">Live status</span><span className="rounded-xl bg-white/10 p-3">Clear charges</span></div>
        </section>
        <section className="flex items-center justify-center px-5 py-10 sm:px-12">
          <div className="w-full max-w-lg">
            <p className="eyebrow">Start shipping</p><h2 className="mt-3 font-display text-4xl font-bold">Create your account</h2><p className="mt-3 text-slate-600">Registration creates a customer account.</p>
            <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="input-label">Full name</span><input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} minLength={2} required /></label>
              <label className="block sm:col-span-2"><span className="input-label">Email address</span><input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
              <label className="block"><span className="input-label">Phone <span className="font-normal text-slate-400">(optional)</span></span><input className="input" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} minLength={7} /></label>
              <label className="block"><span className="input-label">Password</span><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={8} required /><span className="mt-1 block text-xs text-slate-500">At least 8 characters</span></label>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-2">{error}</p>}
              <button className="btn-primary sm:col-span-2" disabled={loading}>{loading ? 'Creating account…' : 'Create customer account'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link to="/login" className="font-bold text-brand-700 hover:underline">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
