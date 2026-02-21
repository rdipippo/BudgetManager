import React, { useEffect, useState, useCallback } from 'react';
import { Spinner, Alert, SideMenu } from '../components';
import { ReportsNav } from '../components/ReportsNav';
import { LineChart, LineChartSeries } from '../components/LineChart';
import { plaidService } from '../services';
import { PlaidItem } from '../types/budget.types';

const LINE_COLORS = [
  '#4F86F7', '#F7B731', '#26de81', '#FC5C65',
  '#45AAF2', '#A55EEA', '#FD9644', '#2BCBBA',
];

interface AccountInfo {
  id: number;
  name: string;
  institutionName: string | null;
  colorIndex: number;
}

interface BalanceHistory {
  id: number;
  name: string;
  currentBalance: number | null;
  history: { date: string; balance: number | null }[];
}

export const AccountReportScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [days, setDays] = useState(30);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histories, setHistories] = useState<BalanceHistory[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadHistory = useCallback(async (ids: Set<number>, numDays: number) => {
    if (ids.size === 0) {
      setHistories([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const data = await plaidService.getBalanceHistory(Array.from(ids), numDays);
      setHistories(data.accounts);
    } catch {
      setError('Failed to load balance history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(selectedIds, days);
  }, [selectedIds, days, loadHistory]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const items: PlaidItem[] = await plaidService.getItems();
      let colorIdx = 0;
      const allAccounts: AccountInfo[] = [];
      items.forEach((item) => {
        item.accounts.forEach((account) => {
          allAccounts.push({ id: account.id, name: account.name, institutionName: item.institutionName, colorIndex: colorIdx++ });
        });
      });
      setAccounts(allAccounts);
      const defaultSelected = new Set(
        items.flatMap((item) =>
          item.accounts.filter((a) => !a.isHidden).map((a) => a.id)
        )
      );
      setSelectedIds(defaultSelected);
    } catch {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const accountColorMap = new Map(accounts.map((a) => [a.id, LINE_COLORS[a.colorIndex % LINE_COLORS.length]]));

  const chartSeries: LineChartSeries[] = histories
    .filter((h) => selectedIds.has(h.id) && h.history.length > 0)
    .map((h) => ({
      label: h.name,
      color: accountColorMap.get(h.id) || LINE_COLORS[0],
      data: h.history.map((p) => ({ date: p.date, value: p.balance })),
    }));

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="reports-header">
        <h1>Account Report</h1>
        <ReportsNav current="/reports/account-balances" />
      </div>

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      ) : accounts.length === 0 ? (
        <div className="screen-padded">
          <div className="reports-empty">
            <p>No linked accounts. Link an account to see balance history.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="month-to-month-controls">
            <label htmlFor="periodSelect">Period</label>
            <select
              id="periodSelect"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="month-to-month-select"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          <div className="month-to-month-content">
            <div className="month-to-month-chart-section">
              {historyLoading ? (
                <div className="screen-centered" style={{ height: 350 }}>
                  <Spinner />
                </div>
              ) : chartSeries.length === 0 ? (
                <div className="reports-empty">
                  <p>No balance history for the selected period.</p>
                </div>
              ) : (
                <div className="month-to-month-chart-container">
                  <LineChart
                    series={chartSeries}
                    height={350}
                    formatValue={formatCurrency}
                    showLegend={false}
                  />
                </div>
              )}
            </div>

            <div className="account-report-toggle-list">
              {accounts.map((account) => {
                const color = LINE_COLORS[account.colorIndex % LINE_COLORS.length];
                const label = account.institutionName
                  ? `${account.institutionName} — ${account.name}`
                  : account.name;
                return (
                  <label key={account.id} className="account-report-toggle-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(account.id)}
                      onChange={() => toggleAccount(account.id)}
                    />
                    <span className="account-report-account-dot" style={{ backgroundColor: color }} />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountReportScreen;
