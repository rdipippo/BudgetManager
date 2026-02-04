import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionService, categoryService } from '../services';
import { Transaction, Category } from '../types/budget.types';
import { Spinner, Alert, SideMenu, Modal } from '../components';
import { PieChart } from '../components/PieChart';
import { AmountDisplay } from '../components/AmountDisplay';

interface CategorySpending {
  categoryId: number | null;
  categoryName: string;
  categoryColor: string;
  amount: number;
  transactions: Transaction[];
}

export const ReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategorySpending | null>(null);
  const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadReport();
  }, [selectedYear, selectedMonth, categories]);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadReport = async () => {
    if (categories.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Calculate date range for the selected month
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

      // Fetch all transactions for the month (max 500 per API limit)
      const data = await transactionService.getAll({
        startDate,
        endDate,
        limit: 500,
      });

      // Group spending by category (only expenses, not income)
      const spendingMap = new Map<number | null, { amount: number; transactions: Transaction[] }>();
      let incomeTotal = 0;

      data.transactions.forEach((txn: Transaction) => {
        if (txn.amount < 0) { // Expenses
          const current = spendingMap.get(txn.category_id) || { amount: 0, transactions: [] };
          current.amount += Math.abs(txn.amount);
          current.transactions.push(txn);
          spendingMap.set(txn.category_id, current);
        } else if (txn.amount > 0) { // Income
          incomeTotal += txn.amount;
        }
      });

      setTotalIncome(incomeTotal);

      // Convert to array with category details
      const spending: CategorySpending[] = [];

      spendingMap.forEach((data, categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        spending.push({
          categoryId,
          categoryName: category?.name || t('reports.uncategorized', 'Uncategorized'),
          categoryColor: category?.color || '#6B7280',
          amount: data.amount,
          transactions: data.transactions,
        });
      });

      // Sort by amount descending
      spending.sort((a, b) => b.amount - a.amount);

      setCategorySpending(spending);
    } catch (err) {
      setError(t('reports.loadError', 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const getMonthName = (month: number) => {
    return new Date(selectedYear, month - 1).toLocaleString('default', { month: 'long' });
  };

  const totalSpending = categorySpending.reduce((sum, item) => sum + item.amount, 0);

  const pieChartData = categorySpending.map(item => ({
    label: item.categoryName,
    value: item.amount,
    color: item.categoryColor,
  }));

  const handleCategoryClick = (index: number) => {
    const category = categorySpending[index];
    if (category) {
      setSelectedCategory(category);
      setTransactionsModalOpen(true);
    }
  };

  const closeTransactionsModal = () => {
    setTransactionsModalOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="reports-header">
        <h1>{t('reports.title', 'Reports')}</h1>
        <Link to="/reports/month-to-month" className="reports-nav-link">
          {t('reports.viewMonthToMonth', 'View Month to Month')}
        </Link>
      </div>

      {/* Month Navigation */}
      <div className="dashboard-period-nav">
        <button className="period-nav-btn" onClick={goToPreviousMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="period-nav-current">
          <span className="period-nav-month">{getMonthName(selectedMonth)} {selectedYear}</span>
          {!isCurrentMonth && (
            <button className="period-nav-today" onClick={goToCurrentMonth}>
              {t('reports.currentMonth', 'Current Month')}
            </button>
          )}
        </div>
        <button className="period-nav-btn" onClick={goToNextMonth} disabled={isCurrentMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : categorySpending.length === 0 ? (
        <div className="screen-padded">
          <div className="reports-empty">
            <p>{t('reports.noSpending', 'No spending recorded for this month')}</p>
          </div>
        </div>
      ) : (
        <div className="reports-content">
          <div className="reports-chart-section">
            <h2 className="reports-section-title">{t('reports.spendingByCategory', 'Spending by Category')}</h2>
            <div className="reports-chart-container">
              <PieChart data={pieChartData} size={500} onSliceClick={handleCategoryClick} />
            </div>
          </div>

          <div className="reports-legend-section">
            {/* Summary Cards Row */}
            <div className="reports-summary-cards">
              <div className="reports-summary-card">
                <span className="reports-summary-card-label">{t('reports.income', 'Income')}</span>
                <AmountDisplay amount={totalIncome} size="lg" colorize />
              </div>
              <div className="reports-summary-card">
                <span className="reports-summary-card-label">{t('reports.totalExpenses', 'Total Expenses')}</span>
                <AmountDisplay amount={-totalSpending} size="lg" colorize />
              </div>
              <div className="reports-summary-card">
                <span className="reports-summary-card-label">{t('reports.cashFlow', 'Cash Flow')}</span>
                <AmountDisplay amount={totalIncome - totalSpending} size="lg" colorize />
              </div>
            </div>

            {/* Breakdown Section */}
            <h2 className="reports-section-title">{t('reports.breakdown', 'Breakdown')}</h2>
            <div className="reports-legend">
              {categorySpending.map((item, index) => {
                const percentage = totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="reports-legend-item reports-legend-item-clickable"
                    onClick={() => handleCategoryClick(index)}
                  >
                    <div className="reports-legend-color" style={{ backgroundColor: item.categoryColor }} />
                    <div className="reports-legend-info">
                      <span className="reports-legend-name">{item.categoryName}</span>
                      <span className="reports-legend-percentage">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="reports-legend-amount">
                      <AmountDisplay amount={-item.amount} size="sm" colorize />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      <Modal
        isOpen={transactionsModalOpen}
        onClose={closeTransactionsModal}
        title={selectedCategory?.categoryName || ''}
        size="lg"
      >
        {selectedCategory && (
          <div className="reports-transactions-modal">
            <div className="reports-transactions-summary">
              <span>{t('reports.transactionCount', '{{count}} transactions', { count: selectedCategory.transactions.length })}</span>
              <AmountDisplay amount={-selectedCategory.amount} size="md" colorize />
            </div>
            <div className="reports-transactions-list">
              {selectedCategory.transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((txn) => (
                  <div key={txn.id} className="reports-transaction-item">
                    <div className="reports-transaction-info">
                      <span className="reports-transaction-name">
                        {txn.merchant_name || txn.description || t('reports.unnamed', 'Unnamed')}
                      </span>
                      <span className="reports-transaction-date">
                        {new Date(txn.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="reports-transaction-amount">
                      <AmountDisplay amount={txn.amount} size="sm" colorize />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportsScreen;
