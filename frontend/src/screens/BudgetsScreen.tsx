import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { budgetService, categoryService } from '../services';
import { Budget, Category } from '../types/budget.types';
import { BudgetCard, Spinner, EmptyState, SideMenu, Alert, Button, Modal, Input, AmountDisplay } from '../components';

export const BudgetsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBudgetCategoryId, setNewBudgetCategoryId] = useState<number | ''>('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [budgetsData, categoriesData] = await Promise.all([
        budgetService.getAll(),
        categoryService.getAll(),
      ]);
      setBudgets(budgetsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(t('budgets.loadError', 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetClick = (budgetId: number) => {
    navigate(`/budgets/${budgetId}`);
  };

  const getAvailableCategories = () => {
    const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
    return categories.filter((c) => !c.is_income && !budgetedCategoryIds.has(c.id));
  };

  const handleCreateBudget = async () => {
    if (!newBudgetCategoryId || !newBudgetAmount) return;

    try {
      setCreating(true);
      await budgetService.create({
        categoryId: newBudgetCategoryId as number,
        amount: parseFloat(newBudgetAmount),
      });
      setCreateModalOpen(false);
      setNewBudgetCategoryId('');
      setNewBudgetAmount('');
      loadData();
    } catch (err) {
      setError(t('budgets.createError', 'Failed to create budget'));
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewBudgetCategoryId('');
    setNewBudgetAmount('');
    setCreateModalOpen(true);
  };

  const availableCategories = getAvailableCategories();

  return (
    <div className="screen screen-with-nav">
      <div className="budgets-header">
        <h1>{t('budgets.title', 'Budgets')}</h1>
        <Button
          variant="primary"
          onClick={openCreateModal}
          disabled={availableCategories.length === 0}
        >
          +
        </Button>
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : budgets.length === 0 ? (
        <div className="screen-padded">
          <EmptyState
            title={t('budgets.noBudgets', 'No Budgets Yet')}
            description={t('budgets.createFirst', 'Create budgets to track spending by category')}
            actionLabel={t('budgets.createBudget', 'Create Budget')}
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <>
          <div className="budgets-summary">
            <div className="budgets-summary-item">
              <span className="budgets-summary-label">{t('budgets.totalBudgeted', 'Total Budgeted')}</span>
              <AmountDisplay
                amount={budgets.reduce((sum, b) => sum + b.amount, 0)}
                size="lg"
              />
            </div>
            <div className="budgets-summary-item">
              <span className="budgets-summary-label">{t('budgets.totalSpent', 'Total Spent')}</span>
              <AmountDisplay
                amount={-(budgets.reduce((sum, b) => sum + (b.spent || 0), 0))}
                size="lg"
                colorize
              />
            </div>
            <div className="budgets-summary-item">
              <span className="budgets-summary-label">{t('budgets.totalRemaining', 'Remaining')}</span>
              <AmountDisplay
                amount={budgets.reduce((sum, b) => sum + (b.remaining || 0), 0)}
                size="lg"
              />
            </div>
          </div>

          <div className="budgets-section">
            <h2 className="section-title">{t('budgets.activeBudgets', 'Active Budgets')}</h2>
            <div className="budget-list">
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onClick={() => handleBudgetClick(budget.id)}
                />
              ))}
            </div>
          </div>

          <div className="budgets-actions">
            <Button
              variant="secondary"
              onClick={() => navigate('/categories')}
              fullWidth
            >
              {t('budgets.manageCategories', 'Manage Categories')}
            </Button>
          </div>
        </>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('budgets.createBudget', 'Create Budget')}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBudget}
              loading={creating}
              disabled={!newBudgetCategoryId || !newBudgetAmount}
            >
              {t('common.create', 'Create')}
            </Button>
          </div>
        }
      >
        <div className="create-budget-form">
          <div className="form-group">
            <label>{t('budgets.category', 'Category')}</label>
            <select
              value={newBudgetCategoryId}
              onChange={(e) => setNewBudgetCategoryId(e.target.value ? parseInt(e.target.value) : '')}
              className="form-select"
            >
              <option value="">{t('budgets.selectCategory', 'Select a category')}</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('budgets.monthlyAmount', 'Monthly Amount')}</label>
            <Input
              type="number"
              placeholder="0.00"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </Modal>

      <SideMenu />
    </div>
  );
};

export default BudgetsScreen;
