import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

const icons = {
  dashboard: '📊', users: '👥', staff: '👨‍💼', incidents: '🎫', reports: '📈',
  audit: '📋', settings: '⚙️', profile: '👤', logout: '🚪', bell: '🔔',
  sun: '☀️', moon: '🌙', search: '🔍', close: '✕', menu: '☰'
};

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: icons.users },
  { to: '/admin/staff', label: 'Staff', icon: icons.staff },
  { to: '/admin/incidents', label: 'Incidents', icon: icons.incidents },
  { to: '/admin/reports', label: 'Reports', icon: icons.reports },
  { to: '/admin/audit', label: 'Audit Logs', icon: icons.audit },
  { to: '/admin/settings', label: 'Settings', icon: icons.settings },
  { to: '/admin/profile', label: 'Profile', icon: icons.profile },
];

const staffNav = [
  { to: '/staff', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/staff/incidents', label: 'My Incidents', icon: icons.incidents },
  { to: '/staff/performance', label: 'Performance', icon: icons.reports },
  { to: '/staff/profile', label: 'Profile', icon: icons.profile },
];

const userNav = [
  { to: '/user', label: 'Dashboard', icon: icons.dashboard, end: true },
  { to: '/user/incidents', label: 'My Incidents', icon: icons.incidents },
  { to: '/user/create', label: 'Create Incident', icon: '➕' },
  { to: '/user/profile', label: 'Profile', icon: icons.profile },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark];
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchRef = useRef(null);

  const nav = user?.role === 'ADMIN' ? adminNav : user?.role === 'STAFF' ? staffNav : userNav;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setShowNotifs(false); setShowProfile(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(searchQ)}`);
        setSearchResults(data);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {}
  }

  async function markAllRead() {
    await api.put('/notifications/read-all');
    setUnread(0);
    setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
  }

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const avatar = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const avatarColor = (name) => colors[(name?.charCodeAt(0) || 0) % colors.length];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">U</div>
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">UIMP</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase()} portal</div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {nav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
                onClick={() => setSidebarOpen(false)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className={`w-8 h-8 rounded-full ${avatarColor(user?.name)} flex items-center justify-center text-white text-xs font-bold`}>
                {avatar(user?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="sidebar-link sidebar-link-inactive w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <span>{icons.logout}</span><span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 z-20">
          <button className="lg:hidden btn-ghost p-2" onClick={() => setSidebarOpen(true)}>{icons.menu}</button>

          <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-1 max-w-xs">
            <span>{icons.search}</span>
            <span>Search...</span>
            <kbd className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setDark(!dark)} className="btn-ghost p-2 rounded-lg" title="Toggle dark mode">
              {dark ? icons.sun : icons.moon}
            </button>

            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }} className="btn-ghost p-2 rounded-lg relative">
                {icons.bell}
                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50">
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${!n.is_read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }} className={`w-8 h-8 rounded-full ${avatarColor(user?.name)} flex items-center justify-center text-white text-xs font-bold`}>
                {avatar(user?.name)}
              </button>
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-48 card shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-gray-500">{user?.role}</div>
                  </div>
                  <NavLink to={`/${user?.role?.toLowerCase()}/profile`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowProfile(false)}>
                    {icons.profile} Profile
                  </NavLink>
                  <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
                    {icons.logout} Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children || <Outlet />}
        </main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-400">{icons.search}</span>
              <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search incidents, users..." className="flex-1 bg-transparent outline-none text-sm" />
              <button onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-gray-600">{icons.close}</button>
            </div>
            {searchResults && (
              <div className="p-2 max-h-80 overflow-y-auto">
                {searchResults.incidents?.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Incidents</div>
                    {searchResults.incidents.map(i => (
                      <button key={i.id} onClick={() => { navigate(`/${user.role.toLowerCase()}/incidents/${i.id}`); setSearchOpen(false); setSearchQ(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                        <span className="text-xs font-mono text-gray-500">{i.number}</span>
                        <span className="text-sm flex-1 truncate">{i.title}</span>
                        <StatusBadge status={i.status} />
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.users?.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Users</div>
                    {searchResults.users.map(u => (
                      <button key={u.id} onClick={() => { navigate(`/admin/users/${u.id}`); setSearchOpen(false); setSearchQ(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                        <span className="text-sm">{u.name}</span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searchResults.incidents?.length && !searchResults.users?.length && (
                  <div className="p-4 text-center text-sm text-gray-500">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status?.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority }) {
  const map = {
    CRITICAL: 'bg-red-900 text-red-100',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    MEDIUM: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={`badge ${map[priority] || 'bg-gray-100 text-gray-600'}`}>{priority}</span>;
}

export function Avatar({ name, size = 'sm' }) {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-12 h-12 text-base';
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>{initials}</div>;
}

export function Spinner() {
  return <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />;
}

export function Modal({ title, onClose, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${sizes[size]} w-full`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, onConfirm, onClose, danger = true }) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>Confirm</button>
      </div>
    </Modal>
  );
}

export function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1 text-xs">‹ Prev</button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, pages - 4)) + i;
          return p <= pages ? (
            <button key={p} onClick={() => onPage(p)} className={`px-3 py-1 text-xs rounded-lg ${p === page ? 'bg-primary-600 text-white' : 'btn-secondary'}`}>{p}</button>
          ) : null;
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="btn-secondary px-3 py-1 text-xs">Next ›</button>
      </div>
    </div>
  );
}
