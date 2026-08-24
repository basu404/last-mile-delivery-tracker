import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getRoleHome, useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={getRoleHome(user.role)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(requested ?? getRoleHome(loggedInUser.role), { replace: true });
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-ink lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full border-[70px] border-brand-500/20" />
        <div className="relative flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber font-display text-ink">L</span>Last-Mile</div>
        <div className="relative max-w-xl">
          <p className="eyebrow text-amber">Last mile, clearly managed</p>
          <h1 className="mt-5 font-display text-5xl leading-tight">Every delivery has a next move.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-100">Quote accurately, dispatch intelligently, and keep every handoff visible from pickup to doorstep.</p>
        </div>
        <p className="relative text-sm text-emerald-200">One operational view for customers, agents, and administrators.</p>
      </section>
      <section className="flex items-center justify-center bg-canvas px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-brand-600 font-display text-white">D</span></div>
          <p className="eyebrow">Welcome back</p>
          <h2 className="mt-3 font-display text-4xl font-bold">Sign in to continue</h2>
          <p className="mt-3 text-slate-600">Use the account credentials assigned to your role.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block"><span className="input-label">Email address</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="block"><span className="input-label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">New customer? <Link to="/register" className="font-bold text-brand-700 hover:underline">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
