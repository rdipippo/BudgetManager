import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { HamburgerMenu } from '../components';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="screen">
      <div className="home-header">
        <HamburgerMenu user={user} onLogout={handleLogout} />
      </div>
      <div className="welcome-container">
        <h1>{t('home.welcome')}</h1>
      </div>
    </div>
  );
};

export default HomeScreen;
