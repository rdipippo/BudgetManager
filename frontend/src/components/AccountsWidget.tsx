import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlaidItem } from '../types/budget.types';
import { AmountDisplay } from './AmountDisplay';

interface AccountsWidgetProps {
  accounts: PlaidItem[];
}

export const AccountsWidget: React.FC<AccountsWidgetProps> = ({ accounts }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const totalBalance = accounts.reduce((sum, item) => {
    const itemAccounts = item.accounts || [];
    return sum + itemAccounts
      .filter(acc => !acc.isHidden)
      .reduce((accSum, acc) => {
        const balance = Number(acc.currentBalance) || 0;
        return accSum + balance;
      }, 0);
  }, 0);

  const hasErrors = accounts.some(item => item.status !== 'active');

  return (
    <div className="dashboard-widget">
      <div className="dashboard-widget-header">
        <h2 className="dashboard-widget-title">{t('dashboard.linkedAccounts', 'Linked Accounts')}</h2>
        <button className="dashboard-widget-link" onClick={() => navigate('/accounts')}>
          {t('dashboard.manage', 'Manage')}
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="dashboard-widget-empty">
          <p>{t('dashboard.noAccountsLinked', 'No accounts linked')}</p>
          <button className="dashboard-widget-link" onClick={() => navigate('/accounts')}>
            {t('accounts.linkAccount', 'Link Bank Account')}
          </button>
        </div>
      ) : (
        <div className="accounts-widget-content">
          {hasErrors && (
            <div className="accounts-widget-warning">
              {t('dashboard.accountsNeedAttention', 'Some accounts need attention')}
            </div>
          )}

          <div className="accounts-widget-total">
            <span className="accounts-widget-total-label">{t('dashboard.totalBalance', 'Total Balance')}</span>
            <AmountDisplay amount={totalBalance} size="lg" />
          </div>

          <div className="accounts-widget-list">
            {accounts.map((item) => (
              <div key={item.id} className={`accounts-widget-institution ${item.status !== 'active' ? 'accounts-widget-institution-error' : ''}`}>
                <div className="accounts-widget-institution-header">
                  <span className="accounts-widget-institution-name">
                    {item.institutionName || t('accounts.unknownBank', 'Unknown Bank')}
                  </span>
                  {item.status !== 'active' && (
                    <span className="accounts-widget-status">
                      {item.status === 'error' ? t('accounts.error', 'Error') : t('accounts.expiring', 'Expiring')}
                    </span>
                  )}
                </div>

                <div className="accounts-widget-accounts">
                  {(item.accounts || []).filter(acc => !acc.isHidden).map((account) => (
                    <div key={account.id} className="accounts-widget-account">
                      <div className="accounts-widget-account-info">
                        <span className="accounts-widget-account-name">{account.name}</span>
                        <span className="accounts-widget-account-type">
                          {account.subtype || account.type}
                          {account.mask && ` ****${account.mask}`}
                        </span>
                      </div>
                      <div className="accounts-widget-account-balance">
                        {account.currentBalance != null && (
                          <AmountDisplay amount={Number(account.currentBalance)} size="sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
