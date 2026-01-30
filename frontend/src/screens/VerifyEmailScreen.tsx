import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Alert, Spinner } from '../components';
import { authService } from '../services';
import { AxiosError } from 'axios';
import { ApiError } from '../services';

type VerificationStatus = 'verifying' | 'success' | 'expired' | 'invalid' | 'error';

export const VerifyEmailScreen: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (axiosError.response?.data?.code === 'INVALID_TOKEN') {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      }
    };

    verifyEmail();
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;

    setResendLoading(true);

    try {
      await authService.resendVerification(resendEmail);
      setResendSuccess(true);
    } catch {
      // Silently fail to prevent email enumeration
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <Spinner size="lg" />
            </div>
            <p className="text-center text-secondary">{t('verifyEmail.verifying')}</p>
          </>
        );

      case 'success':
        return (
          <>
            <Alert type="success">{t('verifyEmail.success')}</Alert>
            <Link to="/login">
              <Button fullWidth>{t('verifyEmail.loginNow')}</Button>
            </Link>
          </>
        );

      case 'expired':
        return (
          <>
            <Alert type="warning">{t('verifyEmail.expired')}</Alert>
            {!resendSuccess ? (
              <div>
                <div className="form-group">
                  <input
                    type="email"
                    className="input"
                    placeholder={t('login.emailPlaceholder')}
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                </div>
                <Button fullWidth onClick={handleResend} loading={resendLoading}>
                  {t('verifyEmail.resendLink')}
                </Button>
              </div>
            ) : (
              <Alert type="success">{t('forgotPassword.success')}</Alert>
            )}
            <div className="auth-footer">
              <Link to="/login" className="link">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          </>
        );

      case 'invalid':
      case 'error':
        return (
          <>
            <Alert type="error">{t('verifyEmail.invalid')}</Alert>
            <Link to="/login">
              <Button fullWidth>{t('forgotPassword.backToLogin')}</Button>
            </Link>
          </>
        );
    }
  };

  return (
    <div className="screen screen-centered">
      <div className="auth-container animate-fade-in">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-text">A</span>
          </div>
          <h1>{t('verifyEmail.title')}</h1>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmailScreen;
