import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleLinks = {
  customer: [
    { to: '/customer/orders', label: 'My orders' },
    { to: '/customer/orders/new', label: 'Create order' },
  ],
  agent: [{ to: '/agent', label: 'Assigned deliveries' }],
  admin: [
    { to: '/admin', label: 'Operations' },
    { to: '/admin/agents', label: 'Agents' },
    { to: '/admin/zones', label: 'Zones' },
    { to: '/admin/rate-cards', label: 'Rate cards' },
  ],
};

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="mr-auto flex items-center gap-2.5 font-bold text-ink">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-display text-lg text-white">L</span>
          <span>Last-Mile</span>
        </NavLink>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Primary navigation">
          {roleLinks[user.role].map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-white hover:text-ink'}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold leading-tight">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button type="button" className="btn-secondary min-h-9 px-3 py-1.5" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
      </div>
    </header>
  );
}
