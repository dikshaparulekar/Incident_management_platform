import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Avatar, Pagination, Spinner } from '../../components/Layout';

export default function Audit() {
  const [data, setData] = useState({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actions, setActions] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { api.get('/audit/actions').then(r => setActions(r.data)).catch(() => {}); }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      const { data: d } = await api.get(`/audit?${params}`);
      setData(d);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, search, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, actionFilter]);

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Entity', 'Details', 'IP'];
    const rows = data.logs.map(l => [l.id, l.created_at, l.user_name || 'System', l.action, `${l.entity_type}:${l.entity_id}`, `"${l.details || ''}"`, l.ip]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'audit-logs.csv'; a.click();
  };

  const actionColors = {
    CREATED_INCIDENT: 'bg-green-100 text-green-700', UPDATED_STATUS: 'bg-blue-100 text-blue-700',
    ASSIGNED_INCIDENT: 'bg-purple-100 text-purple-700', ADDED_COMMENT: 'bg-gray-100 text-gray-700',
    RESOLVED_INCIDENT: 'bg-green-100 text-green-700', DELETED_INCIDENT: 'bg-red-100 text-red-700',
    LOGGED_IN: 'bg-teal-100 text-teal-700', LOGGED_OUT: 'bg-orange-100 text-orange-700',
    CREATED_USER: 'bg-blue-100 text-blue-700', DELETED_USER: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-gray-500">{data.total} total entries</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary">Export CSV</button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-48" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32"><Spinner /></div> : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <div className="flex items-start gap-3">
                  <Avatar name={log.user_name || 'System'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{log.user_name || 'System'}</span>
                      <span className={`badge text-xs ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>{log.action.replace(/_/g, ' ')}</span>
                      {log.entity_type && <span className="text-xs text-gray-500">{log.entity_type} #{log.entity_id}</span>}
                      <span className="text-xs text-gray-400 ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{log.details}</p>
                    {(log.old_value || log.new_value) && (
                      <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs text-primary-600 mt-1 hover:underline">
                        {expanded === log.id ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                    {expanded === log.id && (
                      <div className="mt-2 flex items-center gap-2">
                        {log.old_value && <span className="badge bg-red-100 text-red-700 text-xs">Before: {log.old_value}</span>}
                        {log.new_value && <><span className="text-gray-400">→</span><span className="badge bg-green-100 text-green-700 text-xs">After: {log.new_value}</span></>}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{log.ip}</div>
                </div>
              </div>
            ))}
            {!data.logs.length && <div className="p-8 text-center text-gray-500">No audit logs found</div>}
          </div>
        )}
        <Pagination page={page} pages={data.pages} total={data.total} limit={50} onPage={setPage} />
      </div>
    </div>
  );
}
