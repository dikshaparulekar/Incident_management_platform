import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PriorityBadge, Avatar, ConfirmModal, Spinner } from '../components/Layout';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function ActivityItem({ item }) {
  const actionIcons = {
    CREATED_INCIDENT: '🆕', UPDATED_STATUS: '🔄', ASSIGNED_INCIDENT: '👤',
    ADDED_COMMENT: '💬', RESOLVED_INCIDENT: '✅', CLOSED_INCIDENT: '🔒',
    UPDATED_PRIORITY: '⚡', LOGGED_IN: '🔑', DELETED_INCIDENT: '🗑️'
  };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
          {actionIcons[item.action] || '📝'}
        </div>
        <div className="w-0.5 bg-gray-200 dark:bg-gray-700 flex-1 mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{item.user_name || 'System'}</span>
          <span className="text-sm text-gray-500">{item.details}</span>
        </div>
        {item.old_value && item.new_value && (
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-red-100 text-red-700 text-xs">{item.old_value}</span>
            <span className="text-gray-400">→</span>
            <span className="badge bg-green-100 text-green-700 text-xs">{item.new_value}</span>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [editComment, setEditComment] = useState(null);
  const [editText, setEditText] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const canEdit = isAdmin || (isStaff && incident?.assigned_to === user?.id);

  useEffect(() => {
    fetchIncident();
    if (isAdmin) api.get('/users/staff/list').then(r => setStaffList(r.data)).catch(() => {});
  }, [id]);

  async function fetchIncident() {
    try {
      const { data } = await api.get(`/incidents/${id}`);
      setIncident(data);
    } catch (err) {
      toast.error('Failed to load incident');
      navigate(-1);
    } finally { setLoading(false); }
  }

  async function updateField(field, value) {
    try {
      const { data } = await api.put(`/incidents/${id}`, { [field]: value });
      setIncident(prev => ({ ...prev, ...data, comments: prev.comments, activity: prev.activity, watchers: prev.watchers }));
      toast.success('Updated');
      fetchIncident();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/incidents/${id}/comments`, { text: comment });
      setIncident(prev => ({ ...prev, comments: [...prev.comments, data] }));
      setComment('');
      toast.success('Comment added');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  }

  async function deleteComment(cid) {
    try {
      await api.delete(`/incidents/${id}/comments/${cid}`);
      setIncident(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== cid) }));
      toast.success('Comment deleted');
    } catch { toast.error('Failed'); }
  }

  async function saveEditComment() {
    try {
      const { data } = await api.put(`/incidents/${id}/comments/${editComment}`, { text: editText });
      setIncident(prev => ({ ...prev, comments: prev.comments.map(c => c.id === editComment ? data : c) }));
      setEditComment(null);
      toast.success('Updated');
    } catch { toast.error('Failed'); }
  }

  async function toggleWatch() {
    const watching = incident.watchers?.some(w => w.id === user.id);
    if (watching) {
      await api.delete(`/incidents/${id}/watchers`);
    } else {
      await api.post(`/incidents/${id}/watchers`);
    }
    fetchIncident();
  }

  async function handleDelete() {
    try {
      await api.delete(`/incidents/${id}`);
      toast.success('Incident deleted');
      navigate(-1);
    } catch { toast.error('Failed'); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!incident) return null;

  const watching = incident.watchers?.some(w => w.id === user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-mono text-gray-500">{incident.number}</span>
          </div>
          <h1 className="text-xl font-bold">{incident.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleWatch} className={`btn-secondary text-xs ${watching ? 'bg-primary-50 text-primary-600' : ''}`}>
            {watching ? '👁 Watching' : '👁 Watch'}
          </button>
          {isAdmin && <button onClick={() => setShowDelete(true)} className="btn-danger text-xs">Delete</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Description</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{incident.description || 'No description provided.'}</p>
          </div>

          {/* Activity Timeline */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4">Activity Timeline</h3>
            <div className="space-y-0">
              {incident.activity?.map(a => <ActivityItem key={a.id} item={a} />)}
              {!incident.activity?.length && <p className="text-sm text-gray-500">No activity yet.</p>}
            </div>
          </div>

          {/* Comments */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4">Comments ({incident.comments?.length || 0})</h3>
            <div className="space-y-4 mb-4">
              {incident.comments?.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.user_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.user_name}</span>
                      <span className={`badge text-xs ${c.user_role === 'STAFF' ? 'bg-blue-100 text-blue-700' : c.user_role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{c.user_role}</span>
                      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    {editComment === c.id ? (
                      <div className="space-y-2">
                        <textarea className="input text-sm" value={editText} onChange={e => setEditText(e.target.value)} rows={3} />
                        <div className="flex gap-2">
                          <button onClick={saveEditComment} className="btn-primary text-xs px-3 py-1">Save</button>
                          <button onClick={() => setEditComment(null)} className="btn-secondary text-xs px-3 py-1">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.text}</p>
                        {(c.user_id === user.id || isAdmin) && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setEditComment(c.id); setEditText(c.text); }} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                            <button onClick={() => deleteComment(c.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex gap-3">
              <Avatar name={user.name} size="sm" />
              <div className="flex-1">
                <textarea className="input text-sm" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment... Use @name to mention" rows={3} />
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={submitting || !comment.trim()} className="btn-primary text-xs px-4 py-1.5">
                    {submitting ? '...' : 'Comment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div>
              <label className="label">Status</label>
              {canEdit ? (
                <select className="input" value={incident.status} onChange={e => updateField('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              ) : <StatusBadge status={incident.status} />}
            </div>
            <div>
              <label className="label">Priority</label>
              {canEdit ? (
                <select className="input" value={incident.priority} onChange={e => updateField('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              ) : <PriorityBadge priority={incident.priority} />}
            </div>
            {isAdmin && (
              <div>
                <label className="label">Assigned To</label>
                <select className="input" value={incident.assigned_to || ''} onChange={e => updateField('assigned_to', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Category</label>
              <span className="text-sm">{incident.category}</span>
            </div>
            <div>
              <label className="label">Created By</label>
              {incident.creator && (
                <div className="flex items-center gap-2">
                  <Avatar name={incident.creator.name} size="sm" />
                  <span className="text-sm">{incident.creator.name}</span>
                </div>
              )}
            </div>
            <div>
              <label className="label">Created</label>
              <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(incident.created_at).toLocaleString()}</span>
            </div>
            <div>
              <label className="label">Updated</label>
              <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(incident.updated_at).toLocaleString()}</span>
            </div>
            {incident.resolved_at && (
              <div>
                <label className="label">Resolved</label>
                <span className="text-sm text-green-600">{new Date(incident.resolved_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Watchers */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">Watchers ({incident.watchers?.length || 0})</h3>
            <div className="flex flex-wrap gap-2">
              {incident.watchers?.map(w => (
                <div key={w.id} className="flex items-center gap-1.5" title={w.name}>
                  <Avatar name={w.name} size="sm" />
                  <span className="text-xs">{w.name.split(' ')[0]}</span>
                </div>
              ))}
              {!incident.watchers?.length && <p className="text-xs text-gray-500">No watchers</p>}
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <ConfirmModal title="Delete Incident" message={`Delete ${incident.number}? This cannot be undone.`}
          onConfirm={handleDelete} onClose={() => setShowDelete(false)} />
      )}
    </div>
  );
}
