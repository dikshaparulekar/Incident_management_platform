import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { StatusBadge, PriorityBadge, Spinner } from '../../components/Layout';

export default function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const cards = [
    { label: 'Total Incidents', value: stats?.myTotal || 0, icon: '🎫', color: 'text-blue-600', link: '/user/incidents' },
    { label: 'Open', value: stats?.myOpen || 0, icon: '🔴', color: 'text-red-600', link: '/user/incidents?status=OPEN' },
    { label: 'Resolved', value: stats?.myResolved || 0, icon: '✅', color: 'text-green-600', link: '/user/incidents?status=RESOLVED' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-gray-500">Track your submitted incidents</p>
        </div>
        <button onClick={() => navigate('/user/create')} className="btn-primary">+ New Incident</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} onClick={() => c.link && navigate(c.link)} className="card p-5 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{c.label}</span>
              <span className="text-2xl">{c.icon}</span>
            </div>
            <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Incidents</h3>
          <button onClick={() => navigate('/user/incidents')} className="text-sm text-primary-600 hover:underline">View all</button>
        </div>
        <div className="space-y-3">
          {stats?.recent?.map(inc => (
            <div key={inc.id} onClick={() => navigate(`/user/incidents/${inc.id}`)} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer border border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-gray-500">{inc.number}</span>
                  <PriorityBadge priority={inc.priority} />
                </div>
                <div className="text-sm font-medium truncate">{inc.title}</div>
                <div className="text-xs text-gray-400">{new Date(inc.created_at).toLocaleDateString()}</div>
              </div>
              <StatusBadge status={inc.status} />
            </div>
          ))}
          {!stats?.recent?.length && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎫</div>
              <p className="text-gray-500 text-sm">No incidents yet</p>
              <button onClick={() => navigate('/user/create')} className="btn-primary mt-3 text-sm">Create your first incident</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
