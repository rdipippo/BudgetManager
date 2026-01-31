import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { budgetService, plaidService, transactionService } from '../services';
import { BudgetSummary, PlaidItem, Transaction } from '../types/budget.types';
import { BudgetCard, Spinner, EmptyState, SideMenu, Alert, TransactionItem } from '../components';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [accounts, setAccounts] = useState<PlaidItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, accountsData, transactionsData] = await Promise.all([
        budgetService.getSummary(),
        plaidService.getItems(),
        transactionService.getAll({ limit: 10 }),
      ]);
      setSummary(summaryData);
      setAccounts(accountsData);
      setRecentTransactions(transactionsData.transactions);
    } catch (err) {
      setError(t('dashboard.loadError', 'Failed to load budget summary'));
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetClick = (budgetId: number) => {
    navigate(`/budgets/${budgetId}`);
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="screen screen-with-nav">
      <div className="dashboard-header">
        <h1>{t('dashboard.title', 'Dashboard')}</h1>
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : !summary || summary.budgets.length === 0 ? (
        <div className="screen-padded">
          <EmptyState
            title={t('dashboard.noBudgets', 'No Budgets Yet')}
            description={t('dashboard.createFirst', 'Create your first budget to start tracking your spending')}
            actionLabel={t('dashboard.createBudget', 'Create Budget')}
            onAction={() => navigate('/budgets')}
          />

          <div
            className="accounts-card"
            onClick={() => navigate('/accounts')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/accounts')}
          >
            <div className="accounts-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div className="accounts-card-content">
              <span className="accounts-card-title">{t('dashboard.linkedAccounts', 'Linked Accounts')}</span>
              <span className="accounts-card-count">
                {accounts.length === 0
                  ? t('dashboard.noAccountsLinked', 'No accounts linked')
                  : t('dashboard.accountCount', '{{count}} institution(s), {{accountCount}} account(s)', {
                      count: accounts.length,
                      accountCount: accounts.reduce((sum, item) => sum + item.accounts.length, 0),
                    })}
              </span>
            </div>
            <div className="accounts-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="dashboard-overview">
            <div className="overview-card">
              <span className="overview-label">{t('dashboard.totalBudgeted', 'Budgeted')}</span>
              <span className="overview-amount">{formatCurrency(summary.totalBudgeted)}</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">{t('dashboard.totalSpent', 'Spent')}</span>
              <span className="overview-amount overview-amount-spent">{formatCurrency(summary.totalSpent)}</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">{t('dashboard.totalIncome', 'Income')}</span>
              <span className="overview-amount overview-amount-income">{formatCurrency(summary.totalIncome)}</span>
            </div>
          </div>

          <div className="dashboard-period">
            {t('dashboard.period', 'Period')}: {new Date(summary.periodStart + 'T00:00:00').toLocaleDateString()} - {new Date(summary.periodEnd + 'T00:00:00').toLocaleDateString()}
          </div>

          <div className="budget-list">
            {summary.budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onClick={() => handleBudgetClick(budget.id)}
              />
            ))}
          </div>

          {/* Recent Transactions Widget */}
          <div className="dashboard-widget">
            <div className="dashboard-widget-header">
              <h2 className="dashboard-widget-title">{t('dashboard.recentTransactions', 'Recent Transactions')}</h2>
              <button className="dashboard-widget-link" onClick={() => navigate('/transactions')}>
                {t('dashboard.viewAll', 'View All')}
              </button>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="dashboard-widget-empty">
                {t('dashboard.noTransactions', 'No transactions yet')}
              </div>
            ) : (
              <div className="transaction-list">
                <div className="transaction-list-header">
                  <div>{t('transactions.name', 'Name')}</div>
                  <div>{t('transactions.date', 'Date')}</div>
                  <div>{t('transactions.category', 'Category')}</div>
                  <div>{t('transactions.amount', 'Amount')}</div>
                </div>
                {recentTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onClick={() => navigate('/transactions')}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className="accounts-card"
            onClick={() => navigate('/accounts')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/accounts')}
          >
            <div className="accounts-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div className="accounts-card-content">
              <span className="accounts-card-title">{t('dashboard.linkedAccounts', 'Linked Accounts')}</span>
              <span className="accounts-card-count">
                {accounts.length === 0
                  ? t('dashboard.noAccountsLinked', 'No accounts linked')
                  : t('dashboard.accountCount', '{{count}} institution(s), {{accountCount}} account(s)', {
                      count: accounts.length,
                      accountCount: accounts.reduce((sum, item) => sum + item.accounts.length, 0),
                    })}
              </span>
              {accounts.some((item) => item.status !== 'active') && (
                <span className="accounts-card-warning">
                  {t('dashboard.accountsNeedAttention', 'Some accounts need attention')}
                </span>
              )}
            </div>
            <div className="accounts-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </>
      )}

      <SideMenu />
    </div>
  );
};

export default DashboardScreen;
