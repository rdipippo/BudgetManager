import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, PasswordInput, Alert } from '../components';
import { authService } from '../services';
import { AxiosError } from 'axios';
import { ApiError } from '../services';

export const ResetPasswordScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = t('validation.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('validation.passwordMinLength');
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t('validation.passwordUppercase');
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = t('validation.passwordLowercase');
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t('validation.passwordNumber');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = t('validation.passwordSpecial');
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsMustMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(t('errors.invalidToken'));
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 400) {
        setError(t('errors.invalidToken'));
      } else if (axiosError.code === 'ERR_NETWORK') {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo">
              <span className="logo-text">A</span>
            </div>
            <h1>{t('resetPassword.title')}</h1>
          </div>

          <Alert type="error">{t('errors.invalidToken')}</Alert>

          <Link to="/login">
            <Button fullWidth>{t('resetPassword.backToLogin')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo">
              <span className="logo-text">A</span>
            </div>
            <h1>{t('resetPassword.title')}</h1>
          </div>

          <Alert type="success">{t('resetPassword.success')}</Alert>

          <Button fullWidth onClick={() => navigate('/login')}>
            {t('resetPassword.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-centered">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-text">A</span>
          </div>
          <h1>{t('resetPassword.title')}</h1>
          <p>{t('resetPassword.subtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <PasswordInput
              label={t('resetPassword.password')}
              name="password"
              placeholder={t('resetPassword.passwordPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
              showStrength
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('resetPassword.confirmPassword')}
              name="confirmPassword"
              placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
            {t('resetPassword.submit')}
          </Button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="link">
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
