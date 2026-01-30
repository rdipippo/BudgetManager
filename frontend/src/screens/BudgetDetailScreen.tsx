import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { budgetService } from '../services';
import { Budget, Transaction } from '../types/budget.types';
import { TransactionItem, ProgressBar, Spinner, Alert, Button, AmountDisplay, SideMenu } from '../components';

export const BudgetDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadBudget();
    }
  }, [id]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetService.getById(parseInt(id!));
      setBudget(data.budget);
      setTransactions(data.transactions);
      setPeriodStart(data.periodStart);
      setPeriodEnd(data.periodEnd);
    } catch (err) {
      setError(t('budgets.loadError', 'Failed to load budget'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!budget) return;
    if (!window.confirm(t('budgets.confirmDelete', 'Are you sure you want to delete this budget?'))) {
      return;
    }

    try {
      setDeleting(true);
      await budgetService.delete(budget.id);
      navigate('/budgets');
    } catch (err) {
      setError(t('budgets.deleteError', 'Failed to delete budget'));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen screen-with-nav">
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
        <SideMenu />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="screen screen-with-nav">
        <div className="screen-padded">
          <Alert type="error">{error || 'Budget not found'}</Alert>
          <Button variant="secondary" onClick={() => navigate('/budgets')}>
            {t('common.back', 'Back')}
          </Button>
        </div>
        <SideMenu />
      </div>
    );
  }

  const percentage = budget.percentage || 0;
  const spent = budget.spent || 0;
  const remaining = budget.remaining || 0;

  return (
    <div className="screen screen-with-nav">
      <div className="budget-detail-header">
        <button className="back-button" onClick={() => navigate('/budgets')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{budget.category_name}</h1>
        <button className="delete-button" onClick={handleDelete} disabled={deleting}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="budget-detail-summary">
        <div className="budget-detail-amounts">
          <div className="budget-detail-spent">
            <span className="label">{t('budgets.spent', 'Spent')}</span>
            <AmountDisplay amount={spent} size="lg" />
          </div>
          <div className="budget-detail-remaining">
            <span className="label">{percentage > 100 ? t('budgets.over', 'Over') : t('budgets.remaining', 'Remaining')}</span>
            <AmountDisplay amount={remaining} size="lg" />
          </div>
        </div>

        <div className="budget-detail-progress">
          <ProgressBar value={percentage} height={12} showLabel />
        </div>

        <div className="budget-detail-total">
          {t('budgets.ofBudget', 'of')} <AmountDisplay amount={budget.amount} size="md" /> {t('budgets.budgeted', 'budgeted')}
        </div>

        <div className="budget-detail-period">
          {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}
        </div>
      </div>

      <div className="budget-detail-transactions">
        <h2 className="section-title">{t('budgets.transactions', 'Transactions')} ({transactions.length})</h2>

        {transactions.length === 0 ? (
          <p className="no-transactions">{t('budgets.noTransactions', 'No transactions in this category for this period')}</p>
        ) : (
          <div className="transaction-list">
            <div className="transaction-list-header">
              <div>{t('transactions.name', 'Name')}</div>
              <div>{t('transactions.date', 'Date')}</div>
              <div>{t('transactions.category', 'Category')}</div>
              <div>{t('transactions.amount', 'Amount')}</div>
            </div>
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onClick={() => navigate(`/transactions/${transaction.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <SideMenu />
    </div>
  );
};

export default BudgetDetailScreen;
