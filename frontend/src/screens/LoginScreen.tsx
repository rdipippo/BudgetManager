import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button, Input, PasswordInput, Checkbox, Alert } from '../components';
import { AxiosError } from 'axios';
import { ApiError, authService } from '../services';

export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (!password) {
      newErrors.password = t('validation.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setShowResendVerification(false);

    if (!validate()) return;

    setLoading(true);

    try {
      await login({ email, password, rememberMe });
      navigate('/');
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setError(t('errors.emailNotVerified'));
        setShowResendVerification(true);
      } else if (axiosError.response?.status === 401) {
        setError(t('errors.invalidCredentials'));
      } else if (axiosError.code === 'ERR_NETWORK') {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setError('');
    try {
      await authService.resendVerification(email);
      setSuccessMessage(t('errors.verificationSent'));
      setShowResendVerification(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.code === 'ERR_NETWORK') {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.serverError'));
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="screen screen-centered">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-text">A</span>
          </div>
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        {successMessage && <Alert type="success">{successMessage}</Alert>}

        {error && (
          <Alert type="error">
            {error}
            {showResendVerification && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {resendLoading ? t('common.loading') : t('errors.resendVerification')}
                </button>
              </>
            )}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <Input
              label={t('login.email')}
              type="email"
              name="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('login.password')}
              name="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox
              name="rememberMe"
              label={t('login.rememberMe')}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Link to="/forgot-password" className="link text-small">
              {t('login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {t('login.submit')}
          </Button>
        </form>

        <div className="auth-footer">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="link">
            {t('login.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
