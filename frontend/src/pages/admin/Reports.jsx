import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Spinner } from '../../components/Layout';

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

export default function Reports() {
  const [tab, setTab] = useState('volume');
  const [volumeData, setVolumeData] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [scheduleModal, setScheduleModal] = useState(false);

  useEffect(() => { loadData(); }, [tab, days]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === 'volume') {
        const { data } = await api.get(`/dashboard/reports/volume?days=${days}`);
        setVolumeData(data);
      } else if (tab === 'staff') {
        const { data } = await api.get('/dashboard/reports/staff-performance');
        setStaffData(data);
      } else if (tab === 'sla') {
        const { data } = await api.get('/dashboard/reports/sla');
        setSlaData(data);
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }

  const exportCSV = (data, filename) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => r[h]));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename; a.click();
    toast.success('Exported');
  };

  const tabs = [
    { id: 'volume', label: 'Incident Volume' },
    { id: 'staff', label: 'Staff Performance' },
    { id: 'sla', label: 'SLA Compliance' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <button onClick={() => setScheduleModal(true)} className="btn-secondary text-sm">📅 Schedule Report</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex items-center justify-center h-64"><Spinner /></div> : (
        <>
          {tab === 'volume' && volumeData && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select className="input w-32" value={days} onChange={e => setDays(e.target.value)}>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
                <button onClick={() => exportCSV(volumeData, 'volume-report.csv')} className="btn-secondary text-sm">Export CSV</button>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Incident Volume by Date</h3>
                <div className="h-72">
                  <Bar data={{
                    labels: [...new Set(volumeData.map(d => d.date))],
                    datasets: [{
                      label: 'Incidents',
                      data: [...new Set(volumeData.map(d => d.date))].map(date => volumeData.filter(d => d.date === date).reduce((s, d) => s + d.count, 0)),
                      backgroundColor: '#3b82f6', borderRadius: 4
                    }]
                  }} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
                </div>
              </div>
            </div>
          )}

          {tab === 'staff' && staffData && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => exportCSV(staffData, 'staff-performance.csv')} className="btn-secondary text-sm">Export CSV</button>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Staff Performance</h3>
                <div className="h-72">
                  <Bar data={{
                    labels: staffData.map(s => s.name.split(' ')[0]),
                    datasets: [
                      { label: 'Resolved', data: staffData.map(s => s.resolved), backgroundColor: '#22c55e', borderRadius: 4 },
                      { label: 'Open', data: staffData.map(s => s.open), backgroundColor: '#ef4444', borderRadius: 4 },
                    ]
                  }} options={chartOpts} />
                </div>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="table-th">Staff</th>
                      <th className="table-th">Total Assigned</th>
                      <th className="table-th">Resolved</th>
                      <th className="table-th">Open</th>
                      <th className="table-th">In Progress</th>
                      <th className="table-th">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {staffData.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="table-td font-medium">{s.name}</td>
                        <td className="table-td">{s.total_assigned}</td>
                        <td className="table-td text-green-600 font-semibold">{s.resolved}</td>
                        <td className="table-td text-red-600">{s.open}</td>
                        <td className="table-td text-yellow-600">{s.in_progress}</td>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 w-20">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${s.total_assigned > 0 ? Math.round((s.resolved / s.total_assigned) * 100) : 0}%` }} />
                            </div>
                            <span className="text-xs">{s.total_assigned > 0 ? Math.round((s.resolved / s.total_assigned) * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'sla' && slaData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5 text-center">
                  <div className="text-4xl font-bold text-primary-600">{slaData.compliance}%</div>
                  <div className="text-sm text-gray-500 mt-1">Overall Compliance</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="text-4xl font-bold text-green-600">{slaData.resolved}</div>
                  <div className="text-sm text-gray-500 mt-1">Resolved Incidents</div>
                </div>
                <div className="card p-5 text-center">
                  <div className="text-4xl font-bold text-gray-600">{slaData.total}</div>
                  <div className="text-sm text-gray-500 mt-1">Total Incidents</div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold mb-4">SLA by Priority</h3>
                <div className="h-64">
                  <Pie data={{
                    labels: slaData.byPriority.map(p => p.priority),
                    datasets: [{
                      data: slaData.byPriority.map(p => p.total),
                      backgroundColor: ['#7f1d1d', '#ef4444', '#f97316', '#3b82f6'], borderWidth: 0
                    }]
                  }} options={chartOpts} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {scheduleModal && (
        <div className="modal-overlay" onClick={() => setScheduleModal(false)}>
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold">Schedule Report</h2>
              <button onClick={() => setScheduleModal(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Report Type</label><select className="input"><option>Incident Volume</option><option>Staff Performance</option><option>SLA Compliance</option></select></div>
              <div><label className="label">Frequency</label><select className="input"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
              <div><label className="label">Email</label><input type="email" className="input" placeholder="admin@company.com" /></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setScheduleModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => { toast.success('Report scheduled (mock)'); setScheduleModal(false); }} className="btn-primary">Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
