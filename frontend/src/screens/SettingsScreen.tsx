import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { SideMenu, Button } from '../components';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      title: t('settings.linkedAccounts', 'Linked Accounts'),
      description: t('settings.linkedAccountsDesc', 'Manage your bank connections'),
      path: '/accounts',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      title: t('settings.categories', 'Categories'),
      description: t('settings.categoriesDesc', 'Manage spending categories'),
      path: '/categories',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
    },
    {
      title: t('settings.rules', 'Categorization Rules'),
      description: t('settings.rulesDesc', 'Auto-categorize transactions'),
      path: '/rules',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      title: t('settings.changePassword', 'Change Password'),
      description: t('settings.changePasswordDesc', 'Update your password'),
      path: '/change-password',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="screen screen-with-nav">
      <div className="settings-header">
        <h1>{t('settings.title', 'Settings')}</h1>
      </div>

      {user && (
        <div className="settings-user">
          <div className="settings-user-avatar">
            {user.first_name?.[0] || user.email[0].toUpperCase()}
          </div>
          <div className="settings-user-info">
            <span className="settings-user-name">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email}
            </span>
            <span className="settings-user-email">{user.email}</span>
          </div>
        </div>
      )}

      <div className="settings-menu">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className="settings-menu-item"
            onClick={() => navigate(item.path)}
          >
            <div className="settings-menu-icon">{item.icon}</div>
            <div className="settings-menu-content">
              <span className="settings-menu-title">{item.title}</span>
              <span className="settings-menu-description">{item.description}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      <div className="settings-logout">
        <Button variant="secondary" fullWidth onClick={handleLogout}>
          {t('settings.logout', 'Log Out')}
        </Button>
      </div>

      <SideMenu />
    </div>
  );
};

export default SettingsScreen;
