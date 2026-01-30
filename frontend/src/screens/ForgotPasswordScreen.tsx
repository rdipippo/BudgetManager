import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert } from '../components';
import { authService } from '../services';
import { AxiosError } from 'axios';

export const ForgotPasswordScreen: React.FC = () => {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validate = (): boolean => {
    if (!email) {
      setEmailError(t('validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('validation.emailInvalid'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.code === 'ERR_NETWORK') {
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
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo">
              <span className="logo-text">A</span>
            </div>
            <h1>{t('forgotPassword.title')}</h1>
          </div>

          <Alert type="success">{t('forgotPassword.success')}</Alert>

          <Link to="/login">
            <Button fullWidth variant="secondary">
              {t('forgotPassword.backToLogin')}
            </Button>
          </Link>
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
          <h1>{t('forgotPassword.title')}</h1>
          <p>{t('forgotPassword.subtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <Input
              label={t('forgotPassword.email')}
              type="email"
              name="email"
              placeholder={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {t('forgotPassword.submit')}
          </Button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="link">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
