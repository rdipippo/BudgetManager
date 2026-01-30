import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionService, categoryService } from '../services';
import { Transaction, Category } from '../types/budget.types';
import { Spinner, Alert, Button, Input } from '../components';

export const TransactionFormScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isEditMode = id !== undefined && id !== 'new';

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const cats = await categoryService.getAll();
      setCategories(cats);

      if (isEditMode) {
        const txn = await transactionService.getById(parseInt(id!));
        setTransaction(txn);
        setAmount(Math.abs(txn.amount).toString());
        setDate(txn.date.split('T')[0]);
        setMerchantName(txn.merchant_name || '');
        setDescription(txn.description || '');
        setNotes(txn.notes || '');
        setCategoryId(txn.category_id);
      }
    } catch (err) {
      setError(t('transactionForm.loadError', 'Failed to load transaction'));
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = t('transactionForm.amountRequired', 'Please enter a valid amount');
    }

    if (!date) {
      newErrors.date = t('transactionForm.dateRequired', 'Please select a date');
    }

    if (!merchantName.trim() && !description.trim()) {
      newErrors.merchantName = t('transactionForm.merchantOrDescRequired', 'Please enter a merchant name or description');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSaving(true);
      setError(null);

      const amountNum = parseFloat(amount);
      const data = {
        amount: -Math.abs(amountNum),
        date,
        merchantName: merchantName.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryId: categoryId || undefined,
      };

      if (isEditMode) {
        await transactionService.update(parseInt(id!), data);
      } else {
        await transactionService.create(data);
      }

      navigate('/transactions');
    } catch (err: unknown) {
      setError(t('transactionForm.saveError', 'Failed to save transaction'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (!window.confirm(t('transactionForm.confirmDelete', 'Are you sure you want to delete this transaction?'))) {
      return;
    }

    try {
      setDeleting(true);
      await transactionService.delete(transaction.id);
      navigate('/transactions');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('manual')) {
        setError(t('transactionForm.cannotDeletePlaid', 'Cannot delete transactions synced from your bank'));
      } else {
        setError(t('transactionForm.deleteError', 'Failed to delete transaction'));
      }
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="screen">
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  const pageTitle = isEditMode
    ? t('transactionForm.editTitle', 'Edit Transaction')
    : t('transactionForm.createTitle', 'New Transaction');

  return (
    <div className="screen">
      <div className="transaction-form-header">
        <button className="back-button" onClick={() => navigate('/transactions')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{pageTitle}</h1>
        {isEditMode && transaction?.is_manual && (
          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={deleting}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>

      <div className="screen-padded">
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="transaction-form">
          <Input
            label={t('transactionForm.amount', 'Amount')}
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            placeholder="0.00"
          />

          <Input
            label={t('transactionForm.date', 'Date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />

          <Input
            label={t('transactionForm.merchantName', 'Merchant Name')}
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            error={errors.merchantName}
            placeholder={t('transactionForm.merchantPlaceholder', 'e.g., Coffee Shop')}
          />

          <Input
            label={t('transactionForm.description', 'Description')}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('transactionForm.descriptionPlaceholder', 'Optional description')}
          />

          <div className="form-field">
            <label className="input-label">{t('transactionForm.category', 'Category')}</label>
            <select
              className="category-select"
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">{t('transactionForm.uncategorized', 'Uncategorized')}</option>
              {categories.filter((c) => !c.is_income).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="input-label">{t('transactionForm.notes', 'Notes')}</label>
            <textarea
              className="notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('transactionForm.notesPlaceholder', 'Add any notes...')}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/transactions')}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              {isEditMode
                ? t('transactionForm.save', 'Save Changes')
                : t('transactionForm.create', 'Add Transaction')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionFormScreen;
