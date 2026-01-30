import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionService, categoryService, plaidService } from '../services';
import { Transaction, Category, Pagination } from '../types/budget.types';
import { TransactionItem, Spinner, EmptyState, SideMenu, Alert, Input, Button, Modal } from '../components';

interface AccountOption {
  id: number;
  name: string;
  institutionName: string | null;
  isHidden: boolean;
}

export const TransactionsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Transaction form modal state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMerchantName, setFormMerchantName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const hasActiveFilters = search || selectedCategoryId !== undefined || selectedAccountId || startDate || endDate;

  const loadTransactions = useCallback(async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const offset = append && pagination ? pagination.offset + pagination.limit : 0;
      const data = await transactionService.getAll({
        search: search || undefined,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
        offset,
      });

      if (append) {
        setTransactions((prev) => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setPagination(data.pagination);
    } catch (err) {
      setError(t('transactions.loadError', 'Failed to load transactions'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, selectedCategoryId, selectedAccountId, startDate, endDate, pagination, t]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, accountsData] = await Promise.all([
        categoryService.getAll(),
        plaidService.getAllAccounts(),
      ]);
      setCategories(categoriesData);
      setAccounts(accountsData.filter((a) => !a.isHidden));
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategoryId(undefined);
    setSelectedAccountId(undefined);
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTransactions();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedCategoryId, selectedAccountId, startDate, endDate]);

  const handleCategoryClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCategoryModalOpen(true);
  };

  const handleCategorySelect = async (categoryId: number | null) => {
    if (!selectedTransaction) return;

    try {
      await transactionService.updateCategory(selectedTransaction.id, categoryId);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === selectedTransaction.id
            ? {
                ...t,
                category_id: categoryId,
                category_name: categories.find((c) => c.id === categoryId)?.name || null,
                category_color: categories.find((c) => c.id === categoryId)?.color || null,
              }
            : t
        )
      );
      setCategoryModalOpen(false);
      setSelectedTransaction(null);
    } catch (err) {
      setError(t('transactions.categoryError', 'Failed to update category'));
    }
  };

  const handleLoadMore = () => {
    if (pagination?.hasMore && !loadingMore) {
      loadTransactions(true);
    }
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMerchantName('');
    setFormDescription('');
    setFormCategoryId(null);
    setFormNotes('');
    setFormErrors({});
    setTransactionModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormAmount(Math.abs(transaction.amount).toString());
    setFormDate(transaction.date.split('T')[0]);
    setFormMerchantName(transaction.merchant_name || '');
    setFormDescription(transaction.description || '');
    setFormCategoryId(transaction.category_id);
    setFormNotes(transaction.notes || '');
    setFormErrors({});
    setTransactionModalOpen(true);
  };

  const validateTransactionForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const amountNum = parseFloat(formAmount);

    if (!formAmount || isNaN(amountNum) || amountNum <= 0) {
      errors.amount = t('transactionForm.amountRequired', 'Please enter a valid amount');
    }
    if (!formDate) {
      errors.date = t('transactionForm.dateRequired', 'Please select a date');
    }
    if (!formMerchantName.trim() && !formDescription.trim()) {
      errors.merchantName = t('transactionForm.merchantOrDescRequired', 'Please enter a merchant name or description');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTransaction = async () => {
    if (!validateTransactionForm()) return;

    try {
      setSaving(true);
      const data = {
        amount: -Math.abs(parseFloat(formAmount)),
        date: formDate,
        merchantName: formMerchantName.trim() || undefined,
        description: formDescription.trim() || undefined,
        categoryId: formCategoryId || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, data);
      } else {
        await transactionService.create(data);
      }
      setTransactionModalOpen(false);
      loadTransactions();
    } catch (err) {
      setError(t('transactionForm.saveError', 'Failed to save transaction'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction) return;

    if (!window.confirm(t('transactionForm.confirmDelete', 'Are you sure you want to delete this transaction?'))) {
      return;
    }

    try {
      setDeleting(true);
      await transactionService.delete(editingTransaction.id);
      setTransactionModalOpen(false);
      loadTransactions();
    } catch (err) {
      setError(t('transactionForm.deleteError', 'Failed to delete transaction'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="screen screen-with-nav">
      <div className="transactions-header">
        <h1>{t('transactions.title', 'Transactions')}</h1>
        <Button
          variant="primary"
          onClick={openCreateModal}
        >
          +
        </Button>
      </div>

      <div className="transactions-filters">
        <div className="filters-row">
          <Input
            type="text"
            placeholder={t('transactions.search', 'Search transactions...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-row">
          <select
            className="filter-select"
            value={selectedCategoryId === undefined ? '' : selectedCategoryId === null ? 'uncategorized' : selectedCategoryId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') setSelectedCategoryId(undefined);
              else if (val === 'uncategorized') setSelectedCategoryId(null);
              else setSelectedCategoryId(parseInt(val));
            }}
          >
            <option value="">{t('transactions.allCategories', 'All Categories')}</option>
            <option value="uncategorized">{t('transactions.uncategorized', 'Uncategorized')}</option>
            {categories.filter((c) => !c.is_income).map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">{t('transactions.allAccounts', 'All Accounts')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}{account.institutionName ? ` (${account.institutionName})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-row filters-row-dates">
          <div className="date-filter">
            <label>{t('transactions.from', 'From')}</label>
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-filter">
            <label>{t('transactions.to', 'To')}</label>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              type="button"
            >
              {t('transactions.clearFilters', 'Clear')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : transactions.length === 0 ? (
        <div className="screen-padded">
          <EmptyState
            title={t('transactions.noTransactions', 'No Transactions')}
            description={t('transactions.linkAccount', 'Link a bank account or add transactions manually')}
            actionLabel={t('transactions.addManual', 'Add Transaction')}
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <>
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
                onClick={() => openEditModal(transaction)}
                onCategoryClick={() => handleCategoryClick(transaction)}
              />
            ))}
          </div>

          {pagination?.hasMore && (
            <div className="load-more">
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                {t('common.loadMore', 'Load More')}
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={t('transactions.selectCategory', 'Select Category')}
      >
        <div className="category-picker">
          <button
            className="category-picker-item"
            onClick={() => handleCategorySelect(null)}
          >
            <span className="category-picker-dot" style={{ backgroundColor: '#6B7280' }} />
            {t('transactions.uncategorized', 'Uncategorized')}
          </button>
          {categories.filter((c) => !c.is_income).map((category) => (
            <button
              key={category.id}
              className={`category-picker-item ${selectedTransaction?.category_id === category.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="category-picker-dot" style={{ backgroundColor: category.color }} />
              {category.name}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        title={editingTransaction
          ? t('transactionForm.editTitle', 'Edit Transaction')
          : t('transactionForm.createTitle', 'New Transaction')}
        footer={
          <div className="modal-actions">
            {editingTransaction && (
              <Button
                variant="secondary"
                onClick={handleDeleteTransaction}
                loading={deleting}
                className="btn-danger"
              >
                {t('common.delete', 'Delete')}
              </Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="secondary" onClick={() => setTransactionModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTransaction}
              loading={saving}
            >
              {editingTransaction
                ? t('transactionForm.save', 'Save Changes')
                : t('transactionForm.create', 'Add Transaction')}
            </Button>
          </div>
        }
      >
        <div className="transaction-form-modal">
          <Input
            label={t('transactionForm.amount', 'Amount')}
            type="number"
            step="0.01"
            min="0"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            error={formErrors.amount}
            placeholder="0.00"
          />

          <Input
            label={t('transactionForm.date', 'Date')}
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            error={formErrors.date}
          />

          <Input
            label={t('transactionForm.merchantName', 'Merchant Name')}
            type="text"
            value={formMerchantName}
            onChange={(e) => setFormMerchantName(e.target.value)}
            error={formErrors.merchantName}
            placeholder={t('transactionForm.merchantPlaceholder', 'e.g., Coffee Shop')}
          />

          <Input
            label={t('transactionForm.description', 'Description')}
            type="text"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder={t('transactionForm.descriptionPlaceholder', 'Optional description')}
          />

          <div className="form-field">
            <label className="input-label">{t('transactionForm.category', 'Category')}</label>
            <select
              className="category-select"
              value={formCategoryId || ''}
              onChange={(e) => setFormCategoryId(e.target.value ? parseInt(e.target.value) : null)}
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
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={t('transactionForm.notesPlaceholder', 'Add any notes...')}
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <SideMenu />
    </div>
  );
};

export default TransactionsScreen;
