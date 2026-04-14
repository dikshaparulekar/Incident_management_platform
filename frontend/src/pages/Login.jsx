import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

function PasswordStrength({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  if (!password) return null;
  return (
    <div className="mt-1">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : 'bg-gray-200 dark:bg-gray-600'}`} />)}
      </div>
      <span className="text-xs text-gray-500">{labels[score]}</span>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [forgotEmail, setForgotEmail] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(`/${user.role.toLowerCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { default: api } = await import('../api/client');
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Account created!');
      navigate('/user');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    toast.success(`Password reset link sent to ${forgotEmail} (mock)`);
    setShowForgot(false);
  };

  const demoCredentials = [
    { label: 'Admin', email: 'admin@uimp.com', password: 'admin123', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Staff', email: 'staff1@uimp.com', password: 'staff123', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'User', email: 'user1@uimp.com', password: 'user123', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">UIMP</h1>
          <p className="text-primary-200 mt-1">Unified Incident Management Platform</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary-600 hover:underline">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? '...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" className="input" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
                  <PasswordStrength password={form.password} />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" className="input" placeholder="••••••••" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? '...' : 'Create Account'}
                </button>
              </form>
            )}

            {/* Demo credentials */}
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 text-center mb-3">Demo credentials</p>
              <div className="flex gap-2">
                {demoCredentials.map(c => (
                  <button key={c.label} onClick={() => { setForm(f => ({ ...f, email: c.email, password: c.password })); setTab('login'); }}
                    className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium ${c.color} transition-opacity hover:opacity-80`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold mb-4">Reset Password</h3>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForgot(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Send Reset Link</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
