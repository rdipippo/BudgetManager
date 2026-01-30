import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { adminService, User } from '../services';
import { Button, Alert, Spinner } from '../components';
import '../styles/admin.css';

export const AdminScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedUsers = await adminService.getUsers();
      setUsers(fetchedUsers);
    } catch {
      setError(t('admin.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (userId: number, currentEnabled: boolean) => {
    try {
      setActionLoading(userId);
      setError('');
      setSuccess('');
      await adminService.toggleUserEnabled(userId, !currentEnabled);
      setUsers(users.map(u =>
        u.id === userId ? { ...u, enabled: !currentEnabled } : u
      ));
      setSuccess(t(currentEnabled ? 'admin.userDisabled' : 'admin.userEnabled'));
    } catch {
      setError(t('admin.toggleError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: number) => {
    if (!window.confirm(t('admin.confirmResetPassword'))) {
      return;
    }

    try {
      setActionLoading(userId);
      setError('');
      setSuccess('');
      await adminService.resetUserPassword(userId);
      setSuccess(t('admin.passwordResetSent'));
    } catch {
      setError(t('admin.resetError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmKey = newRole === 'admin' ? 'admin.confirmMakeAdmin' : 'admin.confirmRemoveAdmin';

    if (!window.confirm(t(confirmKey))) {
      return;
    }

    try {
      setActionLoading(userId);
      setError('');
      setSuccess('');
      await adminService.toggleUserRole(userId, newRole);
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
      setSuccess(t(newRole === 'admin' ? 'admin.madeAdmin' : 'admin.removedAdmin'));
    } catch {
      setError(t('admin.roleError'));
    } finally {
      setActionLoading(null);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  if (loading) {
    return (
      <div className="screen screen-centered">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="admin-container">
        <div className="admin-header">
          <h1>{t('admin.title')}</h1>
          <Button variant="secondary" onClick={() => navigate('/')}>
            {t('admin.backToHome')}
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.name')}</th>
                <th>{t('admin.email')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.status')}</th>
                <th>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={!user.enabled ? 'disabled-row' : ''}>
                  <td>
                    {user.first_name || user.last_name
                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                      : '-'}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.enabled ? 'enabled' : 'disabled'}`}>
                      {user.enabled ? t('admin.enabled') : t('admin.disabled')}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className={`toggle-btn ${user.enabled ? 'toggle-disable' : 'toggle-enable'}`}
                      onClick={() => handleToggleEnabled(user.id, user.enabled)}
                      disabled={actionLoading === user.id || user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? t('admin.cannotDisableSelf') : ''}
                    >
                      {actionLoading === user.id ? (
                        <Spinner size="sm" />
                      ) : (
                        user.enabled ? t('admin.disable') : t('admin.enable')
                      )}
                    </button>
                    <button
                      className="reset-btn"
                      onClick={() => handleResetPassword(user.id)}
                      disabled={actionLoading === user.id}
                    >
                      {t('admin.resetPassword')}
                    </button>
                    {isSuperAdmin && user.role !== 'super_admin' && user.id !== currentUser?.id && (
                      <button
                        className={`role-btn ${user.role === 'admin' ? 'role-demote' : 'role-promote'}`}
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={actionLoading === user.id}
                      >
                        {user.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;
