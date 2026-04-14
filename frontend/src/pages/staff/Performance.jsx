import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/Layout';

export default function StaffPerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const metrics = [
    { label: 'Total Assigned', value: stats?.total || 0, icon: '🎫' },
    { label: 'Resolved This Week', value: stats?.resolvedWeek || 0, icon: '✅' },
    { label: 'Currently Open', value: stats?.assigned || 0, icon: '🔴' },
    { label: 'SLA Compliance', value: `${stats?.sla || 0}%`, icon: '⏱️' },
  ];

  const statusData = {
    labels: stats?.statusDist?.map(s => s.status) || [],
    datasets: [{ label: 'Count', data: stats?.statusDist?.map(s => s.count) || [], backgroundColor: ['#ef4444', '#f59e0b', '#22c55e', '#6b7280'], borderRadius: 4 }]
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-sm text-gray-500">Your personal metrics and statistics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{m.label}</span>
              <span className="text-lg">{m.icon}</span>
            </div>
            <div className="text-2xl font-bold text-primary-600">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Incidents by Status</h3>
          <div className="h-48">
            <Bar data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Performance Summary</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Resolution Rate</span>
                <span className="font-medium">{stats?.total > 0 ? Math.round(((stats?.total - stats?.assigned) / stats?.total) * 100) : 0}%</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats?.total > 0 ? Math.round(((stats?.total - stats?.assigned) / stats?.total) * 100) : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>SLA Compliance</span>
                <span className="font-medium">{stats?.sla || 0}%</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats?.sla || 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
