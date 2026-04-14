import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Avatar, StatusBadge, PriorityBadge, Spinner } from '../../components/Layout';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${id}`).then(r => setUser(r.data)).catch(() => { toast.error('User not found'); navigate(-1); }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">← Back to Users</button>

      <div className="card p-6 flex items-center gap-5">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : user.role === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span>
            <span className={`badge ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
            {user.department && <span className="badge bg-gray-100 text-gray-600">{user.department}</span>}
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Joined {new Date(user.created_at).toLocaleDateString()}</div>
          <div>Last login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Recent Incidents</h3>
          <div className="space-y-2">
            {user.incidents?.map(inc => (
              <div key={inc.id} onClick={() => navigate(`/admin/incidents/${inc.id}`)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer">
                <div>
                  <span className="text-xs font-mono text-gray-500 mr-2">{inc.number}</span>
                  <span className="text-sm">{inc.title}</span>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
            {!user.incidents?.length && <p className="text-sm text-gray-500">No incidents</p>}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {user.activity?.map(a => (
              <div key={a.id} className="text-sm">
                <span className="text-gray-700 dark:text-gray-300">{a.details}</span>
                <div className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
            {!user.activity?.length && <p className="text-sm text-gray-500">No activity</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
