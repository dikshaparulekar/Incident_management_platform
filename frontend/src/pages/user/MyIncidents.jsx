import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { StatusBadge, PriorityBadge, Pagination, Spinner } from '../../components/Layout';

export default function UserMyIncidents() {
  const [data, setData] = useState({ incidents: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25 });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data: d } = await api.get(`/incidents?${params}`);
      setData(d);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Incidents</h1>
          <p className="text-sm text-gray-500">{data.total} incidents submitted</p>
        </div>
        <button onClick={() => navigate('/user/create')} className="btn-primary">+ New Incident</button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="table-th">ID</th>
                <th className="table-th">Title</th>
                <th className="table-th">Status</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Assigned To</th>
                <th className="table-th">Created</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7} className="table-td"><div className="skeleton h-4 w-full" /></td></tr>
              )) : data.incidents.map(inc => (
                <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="table-td font-mono text-xs text-gray-500">{inc.number}</td>
                  <td className="table-td max-w-xs">
                    <button onClick={() => navigate(`/user/incidents/${inc.id}`)} className="font-medium hover:text-primary-600 text-left line-clamp-1">{inc.title}</button>
                  </td>
                  <td className="table-td"><StatusBadge status={inc.status} /></td>
                  <td className="table-td"><PriorityBadge priority={inc.priority} /></td>
                  <td className="table-td text-sm">{inc.assignee?.name || <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="table-td text-xs text-gray-500">{new Date(inc.created_at).toLocaleDateString()}</td>
                  <td className="table-td">
                    <button onClick={() => navigate(`/user/incidents/${inc.id}`)} className="btn-ghost text-xs px-2 py-1">View</button>
                  </td>
                </tr>
              ))}
              {!loading && !data.incidents.length && (
                <tr><td colSpan={7} className="table-td text-center text-gray-500 py-8">No incidents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={data.pages} total={data.total} limit={25} onPage={setPage} />
      </div>
    </div>
  );
}
