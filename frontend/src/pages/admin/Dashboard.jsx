import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import api from '../../api/client';
import { Spinner, StatusBadge, PriorityBadge, Avatar } from '../../components/Layout';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title);

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!stats) return null;

  const statusColors = { OPEN: '#ef4444', IN_PROGRESS: '#f59e0b', RESOLVED: '#22c55e', CLOSED: '#6b7280' };
  const priorityColors = { CRITICAL: '#7f1d1d', HIGH: '#ef4444', MEDIUM: '#f97316', LOW: '#3b82f6' };

  const statusData = {
    labels: stats.statusDist.map(s => s.status),
    datasets: [{ data: stats.statusDist.map(s => s.count), backgroundColor: stats.statusDist.map(s => statusColors[s.status] || '#6b7280'), borderWidth: 0 }]
  };

  const priorityData = {
    labels: stats.priorityDist.map(p => p.priority),
    datasets: [{ label: 'Incidents', data: stats.priorityDist.map(p => p.count), backgroundColor: stats.priorityDist.map(p => priorityColors[p.priority] || '#6b7280'), borderRadius: 6 }]
  };

  const trendData = {
    labels: stats.trend.map(t => t.date),
    datasets: [{ label: 'Incidents', data: stats.trend.map(t => t.count), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 }]
  };

  const staffPerfData = {
    labels: stats.staffPerf.slice(0, 8).map(s => s.name.split(' ')[0]),
    datasets: [
      { label: 'Resolved', data: stats.staffPerf.slice(0, 8).map(s => s.resolved), backgroundColor: '#22c55e', borderRadius: 4 },
      { label: 'Open', data: stats.staffPerf.slice(0, 8).map(s => s.open), backgroundColor: '#ef4444', borderRadius: 4 },
    ]
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', link: '/admin/users' },
    { label: 'Total Staff', value: stats.totalStaff, icon: '👨‍💼', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', link: '/admin/staff' },
    { label: 'Total Incidents', value: stats.totalIncidents, icon: '🎫', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', link: '/admin/incidents' },
    { label: 'Open Incidents', value: stats.openIncidents, icon: '🔴', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', link: '/admin/incidents?status=OPEN' },
    { label: 'In Progress', value: stats.inProgress, icon: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', link: '/admin/incidents?status=IN_PROGRESS' },
    { label: 'Resolved Today', value: stats.resolvedToday, icon: '✅', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', link: '/admin/incidents?status=RESOLVED' },
    { label: 'High Priority', value: stats.highPriority, icon: '⚠️', color: 'text-red-700', bg: 'bg-red-50 dark:bg-red-900/20', link: '/admin/incidents?priority=CRITICAL,HIGH' },
    { label: 'System Health', value: '100%', icon: '💚', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} onClick={() => card.link && navigate(card.link)}
            className={`card p-4 ${card.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center text-sm`}>{card.icon}</div>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Status Distribution</h3>
          <div className="h-48"><Pie data={statusData} options={chartOpts} /></div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Priority Distribution</h3>
          <div className="h-48"><Bar data={priorityData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">30-Day Trend</h3>
          <div className="h-48"><Line data={trendData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} /></div>
        </div>
      </div>

      {/* Charts Row 2 + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Staff Performance</h3>
          <div className="h-56"><Bar data={staffPerfData} options={chartOpts} /></div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {stats.activity.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar name={a.user_name || 'System'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    <span className="font-medium">{a.user_name || 'System'}</span> {a.details}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
