import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Avatar, Spinner } from '../components/Layout';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', department: user?.department || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tokens, setTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (tab === 'tokens') api.get('/settings/tokens').then(r => setTokens(r.data)).catch(() => {});
  }, [tab]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const createToken = async () => {
    if (!newTokenName) return toast.error('Enter token name');
    try {
      const { data } = await api.post('/settings/tokens', { name: newTokenName });
      setTokens(t => [...t, data]);
      setNewToken(data.token);
      setNewTokenName('');
      toast.success('Token created');
    } catch { toast.error('Failed'); }
  };

  const revokeToken = async (id) => {
    try {
      await api.delete(`/settings/tokens/${id}`);
      setTokens(t => t.filter(x => x.id !== id));
      toast.success('Token revoked');
    } catch { toast.error('Failed'); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    { id: 'tokens', label: 'API Tokens' },
    { id: '2fa', label: '2FA' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* User card */}
      <div className="card p-5 flex items-center gap-4">
        <Avatar name={user?.name} size="lg" />
        <div>
          <div className="font-semibold text-lg">{user?.name}</div>
          <div className="text-sm text-gray-500">{user?.email}</div>
          <span className={`badge mt-1 ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : user?.role === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{user?.role}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {tab === 'profile' && (
          <form onSubmit={saveProfile} className="space-y-4">
            <h2 className="font-semibold">Personal Information</h2>
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={user?.email} disabled className="input opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0000" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : 'Save Changes'}</button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={changePassword} className="space-y-4">
            <h2 className="font-semibold">Change Password</h2>
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : 'Change Password'}</button>
          </form>
        )}

        {tab === 'tokens' && (
          <div className="space-y-4">
            <h2 className="font-semibold">API Tokens</h2>
            {newToken && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Token created — copy it now, it won't be shown again:</p>
                <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border break-all">{newToken}</code>
                <button onClick={() => { navigator.clipboard.writeText(newToken); toast.success('Copied!'); }} className="ml-2 text-xs text-primary-600 hover:underline">Copy</button>
              </div>
            )}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Token name..." value={newTokenName} onChange={e => setNewTokenName(e.target.value)} />
              <button onClick={createToken} className="btn-primary">Generate</button>
            </div>
            <div className="space-y-2">
              {tokens.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">Created {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => revokeToken(t.id)} className="btn-ghost text-xs text-red-600 hover:bg-red-50">Revoke</button>
                </div>
              ))}
              {!tokens.length && <p className="text-sm text-gray-500">No API tokens yet.</p>}
            </div>
          </div>
        )}

        {tab === '2fa' && (
          <div className="space-y-4">
            <h2 className="font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account.</p>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
              <div className="w-32 h-32 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-0.5 p-2">
                  {Array(25).fill(0).map((_, i) => (
                    <div key={i} className={`w-4 h-4 ${Math.random() > 0.5 ? 'bg-gray-900 dark:bg-white' : 'bg-white dark:bg-gray-900'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">Scan with your authenticator app</p>
              <p className="text-xs font-mono bg-white dark:bg-gray-800 px-3 py-1.5 rounded border inline-block">JBSWY3DPEHPK3PXP</p>
            </div>
            <button onClick={() => toast.success('2FA enabled (mock)')} className="btn-primary">Enable 2FA</button>
          </div>
        )}
      </div>
    </div>
  );
}
