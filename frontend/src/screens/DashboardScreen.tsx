import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { budgetService, plaidService, transactionService } from '../services';
import { BudgetSummary, PlaidItem, Transaction } from '../types/budget.types';
import { BudgetCard, BudgetSummaryWidget, Spinner, EmptyState, SideMenu, Alert, TransactionItem, AccountsWidget } from '../components';

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

          <AccountsWidget accounts={accounts} />
        </div>
      ) : (
        <>
          <BudgetSummaryWidget
            totalIncome={summary.totalIncome}
            totalBudgeted={summary.totalBudgeted}
            totalSpent={summary.totalSpent}
            totalRemaining={summary.totalRemaining}
          />

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

          <AccountsWidget accounts={accounts} />
        </>
      )}

      <SideMenu />
    </div>
  );
};

export default DashboardScreen;
