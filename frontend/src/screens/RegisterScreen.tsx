import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button, Input, PasswordInput, Alert } from '../components';
import { AxiosError } from 'axios';
import { ApiError } from '../services';

export const RegisterScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired');
    } else {
      if (formData.password.length < 8) {
        newErrors.password = t('validation.passwordMinLength');
      } else if (!/[A-Z]/.test(formData.password)) {
        newErrors.password = t('validation.passwordUppercase');
      } else if (!/[a-z]/.test(formData.password)) {
        newErrors.password = t('validation.passwordLowercase');
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = t('validation.passwordNumber');
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        newErrors.password = t('validation.passwordSpecial');
      }
    }

    if (formData.password !== formData.confirmPassword) {
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
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        setError(t('errors.accountExists'));
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
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo">
              <span className="logo-text">A</span>
            </div>
            <h1>{t('register.title')}</h1>
          </div>

          <Alert type="success">{t('register.success')}</Alert>

          <Button fullWidth onClick={() => navigate('/login')}>
            {t('login.submit')}
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
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <Input
                label={t('register.firstName')}
                name="firstName"
                placeholder={t('register.firstNamePlaceholder')}
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                error={errors.firstName}
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <Input
                label={t('register.lastName')}
                name="lastName"
                placeholder={t('register.lastNamePlaceholder')}
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                error={errors.lastName}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <Input
              label={t('register.email')}
              type="email"
              name="email"
              placeholder={t('register.emailPlaceholder')}
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('register.password')}
              name="password"
              placeholder={t('register.passwordPlaceholder')}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              showStrength
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('register.confirmPassword')}
              name="confirmPassword"
              placeholder={t('register.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {t('register.submit')}
          </Button>
        </form>

        <div className="auth-footer">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="link">
            {t('register.login')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
