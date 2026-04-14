import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Avatar, Spinner } from '../../components/Layout';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users/staff/list').then(r => setStaff(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  const workloadData = {
    labels: staff.slice(0, 8).map(s => s.name.split(' ')[0]),
    datasets: [{ label: 'Assigned', data: staff.slice(0, 8).map(s => s.metrics.assigned), backgroundColor: '#3b82f6', borderRadius: 4 }]
  };

  const workloadPie = {
    labels: ['Low (0-2)', 'Medium (3-5)', 'High (6+)'],
    datasets: [{
      data: [
        staff.filter(s => s.metrics.assigned <= 2).length,
        staff.filter(s => s.metrics.assigned >= 3 && s.metrics.assigned <= 5).length,
        staff.filter(s => s.metrics.assigned >= 6).length,
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0
    }]
  };

  const getWorkloadLabel = (n) => n <= 2 ? { label: 'Low', cls: 'bg-green-100 text-green-700' } : n <= 5 ? { label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' } : { label: 'High', cls: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-gray-500">{staff.length} staff members</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Workload Distribution</h3>
          <div className="h-48">
            <Bar data={workloadData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Workload Levels</h3>
          <div className="h-48">
            <Pie data={workloadPie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <input className="input max-w-xs" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="table-th">Staff Member</th>
                <th className="table-th">Department</th>
                <th className="table-th">Status</th>
                <th className="table-th">Assigned</th>
                <th className="table-th">Resolved (Week)</th>
                <th className="table-th">Total</th>
                <th className="table-th">SLA %</th>
                <th className="table-th">Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(s => {
                const wl = getWorkloadLabel(s.metrics.assigned);
                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} size="sm" />
                        <div>
                          <div className="font-medium text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-gray-500">{s.department || '—'}</td>
                    <td className="table-td">
                      <span className={`badge ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                    </td>
                    <td className="table-td font-semibold">{s.metrics.assigned}</td>
                    <td className="table-td text-green-600 font-semibold">{s.metrics.resolvedWeek}</td>
                    <td className="table-td">{s.metrics.total}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 w-16">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${s.metrics.sla}%` }} />
                        </div>
                        <span className="text-xs">{s.metrics.sla}%</span>
                      </div>
                    </td>
                    <td className="table-td"><span className={`badge ${wl.cls}`}>{wl.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
