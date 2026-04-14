import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import api from '../../api/client';
import { StatusBadge, PriorityBadge, Spinner } from '../../components/Layout';

export default function StaffDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!stats) return null;

  const statusData = {
    labels: stats.statusDist.map(s => s.status),
    datasets: [{ label: 'Incidents', data: stats.statusDist.map(s => s.count), backgroundColor: ['#ef4444', '#f59e0b', '#22c55e', '#6b7280'], borderRadius: 4 }]
  };

  const cards = [
    { label: 'Assigned to Me', value: stats.assigned, icon: '🎫', color: 'text-blue-600', link: '/staff/incidents' },
    { label: 'Resolved This Week', value: stats.resolvedWeek, icon: '✅', color: 'text-green-600' },
    { label: 'Total Assigned', value: stats.total, icon: '📊', color: 'text-purple-600' },
    { label: 'SLA Compliance', value: `${stats.sla}%`, icon: '⏱️', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-sm text-gray-500">Your assigned incidents and performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} onClick={() => c.link && navigate(c.link)} className={`card p-4 ${c.link ? 'cursor-pointer hover:shadow-md' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{c.label}</span>
              <span className="text-lg">{c.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">My Incidents by Status</h3>
          <div className="h-48">
            <Bar data={statusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Recent Incidents</h3>
          <div className="space-y-2">
            {stats.recent?.map(inc => (
              <div key={inc.id} onClick={() => navigate(`/staff/incidents/${inc.id}`)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-500">{inc.number}</div>
                  <div className="text-sm font-medium truncate">{inc.title}</div>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
            {!stats.recent?.length && <p className="text-sm text-gray-500">No recent incidents</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
