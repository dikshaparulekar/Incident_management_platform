import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { StatusBadge, PriorityBadge, Avatar, Modal, ConfirmModal, Pagination, Spinner } from '../../components/Layout';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Network', 'Hardware', 'Software', 'Security', 'Access', 'Performance', 'Database', 'General'];

function IncidentForm({ initial, onSave, onClose, staffList }) {
  const [form, setForm] = useState(initial || { title: '', description: '', priority: 'MEDIUM', category: 'General', assigned_to: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?.id) {
        const { data } = await api.put(`/incidents/${initial.id}`, form);
        onSave(data); toast.success('Incident updated');
      } else {
        const { data } = await api.post('/incidents', form);
        onSave(data); toast.success('Incident created');
      }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Brief description of the issue" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[100px]" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {initial?.id && (
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Assign To</label>
          <select className="input" value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value || null)}>
            <option value="">Unassigned</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : initial?.id ? 'Update' : 'Create Incident'}</button>
      </div>
    </form>
  );
}

function KanbanView({ incidents, onUpdate }) {
  const cols = STATUSES.map(s => ({ status: s, items: incidents.filter(i => i.status === s) }));

  const handleDrop = async (e, status) => {
    const id = e.dataTransfer.getData('incidentId');
    if (!id) return;
    try {
      await api.put(`/incidents/${id}`, { status });
      onUpdate();
      toast.success(`Moved to ${status}`);
    } catch { toast.error('Failed to update'); }
  };

  const statusColors = { OPEN: 'border-red-400', IN_PROGRESS: 'border-yellow-400', RESOLVED: 'border-green-400', CLOSED: 'border-gray-400' };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cols.map(col => (
        <div key={col.status} className={`bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border-t-4 ${statusColors[col.status]}`}
          onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.status)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{col.status.replace('_', ' ')}</span>
            <span className="badge bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{col.items.length}</span>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {col.items.map(inc => (
              <div key={inc.id} draggable onDragStart={e => e.dataTransfer.setData('incidentId', inc.id)}
                className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <div className="text-xs text-gray-500 mb-1">{inc.number}</div>
                <div className="text-sm font-medium line-clamp-2">{inc.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <PriorityBadge priority={inc.priority} />
                  {inc.assignee && <Avatar name={inc.assignee.name} size="sm" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Incidents() {
  const [data, setData] = useState({ incidents: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [view, setView] = useState('table');
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [editInc, setEditInc] = useState(null);
  const [deleteInc, setDeleteInc] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const s = searchParams.get('status');
    const p = searchParams.get('priority');
    if (s) setStatusFilter(s.split(',')[0]);
    if (p) setPriorityFilter(p.split(',')[0]);
  }, []);

  useEffect(() => {
    api.get('/users/staff/list').then(r => setStaffList(r.data)).catch(() => {});
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const { data: d } = await api.get(`/incidents?${params}`);
      setData(d);
    } catch { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  const handleDelete = async () => {
    try { await api.delete(`/incidents/${deleteInc.id}`); toast.success('Deleted'); setModal(null); fetchIncidents(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleBulk = async () => {
    if (!bulkAction) return toast.error('Select an action');
    try {
      await api.post('/incidents/bulk', { ids: selected, action: bulkAction, value: bulkValue });
      toast.success('Applied'); setSelected([]); setModal(null); fetchIncidents();
    } catch { toast.error('Failed'); }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Number', 'Title', 'Status', 'Priority', 'Created By', 'Assigned To', 'Created At'];
    const rows = data.incidents.map(i => [i.id, i.number, `"${i.title}"`, i.status, i.priority, i.creator?.name || '', i.assignee?.name || '', i.created_at]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'incidents.csv'; a.click();
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === data.incidents.length ? [] : data.incidents.map(i => i.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-sm text-gray-500">{data.total} total incidents</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ Create Incident</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-40" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          {selected.length > 0 && <button onClick={() => setModal('bulk')} className="btn-secondary">{selected.length} selected ▾</button>}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {['table', 'kanban'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize ${view === v ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{v}</button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-secondary">Export CSV</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView incidents={data.incidents} onUpdate={fetchIncidents} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-th w-10"><input type="checkbox" checked={selected.length === data.incidents.length && data.incidents.length > 0} onChange={toggleAll} className="rounded" /></th>
                  <th className="table-th">ID</th>
                  <th className="table-th">Title</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Priority</th>
                  <th className="table-th">Created By</th>
                  <th className="table-th">Assigned To</th>
                  <th className="table-th">Created</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="table-td"><div className="skeleton h-4 w-full" /></td></tr>
                )) : data.incidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="table-td"><input type="checkbox" checked={selected.includes(inc.id)} onChange={() => toggleSelect(inc.id)} className="rounded" /></td>
                    <td className="table-td font-mono text-xs text-gray-500">{inc.number}</td>
                    <td className="table-td max-w-xs">
                      <button onClick={() => navigate(`/admin/incidents/${inc.id}`)} className="font-medium hover:text-primary-600 text-left line-clamp-1">{inc.title}</button>
                    </td>
                    <td className="table-td"><StatusBadge status={inc.status} /></td>
                    <td className="table-td"><PriorityBadge priority={inc.priority} /></td>
                    <td className="table-td">
                      {inc.creator && <div className="flex items-center gap-1.5"><Avatar name={inc.creator.name} size="sm" /><span className="text-xs">{inc.creator.name}</span></div>}
                    </td>
                    <td className="table-td">
                      {inc.assignee ? <div className="flex items-center gap-1.5"><Avatar name={inc.assignee.name} size="sm" /><span className="text-xs">{inc.assignee.name}</span></div> : <span className="text-xs text-gray-400">Unassigned</span>}
                    </td>
                    <td className="table-td text-xs text-gray-500">{new Date(inc.created_at).toLocaleDateString()}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditInc(inc); setModal('edit'); }} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                        <button onClick={() => { setDeleteInc(inc); setModal('delete'); }} className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} total={data.total} limit={25} onPage={setPage} />
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Create Incident" onClose={() => setModal(null)} size="lg">
          <IncidentForm staffList={staffList} onSave={() => fetchIncidents()} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editInc && (
        <Modal title="Edit Incident" onClose={() => setModal(null)} size="lg">
          <IncidentForm initial={editInc} staffList={staffList} onSave={() => fetchIncidents()} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'delete' && deleteInc && (
        <ConfirmModal title="Delete Incident" message={`Delete ${deleteInc.number}? This cannot be undone.`} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
      {modal === 'bulk' && (
        <Modal title="Bulk Actions" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selected.length} incidents selected</p>
            <div>
              <label className="label">Action</label>
              <select className="input" value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                <option value="">Select...</option>
                <option value="status">Change Status</option>
                <option value="priority">Change Priority</option>
                <option value="assign">Assign to Staff</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            {bulkAction === 'status' && <div><label className="label">Status</label><select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>}
            {bulkAction === 'priority' && <div><label className="label">Priority</label><select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>}
            {bulkAction === 'assign' && <div><label className="label">Staff</label><select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}><option value="">Unassigned</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleBulk} className={bulkAction === 'delete' ? 'btn-danger' : 'btn-primary'}>Apply</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
