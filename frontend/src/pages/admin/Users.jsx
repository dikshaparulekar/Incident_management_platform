import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Avatar, Modal, ConfirmModal, Pagination, Spinner } from '../../components/Layout';

const ROLES = ['ADMIN', 'STAFF', 'USER'];
const DEPTS = ['Engineering', 'IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales', 'Support'];

function UserForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', email: '', password: '', role: 'USER', department: '', phone: '', status: 'active' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?.id) {
        const { data } = await api.put(`/users/${initial.id}`, form);
        onSave(data);
        toast.success('User updated');
      } else {
        const { data } = await api.post('/users', form);
        onSave(data);
        toast.success('User created');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        {!initial?.id && (
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>
        )}
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={form.department || ''} onChange={e => set('department', e.target.value)}>
            <option value="">Select...</option>
            {DEPTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0000" />
        </div>
        {initial?.id && (
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : initial?.id ? 'Update User' : 'Create User'}</button>
      </div>
    </form>
  );
}

export default function Users() {
  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete' | 'bulk'
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 25, sort, order });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data: d } = await api.get(`/users?${params}`);
      setData(d);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter, sort, order]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const handleSort = (col) => { if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSort(col); setOrder('asc'); } };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteUser.id}`);
      toast.success('User deleted');
      setModal(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleBulk = async () => {
    if (!bulkAction) return toast.error('Select an action');
    try {
      await api.post('/users/bulk', { ids: selected, action: bulkAction, value: bulkValue });
      toast.success('Bulk action applied');
      setSelected([]);
      setModal(null);
      fetchUsers();
    } catch { toast.error('Bulk action failed'); }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Department', 'Created'];
    const rows = data.users.map(u => [u.id, u.name, u.email, u.role, u.status, u.department || '', u.created_at]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'users.csv'; a.click();
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === data.users.length ? [] : data.users.map(u => u.id));

  const SortIcon = ({ col }) => sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-gray-500">{data.total} total users</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ Add User</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-36" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="ml-auto flex gap-2">
          {selected.length > 0 && (
            <button onClick={() => setModal('bulk')} className="btn-secondary">{selected.length} selected ▾</button>
          )}
          <button onClick={exportCSV} className="btn-secondary">Export CSV</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="table-th w-10"><input type="checkbox" checked={selected.length === data.users.length && data.users.length > 0} onChange={toggleAll} className="rounded" /></th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('name')}>Name<SortIcon col="name" /></th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('email')}>Email<SortIcon col="email" /></th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Department</th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('created_at')}>Created<SortIcon col="created_at" /></th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('last_login')}>Last Login<SortIcon col="last_login" /></th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="table-td"><div className="skeleton h-4 w-full" /></td></tr>
                ))
              ) : data.users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="table-td"><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" /></td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size="sm" />
                      <button onClick={() => navigate(`/admin/users/${u.id}`)} className="font-medium hover:text-primary-600 text-left">{u.name}</button>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td">
                    <span className={`badge ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span>
                  </td>
                  <td className="table-td text-gray-500">{u.department || '—'}</td>
                  <td className="table-td text-gray-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td className="table-td text-gray-500 text-xs">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditUser(u); setModal('edit'); }} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                      <button onClick={() => { setDeleteUser(u); setModal('delete'); }} className="btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={data.pages} total={data.total} limit={25} onPage={setPage} />
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Add New User" onClose={() => setModal(null)} size="lg">
          <UserForm onSave={() => fetchUsers()} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editUser && (
        <Modal title="Edit User" onClose={() => setModal(null)} size="lg">
          <UserForm initial={editUser} onSave={() => fetchUsers()} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'delete' && deleteUser && (
        <ConfirmModal title="Delete User" message={`Are you sure you want to delete ${deleteUser.name}? This cannot be undone.`}
          onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
      {modal === 'bulk' && (
        <Modal title="Bulk Actions" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selected.length} users selected</p>
            <div>
              <label className="label">Action</label>
              <select className="input" value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                <option value="">Select action...</option>
                <option value="status">Change Status</option>
                <option value="role">Change Role</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            {bulkAction === 'status' && (
              <div>
                <label className="label">New Status</label>
                <select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
            {bulkAction === 'role' && (
              <div>
                <label className="label">New Role</label>
                <select className="input" value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleBulk} className={bulkAction === 'delete' ? 'btn-danger' : 'btn-primary'}>Apply</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
