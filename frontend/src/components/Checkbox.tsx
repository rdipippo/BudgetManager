import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || props.name;

  return (
    <label htmlFor={checkboxId} className={`checkbox-wrapper ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        className="checkbox"
        {...props}
      />
      <span className="checkbox-label">{label}</span>
    </label>
  );
};
