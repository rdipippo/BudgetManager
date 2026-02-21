import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionService, categoryService } from '../services';
import { Transaction, Category } from '../types/budget.types';
import { Spinner, Alert, SideMenu } from '../components';
import { ReportsNav } from '../components/ReportsNav';
import { BarChart, BarChartData } from '../components/BarChart';
import { AmountDisplay } from '../components/AmountDisplay';

interface MonthData {
  year: number;
  month: number;
  income: number;
  expenses: number;
  cashFlow: number;
  categorySpending: number;
}

export const MonthToMonthScreen: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [monthsToShow, setMonthsToShow] = useState(6);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    categoryService.getAll().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [monthsToShow, selectedCategoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const results: MonthData[] = [];

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const filters: Record<string, unknown> = { startDate, endDate, limit: 500 };
        if (selectedCategoryId !== null) {
          filters.categoryId = selectedCategoryId;
        }

        const data = await transactionService.getAll(filters);

        let income = 0;
        let expenses = 0;
        let categorySpending = 0;

        data.transactions.forEach((txn: Transaction) => {
          const amount = parseFloat(String(txn.amount));
          if (selectedCategoryId !== null) {
            categorySpending += Math.abs(amount);
          } else {
            if (amount > 0) {
              income += amount;
            } else {
              expenses += Math.abs(amount);
            }
          }
        });

        results.push({
          year,
          month,
          income,
          expenses,
          cashFlow: income - expenses,
          categorySpending,
        });
      }

      setMonthData(results);
    } catch (err) {
      setError(t('reports.loadError', 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number, year: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || value === null || value === undefined) {
      return '$0';
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const isCategoryMode = selectedCategoryId !== null;

  const chartData: BarChartData[] = monthData.map((data) => ({
    label: `${getMonthName(data.month, data.year)} ${data.year !== new Date().getFullYear() ? data.year : ''}`.trim(),
    values: isCategoryMode
      ? [
          {
            value: data.categorySpending || 0,
            color: selectedCategory?.color || 'var(--color-primary)',
            label: selectedCategory?.name || '',
          },
        ]
      : [
          { value: data.income || 0, color: 'var(--color-success)', label: t('reports.income', 'Income') },
          { value: data.expenses || 0, color: 'var(--color-danger)', label: t('reports.expenses', 'Expenses') },
        ],
  }));

  const totals = monthData.reduce(
    (acc, data) => ({
      income: acc.income + (data.income || 0),
      expenses: acc.expenses + (data.expenses || 0),
      categorySpending: acc.categorySpending + (data.categorySpending || 0),
    }),
    { income: 0, expenses: 0, categorySpending: 0 }
  );

  const averages = {
    income: monthData.length > 0 ? totals.income / monthData.length : 0,
    expenses: monthData.length > 0 ? totals.expenses / monthData.length : 0,
    categorySpending: monthData.length > 0 ? totals.categorySpending / monthData.length : 0,
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="reports-header">
        <h1>{t('reports.monthToMonth', 'Month to Month')}</h1>
        <ReportsNav current="/reports/month-to-month" />
      </div>

      {/* Controls */}
      <div className="month-to-month-controls">
        <label htmlFor="monthsToShow">{t('reports.showMonths', 'Show')}</label>
        <select
          id="monthsToShow"
          value={monthsToShow}
          onChange={(e) => setMonthsToShow(Number(e.target.value))}
          className="month-to-month-select"
        >
          <option value={3}>3 {t('reports.months', 'months')}</option>
          <option value={6}>6 {t('reports.months', 'months')}</option>
          <option value={12}>12 {t('reports.months', 'months')}</option>
        </select>

        {categories.length > 0 && (
          <>
            <label htmlFor="categoryFilter">{t('reports.category', 'Category')}</label>
            <select
              id="categoryFilter"
              value={selectedCategoryId ?? ''}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value === '' ? null : Number(e.target.value))
              }
              className="month-to-month-select"
            >
              <option value="">{t('reports.allCategories', 'All')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : monthData.length === 0 ? (
        <div className="screen-padded">
          <div className="reports-empty">
            <p>{t('reports.noData', 'No data available')}</p>
          </div>
        </div>
      ) : (
        <div className="month-to-month-content">
          {/* Chart Section */}
          <div className="month-to-month-chart-section">
            <h2 className="reports-section-title">
              {isCategoryMode
                ? selectedCategory?.name || t('reports.categorySpending', 'Category Spending')
                : t('reports.incomeVsExpenses', 'Income vs Expenses')}
            </h2>
            <div className="month-to-month-chart-container">
              <BarChart
                data={chartData}
                height={350}
                barWidth={35}
                gap={30}
                formatValue={formatCurrency}
              />
            </div>
          </div>

          {/* Summary Section */}
          <div className="month-to-month-summary">
            <h2 className="reports-section-title">
              {t('reports.periodSummary', 'Period Summary')}
            </h2>

            {isCategoryMode ? (
              <div className="reports-summary-cards">
                <div className="reports-summary-card">
                  <span className="reports-summary-card-label">
                    {t('reports.totalSpending', 'Total Spending')}
                  </span>
                  <AmountDisplay amount={-totals.categorySpending} size="lg" colorize />
                </div>
                <div className="reports-summary-card">
                  <span className="reports-summary-card-label">
                    {t('reports.avgMonthlySpending', 'Avg Monthly Spending')}
                  </span>
                  <AmountDisplay amount={-averages.categorySpending} size="lg" colorize />
                </div>
              </div>
            ) : (
              <div className="reports-summary-cards">
                <div className="reports-summary-card">
                  <span className="reports-summary-card-label">
                    {t('reports.avgIncome', 'Avg Monthly Income')}
                  </span>
                  <AmountDisplay amount={averages.income} size="lg" colorize />
                </div>
                <div className="reports-summary-card">
                  <span className="reports-summary-card-label">
                    {t('reports.avgExpenses', 'Avg Monthly Expenses')}
                  </span>
                  <AmountDisplay amount={-averages.expenses} size="lg" colorize />
                </div>
                <div className="reports-summary-card">
                  <span className="reports-summary-card-label">
                    {t('reports.avgCashFlow', 'Avg Monthly Cash Flow')}
                  </span>
                  <AmountDisplay
                    amount={averages.income - averages.expenses}
                    size="lg"
                    colorize
                  />
                </div>
              </div>
            )}

            {/* Monthly Breakdown Table */}
            <h2 className="reports-section-title" style={{ marginTop: 'var(--spacing-lg)' }}>
              {t('reports.monthlyBreakdown', 'Monthly Breakdown')}
            </h2>

            {isCategoryMode ? (
              <div className="month-to-month-table month-to-month-table--2col">
                <div className="month-to-month-table-header">
                  <div className="month-to-month-table-cell">{t('reports.month', 'Month')}</div>
                  <div className="month-to-month-table-cell">{t('reports.spending', 'Spending')}</div>
                </div>
                {monthData.map((data, index) => (
                  <div key={index} className="month-to-month-table-row">
                    <div className="month-to-month-table-cell">
                      {getMonthName(data.month, data.year)} {data.year}
                    </div>
                    <div className="month-to-month-table-cell">
                      <AmountDisplay amount={-data.categorySpending} size="sm" colorize />
                    </div>
                  </div>
                ))}
                <div className="month-to-month-table-row month-to-month-table-totals">
                  <div className="month-to-month-table-cell">
                    <strong>{t('reports.total', 'Total')}</strong>
                  </div>
                  <div className="month-to-month-table-cell">
                    <AmountDisplay amount={-totals.categorySpending} size="sm" colorize />
                  </div>
                </div>
              </div>
            ) : (
              <div className="month-to-month-table">
                <div className="month-to-month-table-header">
                  <div className="month-to-month-table-cell">{t('reports.month', 'Month')}</div>
                  <div className="month-to-month-table-cell">{t('reports.income', 'Income')}</div>
                  <div className="month-to-month-table-cell">{t('reports.expenses', 'Expenses')}</div>
                  <div className="month-to-month-table-cell">{t('reports.cashFlow', 'Cash Flow')}</div>
                </div>
                {monthData.map((data, index) => (
                  <div key={index} className="month-to-month-table-row">
                    <div className="month-to-month-table-cell">
                      {getMonthName(data.month, data.year)} {data.year}
                    </div>
                    <div className="month-to-month-table-cell">
                      <AmountDisplay amount={data.income} size="sm" colorize />
                    </div>
                    <div className="month-to-month-table-cell">
                      <AmountDisplay amount={-data.expenses} size="sm" colorize />
                    </div>
                    <div className="month-to-month-table-cell">
                      <AmountDisplay amount={data.cashFlow} size="sm" colorize />
                    </div>
                  </div>
                ))}
                <div className="month-to-month-table-row month-to-month-table-totals">
                  <div className="month-to-month-table-cell">
                    <strong>{t('reports.total', 'Total')}</strong>
                  </div>
                  <div className="month-to-month-table-cell">
                    <AmountDisplay amount={totals.income} size="sm" colorize />
                  </div>
                  <div className="month-to-month-table-cell">
                    <AmountDisplay amount={-totals.expenses} size="sm" colorize />
                  </div>
                  <div className="month-to-month-table-cell">
                    <AmountDisplay amount={totals.income - totals.expenses} size="sm" colorize />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthToMonthScreen;
