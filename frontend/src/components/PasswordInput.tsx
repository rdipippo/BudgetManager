import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

const getPasswordStrength = (password: string): 'weak' | 'fair' | 'good' | 'strong' => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (password.length >= 16) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  if (score <= 5) return 'good';
  return 'strong';
};

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showStrength = false, className = '', id, value, ...props }, ref) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const password = typeof value === 'string' ? value : '';
    const strength = password ? getPasswordStrength(password) : null;

    const inputId = id || props.name;

    const strengthBars = () => {
      const levels = ['weak', 'fair', 'good', 'strong'];
      const currentIndex = strength ? levels.indexOf(strength) : -1;

      return (
        <div className={`password-strength ${strength || ''}`}>
          {levels.map((level, index) => (
            <div
              key={level}
              className={`password-strength-bar ${index <= currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      );
    };

    return (
      <div className="input-wrapper">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className="input-container">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={`input input-with-icon ${error ? 'input-error' : ''} ${className}`}
            value={value}
            {...props}
          />
          <button
            type="button"
            className="input-icon"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {showStrength && password && (
          <>
            {strengthBars()}
            <span className={`password-strength-text text-${strength === 'weak' ? 'error' : strength === 'fair' ? 'secondary' : 'success'}`}>
              {t(`passwordStrength.${strength}`)}
            </span>
          </>
        )}
        {error && <span className="input-error-text">{error}</span>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
