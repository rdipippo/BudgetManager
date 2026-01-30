import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, PasswordInput, Alert, SideMenu } from '../components';
import { authService } from '../services';
import { AxiosError } from 'axios';
import { ApiError } from '../services';

export const ChangePasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      newErrors.currentPassword = t('validation.currentPasswordRequired');
    }

    if (!newPassword) {
      newErrors.newPassword = t('validation.passwordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('validation.passwordMinLength');
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = t('validation.passwordUppercase');
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = t('validation.passwordLowercase');
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = t('validation.passwordNumber');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      newErrors.newPassword = t('validation.passwordSpecial');
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsMustMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 401) {
        setError(t('changePassword.incorrectPassword'));
      } else if (axiosError.code === 'ERR_NETWORK') {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="screen screen-with-nav screen-centered">
        <SideMenu />
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo">
              <span className="logo-text">A</span>
            </div>
            <h1>{t('changePassword.title')}</h1>
          </div>

          <Alert type="success">{t('changePassword.success')}</Alert>

          <Button fullWidth onClick={() => navigate('/')}>
            {t('changePassword.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-with-nav screen-centered">
      <SideMenu />
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-text">A</span>
          </div>
          <h1>{t('changePassword.title')}</h1>
          <p>{t('changePassword.subtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <PasswordInput
              label={t('changePassword.currentPassword')}
              name="currentPassword"
              placeholder={t('changePassword.currentPasswordPlaceholder')}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: '' }));
              }}
              error={errors.currentPassword}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('changePassword.newPassword')}
              name="newPassword"
              placeholder={t('changePassword.newPasswordPlaceholder')}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              error={errors.newPassword}
              showStrength
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('changePassword.confirmPassword')}
              name="confirmPassword"
              placeholder={t('changePassword.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {t('changePassword.submit')}
          </Button>
        </form>

        <div className="auth-footer">
          <Link to="/" className="link">
            {t('changePassword.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordScreen;
