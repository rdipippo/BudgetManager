import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionService, categoryService, plaidService, settingsService } from '../services';
import { Transaction, Category, Pagination } from '../types/budget.types';
import { TransactionItem, Spinner, EmptyState, SideMenu, Alert, Input, Button, Modal, CategoryList } from '../components';

interface AccountOption {
  id: number;
  name: string;
  institutionName: string | null;
  isHidden: boolean;
}

export const TransactionsScreen: React.FC = () => {
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

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | null | undefined>(undefined);
  const [bulkNotes, setBulkNotes] = useState<string | undefined>(undefined);
  const [bulkDate, setBulkDate] = useState<string | undefined>(undefined);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Sort and column visibility state
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'date', 'category', 'amount']);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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
        sortField,
        sortDirection,
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
  }, [search, selectedCategoryId, selectedAccountId, startDate, endDate, pagination, t, sortField, sortDirection]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, accountsData, prefsData] = await Promise.all([
        categoryService.getAll(),
        plaidService.getAllAccounts(),
        settingsService.getTransactionPreferences(),
      ]);
      setCategories(categoriesData);
      setAccounts(accountsData.filter((a) => !a.isHidden));
      setVisibleColumns(prefsData.visibleColumns);
      setSortField(prefsData.sortField);
      setSortDirection(prefsData.sortDirection);
      setPrefsLoaded(true);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setPrefsLoaded(true);
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
    if (!prefsLoaded) return;
    const timeoutId = setTimeout(() => {
      loadTransactions();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, selectedCategoryId, selectedAccountId, startDate, endDate, sortField, sortDirection, prefsLoaded]);

  // Clear selections when exiting selection mode or when transactions change
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

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
    if (selectionMode) return; // Don't open edit modal in selection mode
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

  // Multi-select handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const handleSelectionChange = (id: number, isSelected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const openBulkEditModal = () => {
    setBulkCategoryId(undefined);
    setBulkNotes(undefined);
    setBulkDate(undefined);
    setBulkEditModalOpen(true);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBulkSaving(true);
      const updates: { categoryId?: number | null; notes?: string | null; date?: string } = {};

      if (bulkCategoryId !== undefined) {
        updates.categoryId = bulkCategoryId;
      }
      if (bulkNotes !== undefined) {
        updates.notes = bulkNotes || null;
      }
      if (bulkDate !== undefined && bulkDate !== '') {
        updates.date = bulkDate;
      }

      if (Object.keys(updates).length === 0) {
        setError(t('bulkEdit.noChanges', 'Please make at least one change'));
        setBulkSaving(false);
        return;
      }

      await transactionService.bulkUpdate(Array.from(selectedIds), updates);
      setBulkEditModalOpen(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
      loadTransactions();
    } catch (err) {
      setError(t('bulkEdit.error', 'Failed to update transactions'));
    } finally {
      setBulkSaving(false);
    }
  };

  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < transactions.length;

  // Sort and column visibility handlers
  const handleSort = async (field: string) => {
    const newDirection = sortField === field && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
    try {
      await settingsService.updateTransactionPreferences({ sortField: field, sortDirection: newDirection });
    } catch (err) {
      console.error('Failed to save sort preferences:', err);
    }
  };

  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev) => {
      if (prev.includes(column)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== column);
      }
      return [...prev, column];
    });
  };

  const saveColumnPreferences = async () => {
    try {
      await settingsService.updateTransactionPreferences({ visibleColumns });
      setColumnSettingsOpen(false);
    } catch (err) {
      setError(t('transactions.prefsSaveError', 'Failed to save preferences'));
    }
  };

  const allColumns = [
    { id: 'name', label: t('transactions.name', 'Name'), sortable: true },
    { id: 'date', label: t('transactions.date', 'Date'), sortable: true },
    { id: 'category', label: t('transactions.category', 'Category'), sortable: true },
    { id: 'amount', label: t('transactions.amount', 'Amount'), sortable: true },
    { id: 'account', label: t('transactions.account', 'Account'), sortable: false },
    { id: 'notes', label: t('transactions.notes', 'Notes'), sortable: false },
  ];

  const displayedColumns = allColumns.filter((col) => visibleColumns.includes(col.id));

  return (
    <div className="screen screen-with-nav">
      <div className="transactions-header">
        <h1>{t('transactions.title', 'Transactions')}</h1>
        <div className="transactions-header-actions">
          <button
            className="icon-button"
            onClick={() => setColumnSettingsOpen(true)}
            title={t('transactions.columnSettings', 'Column Settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <Button
            variant={selectionMode ? 'primary' : 'secondary'}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? t('transactions.done', 'Done') : t('transactions.select', 'Select')}
          </Button>
          {!selectionMode && (
            <Button
              variant="primary"
              onClick={openCreateModal}
            >
              +
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="bulk-actions-toolbar">
          <span className="bulk-actions-count">
            {t('bulkEdit.selected', '{{count}} selected', { count: selectedIds.size })}
          </span>
          <Button variant="primary" onClick={openBulkEditModal}>
            {t('bulkEdit.edit', 'Edit Selected')}
          </Button>
        </div>
      )}

      <div className="transactions-filters">
        <div className="filters-row">
          <Input
            type="text"
            placeholder={t('transactions.search', 'Search transactions...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            {categories.map((cat) => (
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
          <div className="date-filter">
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

            <span className="filter-label">{t('transactions.to', 'To')}</span>

          <div className="date-filter">
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
          <div className={`transaction-list ${selectionMode ? 'transaction-list-selectable' : ''}`} style={{ '--col-count': displayedColumns.length } as React.CSSProperties}>
            <div className={`transaction-list-header transaction-list-header-dynamic ${selectionMode ? 'transaction-list-header-selectable' : ''}`} style={{ gridTemplateColumns: selectionMode ? `40px repeat(${displayedColumns.length}, 1fr)` : `repeat(${displayedColumns.length}, 1fr)` }}>
              {selectionMode && (
                <div className="transaction-list-header-checkbox">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="checkbox"
                  />
                </div>
              )}
              {displayedColumns.map((col) => (
                <div
                  key={col.id}
                  className={`transaction-list-header-cell ${col.sortable ? 'sortable' : ''} ${sortField === col.id ? 'sorted' : ''}`}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  {col.label}
                  {col.sortable && sortField === col.id && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </div>
              ))}
            </div>
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onClick={selectionMode ? undefined : () => openEditModal(transaction)}
                onCategoryClick={selectionMode ? undefined : () => handleCategoryClick(transaction)}
                selectable={selectionMode}
                selected={selectedIds.has(transaction.id)}
                onSelectionChange={handleSelectionChange}
                visibleColumns={visibleColumns}
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
        <CategoryList
          categories={categories}
          mode="select"
          selectedCategoryId={selectedTransaction?.category_id}
          showUncategorized
          onSelect={handleCategorySelect}
        />
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
              {categories.map((cat) => (
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

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={bulkEditModalOpen}
        onClose={() => setBulkEditModalOpen(false)}
        title={t('bulkEdit.title', 'Edit {{count}} Transactions', { count: selectedIds.size })}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setBulkEditModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkUpdate}
              loading={bulkSaving}
            >
              {t('bulkEdit.apply', 'Apply Changes')}
            </Button>
          </div>
        }
      >
        <div className="bulk-edit-form">
          <p className="bulk-edit-hint">
            {t('bulkEdit.hint', 'Only fill in the fields you want to change. Empty fields will not be modified.')}
          </p>

          <div className="form-field">
            <label className="input-label">{t('bulkEdit.category', 'Category')}</label>
            <select
              className="category-select"
              value={bulkCategoryId === undefined ? '' : bulkCategoryId === null ? 'uncategorized' : bulkCategoryId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setBulkCategoryId(undefined);
                else if (val === 'uncategorized') setBulkCategoryId(null);
                else setBulkCategoryId(parseInt(val));
              }}
            >
              <option value="">{t('bulkEdit.noChange', '-- No change --')}</option>
              <option value="uncategorized">{t('transactions.uncategorized', 'Uncategorized')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="input-label">{t('bulkEdit.date', 'Date')}</label>
            <input
              type="date"
              className="date-input bulk-edit-date"
              value={bulkDate || ''}
              onChange={(e) => setBulkDate(e.target.value || undefined)}
            />
            <span className="form-help">{t('bulkEdit.dateHelp', 'Leave empty to keep original dates')}</span>
          </div>

          <div className="form-field">
            <label className="input-label">{t('bulkEdit.notes', 'Notes')}</label>
            <textarea
              className="notes-textarea"
              value={bulkNotes ?? ''}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder={t('bulkEdit.notesPlaceholder', 'Leave empty to keep original notes')}
              rows={3}
            />
            <span className="form-help">{t('bulkEdit.notesHelp', 'Enter text to replace notes, or leave empty to keep original')}</span>
          </div>
        </div>
      </Modal>

      {/* Column Settings Modal */}
      <Modal
        isOpen={columnSettingsOpen}
        onClose={() => setColumnSettingsOpen(false)}
        title={t('transactions.columnSettings', 'Column Settings')}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setColumnSettingsOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={saveColumnPreferences}>
              {t('common.save', 'Save')}
            </Button>
          </div>
        }
      >
        <div className="column-settings-list">
          {allColumns.map((col) => (
            <label key={col.id} className="column-settings-item">
              <input
                type="checkbox"
                className="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => handleColumnToggle(col.id)}
                disabled={visibleColumns.length === 1 && visibleColumns.includes(col.id)}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      </Modal>

      <SideMenu />
    </div>
  );
};

export default TransactionsScreen;
