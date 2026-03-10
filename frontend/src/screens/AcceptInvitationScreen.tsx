import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, PasswordInput, Alert, Spinner } from '../components';
import { invitationService, tokenStorage } from '../services';
import type { InvitationDetails } from '../services';
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';
import { ApiError } from '../services';

export const AcceptInvitationScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const token = searchParams.get('token') || '';

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setDetailsError(t('invitations.invalidToken', 'Invalid invitation link.'));
      setLoadingDetails(false);
      return;
    }

    invitationService
      .getInvitationDetails(token)
      .then(({ invitation: data }) => {
        setInvitation(data);
      })
      .catch((err: AxiosError<{ error: string }>) => {
        const msg = err.response?.data?.error || t('invitations.invitationNotFound', 'Invitation not found or has expired.');
        setDetailsError(msg);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [token, t]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired', 'Password is required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('validation.passwordMinLength', 'Password must be at least 8 characters');
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = t('validation.passwordUppercase', 'Password must contain an uppercase letter');
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = t('validation.passwordLowercase', 'Password must contain a lowercase letter');
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = t('validation.passwordNumber', 'Password must contain a number');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = t('validation.passwordSpecial', 'Password must contain a special character');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsMustMatch', 'Passwords must match');
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
      const response = await invitationService.acceptInvitation({
        token,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
      });

      // Store the tokens
      tokenStorage.setAccessToken(response.accessToken);
      tokenStorage.setRefreshToken(response.refreshToken);

      // Refresh the auth context
      await refreshUser();

      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 409) {
        setError(t('invitations.emailAlreadyExists', 'An account with this email address already exists. To accept this invitation, the inviter needs to use a different email address.'));
      } else if (axiosError.response?.status === 410) {
        setError(axiosError.response.data?.error || t('invitations.invitationExpired', 'This invitation has expired or already been used.'));
      } else if (axiosError.code === 'ERR_NETWORK') {
        setError(t('errors.networkError', 'Network error. Please try again.'));
      } else {
        setError(t('errors.serverError', 'An error occurred. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const accessTypeLabels: Record<string, string> = {
    full: t('invitations.accessFull', 'Full Access'),
    partial: t('invitations.accessPartial', 'Partial Access'),
    advisor: t('invitations.accessAdvisor', 'Financial Advisor'),
  };

  if (loadingDetails) {
    return (
      <div className="screen screen-centered">
        <Spinner size="lg" />
      </div>
    );
  }

  if (detailsError) {
    return (
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo"><span className="logo-text">A</span></div>
            <h1>{t('invitations.acceptTitle', 'Accept Invitation')}</h1>
          </div>
          <Alert type="error">{detailsError}</Alert>
          <Button fullWidth onClick={() => navigate('/login')}>
            {t('login.submit', 'Log In')}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="screen screen-centered">
        <div className="auth-container animate-fade-in">
          <div className="auth-header">
            <div className="logo"><span className="logo-text">A</span></div>
            <h1>{t('invitations.acceptTitle', 'Accept Invitation')}</h1>
          </div>
          <Alert type="success">
            {t('invitations.acceptSuccess', 'Your account has been created and the invitation accepted. Welcome!')}
          </Alert>
          <Button fullWidth onClick={() => navigate('/')}>
            {t('invitations.goToDashboard', 'Go to Dashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-centered">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="logo"><span className="logo-text">A</span></div>
          <h1>{t('invitations.acceptTitle', 'Accept Invitation')}</h1>
        </div>

        {invitation && (
          <div className="invitation-info">
            <p className="invitation-info-text">
              <strong>{invitation.ownerName}</strong>{' '}
              {t('invitations.hasInvitedYou', 'has invited you to join their Budget Manager account.')}
            </p>
            <p className="invitation-info-access">
              {t('invitations.accessLevel', 'Access level')}: <strong>{accessTypeLabels[invitation.accessType] || invitation.accessType}</strong>
            </p>
            <p className="invitation-info-email">
              {t('invitations.mustUseEmail', 'You must register with this email address')}:{' '}
              <strong>{invitation.inviteeEmail}</strong>
            </p>
          </div>
        )}

        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <Input
                label={t('register.firstName', 'First Name')}
                name="firstName"
                placeholder={t('register.firstNamePlaceholder', 'First name')}
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <Input
                label={t('register.lastName', 'Last Name')}
                name="lastName"
                placeholder={t('register.lastNamePlaceholder', 'Last name')}
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('register.password', 'Password')}
              name="password"
              placeholder={t('register.passwordPlaceholder', 'Create a password')}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              showStrength
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <PasswordInput
              label={t('register.confirmPassword', 'Confirm Password')}
              name="confirmPassword"
              placeholder={t('register.confirmPasswordPlaceholder', 'Confirm your password')}
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {t('invitations.createAccountAndAccept', 'Create Account & Accept')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitationScreen;
