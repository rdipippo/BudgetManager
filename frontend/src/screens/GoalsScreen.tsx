import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  goalService,
  categoryService,
  plaidService,
  CreateGoalData,
} from '../services';
import { Goal, GoalType, Category, PlaidItem } from '../types/budget.types';
import {
  GoalCard,
  Spinner,
  EmptyState,
  SideMenu,
  Alert,
  Button,
  Modal,
  Input,
} from '../components';

const GOAL_TYPE_OPTIONS: GoalType[] = [
  'save_balance',
  'pay_off_credit',
  'reduce_spending',
  'spend_target',
];

interface FormState {
  name: string;
  goalType: GoalType;
  plaidAccountId: string;
  categoryId: string;
  targetAmount: string;
  baselineAmount: string;
  targetBalance: string;
  baselineTotal: string;
  reductionType: 'fixed' | 'percent';
  reductionAmount: string;
  creditAccountIds: number[];
  targetDate: string;
}

const emptyForm = (): FormState => ({
  name: '',
  goalType: 'save_balance',
  plaidAccountId: '',
  categoryId: '',
  targetAmount: '',
  baselineAmount: '',
  targetBalance: '0',
  baselineTotal: '',
  reductionType: 'fixed',
  reductionAmount: '',
  creditAccountIds: [],
  targetDate: '',
});

export const GoalsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [goalsData, categoriesData, itemsData] = await Promise.all([
        goalService.getAll(),
        categoryService.getAll(),
        plaidService.getItems().catch(() => [] as PlaidItem[]),
      ]);
      setGoals(goalsData);
      setCategories(categoriesData);
      setItems(itemsData);
    } catch (err) {
      setError(t('goals.loadError', 'Failed to load goals'));
    } finally {
      setLoading(false);
    }
  };

  const depositoryAccounts = useMemo(
    () =>
      items.flatMap((item) =>
        item.accounts
          .filter((a) => a.type === 'depository' && !a.isHidden)
          .map((a) => ({ ...a, institutionName: item.institutionName }))
      ),
    [items]
  );

  const creditAccounts = useMemo(
    () =>
      items.flatMap((item) =>
        item.accounts
          .filter((a) => a.type === 'credit' && !a.isHidden)
          .map((a) => ({ ...a, institutionName: item.institutionName }))
      ),
    [items]
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.is_income),
    [categories]
  );

  const openCreateModal = () => {
    setForm(emptyForm());
    setCreateModalOpen(true);
  };

  const isFormValid = (): boolean => {
    if (!form.name.trim()) return false;
    if (!form.goalType) return false;
    switch (form.goalType) {
      case 'save_balance':
        return Boolean(
          form.plaidAccountId &&
            form.targetAmount &&
            form.baselineAmount !== ''
        );
      case 'pay_off_credit':
        return form.creditAccountIds.length > 0 && form.baselineTotal !== '';
      case 'reduce_spending':
        return Boolean(
          form.categoryId &&
            form.reductionAmount &&
            form.baselineAmount !== ''
        );
      case 'spend_target':
        return Boolean(form.categoryId && form.targetAmount);
    }
  };

  const buildPayload = (): CreateGoalData => {
    const base: CreateGoalData = {
      name: form.name.trim(),
      goalType: form.goalType,
      targetDate: form.targetDate || null,
    };
    switch (form.goalType) {
      case 'save_balance':
        return {
          ...base,
          plaidAccountId: parseInt(form.plaidAccountId, 10),
          targetAmount: parseFloat(form.targetAmount),
          baselineAmount: parseFloat(form.baselineAmount),
        };
      case 'pay_off_credit':
        return {
          ...base,
          creditAccountIds: form.creditAccountIds,
          targetBalance: form.targetBalance ? parseFloat(form.targetBalance) : 0,
          baselineTotal: parseFloat(form.baselineTotal),
        };
      case 'reduce_spending':
        return {
          ...base,
          categoryId: parseInt(form.categoryId, 10),
          reductionType: form.reductionType,
          reductionAmount: parseFloat(form.reductionAmount),
          baselineAmount: parseFloat(form.baselineAmount),
        };
      case 'spend_target':
        return {
          ...base,
          categoryId: parseInt(form.categoryId, 10),
          targetAmount: parseFloat(form.targetAmount),
        };
    }
  };

  const handleCreate = async () => {
    if (!isFormValid()) return;
    try {
      setCreating(true);
      setError(null);
      await goalService.create(buildPayload());
      setCreateModalOpen(false);
      await loadData();
    } catch (err) {
      setError(t('goals.createError', 'Failed to create goal'));
    } finally {
      setCreating(false);
    }
  };

  const toggleCreditAccount = (id: number) => {
    setForm((prev) => ({
      ...prev,
      creditAccountIds: prev.creditAccountIds.includes(id)
        ? prev.creditAccountIds.filter((x) => x !== id)
        : [...prev.creditAccountIds, id],
    }));
  };

  const baselineHint =
    form.goalType === 'pay_off_credit' && form.creditAccountIds.length > 0
      ? creditAccounts
          .filter((a) => form.creditAccountIds.includes(a.id))
          .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0)
      : null;

  const renderTypeSpecificFields = () => {
    switch (form.goalType) {
      case 'save_balance':
        return (
          <>
            <div className="form-group">
              <label>{t('goals.account', 'Account')}</label>
              <select
                value={form.plaidAccountId}
                onChange={(e) =>
                  setForm({ ...form, plaidAccountId: e.target.value })
                }
                className="form-select"
              >
                <option value="">{t('goals.selectAccount', 'Select an account')}</option>
                {depositoryAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.institutionName ? `${a.institutionName} — ` : ''}
                    {a.name}
                    {a.mask ? ` ····${a.mask}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('goals.targetAmount', 'Target Amount')}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>{t('goals.baselineSaved', 'Starting Balance')}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.baselineAmount}
                onChange={(e) => setForm({ ...form, baselineAmount: e.target.value })}
                step="0.01"
              />
            </div>
          </>
        );
      case 'pay_off_credit':
        return (
          <>
            <div className="form-group">
              <label>{t('goals.creditAccounts', 'Credit Accounts')}</label>
              {creditAccounts.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  {t('goals.noCreditAccounts', 'No credit accounts linked')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {creditAccounts.map((a) => (
                    <label
                      key={a.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={form.creditAccountIds.includes(a.id)}
                        onChange={() => toggleCreditAccount(a.id)}
                      />
                      <span>
                        {a.institutionName ? `${a.institutionName} — ` : ''}
                        {a.name}
                        {a.mask ? ` ····${a.mask}` : ''}
                        {a.currentBalance != null
                          ? ` ($${Number(a.currentBalance).toFixed(2)})`
                          : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('goals.targetBalance', 'Target Balance')}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.targetBalance}
                onChange={(e) => setForm({ ...form, targetBalance: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>
                {t('goals.baselineTotal', 'Starting Total Owed')}
                {baselineHint !== null && (
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '0.85em',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    ({t('goals.currentSum', 'currently')}: ${baselineHint.toFixed(2)})
                  </span>
                )}
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.baselineTotal}
                onChange={(e) => setForm({ ...form, baselineTotal: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </>
        );
      case 'reduce_spending':
        return (
          <>
            <div className="form-group">
              <label>{t('goals.category', 'Category')}</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="form-select"
              >
                <option value="">{t('goals.selectCategory', 'Select a category')}</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('goals.reductionType', 'Reduction Type')}</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="reductionType"
                    checked={form.reductionType === 'fixed'}
                    onChange={() => setForm({ ...form, reductionType: 'fixed' })}
                  />
                  {t('goals.fixed', 'Fixed amount')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="reductionType"
                    checked={form.reductionType === 'percent'}
                    onChange={() => setForm({ ...form, reductionType: 'percent' })}
                  />
                  {t('goals.percent', 'Percent')}
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>
                {form.reductionType === 'percent'
                  ? t('goals.reductionPercent', 'Reduction (%)')
                  : t('goals.reductionDollars', 'Reduction ($)')}
              </label>
              <Input
                type="number"
                placeholder="0"
                value={form.reductionAmount}
                onChange={(e) => setForm({ ...form, reductionAmount: e.target.value })}
                min="0"
                step={form.reductionType === 'percent' ? '1' : '0.01'}
              />
            </div>
            <div className="form-group">
              <label>{t('goals.baselineSpend', 'Typical Monthly Spend')}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.baselineAmount}
                onChange={(e) => setForm({ ...form, baselineAmount: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </>
        );
      case 'spend_target':
        return (
          <>
            <div className="form-group">
              <label>{t('goals.category', 'Category')}</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="form-select"
              >
                <option value="">{t('goals.selectCategory', 'Select a category')}</option>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('goals.monthlyTarget', 'Monthly Target Amount')}</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="screen screen-with-nav">
      <div className="budgets-header">
        <h1>{t('goals.title', 'Goals')}</h1>
        <Button variant="primary" onClick={openCreateModal}>
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
      ) : goals.length === 0 ? (
        <div className="screen-padded">
          <EmptyState
            title={t('goals.noGoals', 'No Goals Yet')}
            description={t(
              'goals.noGoalsDescription',
              'Set a savings target, plan a debt payoff, or commit to giving.'
            )}
            actionLabel={t('goals.createGoal', 'Create Goal')}
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <div className="budgets-section">
          <div className="budget-list">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => navigate(`/goals/${goal.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('goals.createGoal', 'Create Goal')}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!isFormValid()}
            >
              {t('common.create', 'Create')}
            </Button>
          </div>
        }
      >
        <div className="create-budget-form">
          <div className="form-group">
            <label>{t('goals.name', 'Name')}</label>
            <Input
              type="text"
              placeholder={t('goals.namePlaceholder', 'e.g., Emergency Fund')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={255}
            />
          </div>
          <div className="form-group">
            <label>{t('goals.goalType', 'Goal Type')}</label>
            <select
              value={form.goalType}
              onChange={(e) =>
                setForm({ ...emptyForm(), name: form.name, goalType: e.target.value as GoalType })
              }
              className="form-select"
            >
              {GOAL_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === 'save_balance' && t('goals.saveBalance', 'Save Balance')}
                  {type === 'pay_off_credit' && t('goals.payOffCredit', 'Pay Off Credit')}
                  {type === 'reduce_spending' && t('goals.reduceSpending', 'Reduce Spending')}
                  {type === 'spend_target' && t('goals.spendTarget', 'Spend Target')}
                </option>
              ))}
            </select>
          </div>
          {renderTypeSpecificFields()}
          <div className="form-group">
            <label>{t('goals.targetDate', 'Target Date (optional)')}</label>
            <Input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <SideMenu />
    </div>
  );
};

export default GoalsScreen;
