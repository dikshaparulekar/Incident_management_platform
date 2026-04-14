import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/Layout';

const TABS = ['General', 'Authentication', 'Incidents', 'Notifications', 'Security', 'Storage', 'Backup'];

export default function Settings() {
  const [tab, setTab] = useState('General');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await api.put('/settings', settings); toast.success('Settings saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const Field = ({ label, k, type = 'text', options }) => (
    <div>
      <label className="label">{label}</label>
      {options ? (
        <select className="input" value={settings[k] || ''} onChange={e => set(k, e.target.value)}>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`relative w-10 h-5 rounded-full transition-colors ${settings[k] === 'true' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            onClick={() => set(k, settings[k] === 'true' ? 'false' : 'true')}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[k] === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm">{settings[k] === 'true' ? 'Enabled' : 'Disabled'}</span>
        </label>
      ) : (
        <input type={type} className="input" value={settings[k] || ''} onChange={e => set(k, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? '...' : 'Save Changes'}</button>
      </div>

      <div className="flex gap-4">
        {/* Tab list */}
        <div className="w-48 flex-shrink-0">
          <div className="card p-2 space-y-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 card p-6">
          {tab === 'General' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">General Settings</h2>
              <Field label="System Name" k="system_name" />
              <Field label="Timezone" k="timezone" options={['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']} />
              <Field label="Date Format" k="date_format" options={['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']} />
            </div>
          )}
          {tab === 'Authentication' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Authentication Settings</h2>
              <Field label="Session Timeout (minutes)" k="session_timeout" type="number" />
              <Field label="User Registration" k="registration_enabled" type="toggle" />
              <Field label="Require 2FA" k="2fa_required" type="toggle" />
            </div>
          )}
          {tab === 'Incidents' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Incident Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SLA Critical (hours)" k="sla_critical" type="number" />
                <Field label="SLA High (hours)" k="sla_high" type="number" />
                <Field label="SLA Medium (hours)" k="sla_medium" type="number" />
                <Field label="SLA Low (hours)" k="sla_low" type="number" />
              </div>
              <div>
                <label className="label">Status Workflow</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s, i, arr) => (
                    <React.Fragment key={s}>
                      <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{s}</span>
                      {i < arr.length - 1 && <span className="text-gray-400">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === 'Notifications' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Notification Settings</h2>
              <div>
                <label className="label">Webhook URL</label>
                <input className="input" placeholder="https://hooks.example.com/..." value={settings.webhook_url || ''} onChange={e => set('webhook_url', e.target.value)} />
              </div>
              <div>
                <label className="label">Email Template (Incident Created)</label>
                <textarea className="input min-h-[100px]" value={settings.email_template || 'New incident {{number}} has been created: {{title}}'} onChange={e => set('email_template', e.target.value)} />
              </div>
            </div>
          )}
          {tab === 'Security' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Security Settings</h2>
              <div>
                <label className="label">IP Whitelist (comma-separated)</label>
                <input className="input" placeholder="192.168.1.0/24, 10.0.0.1" value={settings.ip_whitelist || ''} onChange={e => set('ip_whitelist', e.target.value)} />
              </div>
              <div>
                <label className="label">Rate Limit (requests/minute)</label>
                <input type="number" className="input" value={settings.rate_limit || '100'} onChange={e => set('rate_limit', e.target.value)} />
              </div>
              <div>
                <label className="label">CORS Origins</label>
                <input className="input" placeholder="https://app.example.com" value={settings.cors_origins || ''} onChange={e => set('cors_origins', e.target.value)} />
              </div>
            </div>
          )}
          {tab === 'Storage' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Storage Settings</h2>
              <Field label="Max File Size (MB)" k="max_file_size" type="number" />
              <Field label="Allowed File Types" k="allowed_file_types" />
              <div>
                <label className="label">Storage Location</label>
                <select className="input" value={settings.storage_location || 'local'} onChange={e => set('storage_location', e.target.value)}>
                  <option value="local">Local Storage</option>
                  <option value="s3">Amazon S3</option>
                  <option value="gcs">Google Cloud Storage</option>
                </select>
              </div>
            </div>
          )}
          {tab === 'Backup' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-semibold">Backup Settings</h2>
              <Field label="Auto Backup Schedule" k="backup_schedule" options={['disabled', 'daily', 'weekly', 'monthly']} />
              <div className="flex gap-3">
                <button onClick={() => toast.success('Backup started (mock)')} className="btn-primary">Create Backup Now</button>
                <button onClick={() => toast.success('Restore initiated (mock)')} className="btn-secondary">Restore from Backup</button>
              </div>
              <div className="card p-4 bg-gray-50 dark:bg-gray-700/30">
                <p className="text-sm text-gray-600 dark:text-gray-400">Last backup: Never (configure schedule above)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
