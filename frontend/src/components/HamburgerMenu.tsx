import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../services/auth.service';
import '../styles/hamburger-menu.css';

interface HamburgerMenuProps {
  user: User;
  onLogout: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const displayName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : t('menu.user');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleChangePassword = () => {
    setIsOpen(false);
    navigate('/change-password');
  };

  const handleAdmin = () => {
    setIsOpen(false);
    navigate('/admin');
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('menu.toggle')}
        aria-expanded={isOpen}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {isOpen && (
        <div className="menu-panel">
          <div className="menu-header">
            <div className="menu-user-name">{displayName}</div>
            <div className="menu-user-email">{user.email}</div>
          </div>
          <div className="menu-divider" />
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <button className="menu-item" onClick={handleAdmin}>
              {t('menu.admin')}
            </button>
          )}
          <button className="menu-item" onClick={handleChangePassword}>
            {t('menu.changePassword')}
          </button>
          <button className="menu-item menu-item-logout" onClick={handleLogout}>
            {t('menu.signOut')}
          </button>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;
