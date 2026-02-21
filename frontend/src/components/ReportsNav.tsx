import React from 'react';
import { useNavigate } from 'react-router-dom';

const REPORT_OPTIONS = [
  { label: 'Spending by Category', path: '/reports' },
  { label: 'Month to Month', path: '/reports/month-to-month' },
  { label: 'Account Report', path: '/reports/account-balances' },
];

interface ReportsNavProps {
  current: string;
}

export const ReportsNav: React.FC<ReportsNavProps> = ({ current }) => {
  const navigate = useNavigate();

  return (
    <select
      className="reports-nav-dropdown"
      value={current}
      onChange={(e) => navigate(e.target.value)}
    >
      {REPORT_OPTIONS.map((opt) => (
        <option key={opt.path} value={opt.path}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
