import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORIES = ['Network', 'Hardware', 'Software', 'Security', 'Access', 'Performance', 'Database', 'General'];

export default function CreateIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'General' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setLoading(true);
    try {
      const { data } = await api.post('/incidents', form);
      toast.success(`Incident ${data.number} created successfully`);
      navigate(`/user/incidents/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create incident');
    } finally { setLoading(false); }
  };

  const priorityColors = { LOW: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20', MEDIUM: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20', HIGH: 'border-red-400 bg-red-50 dark:bg-red-900/20', CRITICAL: 'border-red-700 bg-red-100 dark:bg-red-900/30' };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
        <h1 className="text-2xl font-bold">Create Incident</h1>
        <p className="text-sm text-gray-500">Describe the issue you're experiencing</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Title <span className="text-red-500">*</span></label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of the issue" required />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[120px]" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Provide as much detail as possible: what happened, when it started, steps to reproduce..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map(p => (
                <button key={p} type="button" onClick={() => set('priority', p)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${form.priority === p ? priorityColors[p] + ' border-current' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* File attachment area (UI only) */}
        <div>
          <label className="label">Attachments (optional)</label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); toast.success('File attachment coming soon'); }}>
            <div className="text-3xl mb-2">📎</div>
            <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Max 10MB per file</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary px-6">
            {loading ? 'Creating...' : 'Submit Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}
