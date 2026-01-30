import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlaidLink } from 'react-plaid-link';
import { plaidService } from '../services';
import { PlaidItem } from '../types/budget.types';
import { Spinner, Alert, Button, EmptyState, AmountDisplay, SideMenu } from '../components';

export const AccountsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plaidService.getItems();
      setItems(data);
    } catch (err) {
      setError(t('accounts.loadError', 'Failed to load accounts'));
    } finally {
      setLoading(false);
    }
  };

  const generateLinkToken = async () => {
    try {
      const token = await plaidService.createLinkToken();
      setLinkToken(token);
    } catch (err) {
      setError(t('accounts.linkError', 'Failed to initialize bank connection'));
    }
  };

  useEffect(() => {
    loadItems();
    generateLinkToken();
  }, []);

  const onSuccess = useCallback(async (publicToken: string) => {
    try {
      setLoading(true);
      await plaidService.exchangeToken(publicToken);
      await loadItems();
      generateLinkToken();
    } catch (err) {
      setError(t('accounts.linkError', 'Failed to link account'));
    } finally {
      setLoading(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const handleSync = async (itemId: number) => {
    try {
      setSyncing(itemId);
      await plaidService.syncItem(itemId);
      await loadItems();
    } catch (err) {
      setError(t('accounts.syncError', 'Failed to sync transactions'));
    } finally {
      setSyncing(null);
    }
  };

  const handleUnlink = async (itemId: number) => {
    if (!window.confirm(t('accounts.confirmUnlink', 'Are you sure you want to unlink this account?'))) {
      return;
    }

    try {
      await plaidService.deleteItem(itemId);
      await loadItems();
    } catch (err) {
      setError(t('accounts.unlinkError', 'Failed to unlink account'));
    }
  };

  const handleToggleVisibility = async (accountId: number, currentlyHidden: boolean) => {
    try {
      await plaidService.setAccountHidden(accountId, !currentlyHidden);
      await loadItems();
    } catch (err) {
      setError(t('accounts.visibilityError', 'Failed to update account visibility'));
    }
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="accounts-header">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{t('accounts.title', 'Linked Accounts')}</h1>
      </div>

      {error && (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="screen-padded">
          <EmptyState
            title={t('accounts.noAccounts', 'No Linked Accounts')}
            description={t('accounts.linkFirst', 'Link your bank account to automatically sync transactions')}
            actionLabel={t('accounts.linkAccount', 'Link Bank Account')}
            onAction={() => open()}
          />
        </div>
      ) : (
        <>
          <div className="accounts-list">
            {items.map((item) => (
              <div key={item.id} className={`account-item ${item.status !== 'active' ? 'account-item-error' : ''}`}>
                <div className="account-item-header">
                  <div className="account-item-institution">
                    <span className="account-item-name">{item.institutionName || 'Unknown Bank'}</span>
                    {item.status !== 'active' && (
                      <span className="account-item-status">{item.status === 'error' ? 'Error' : 'Expiring'}</span>
                    )}
                  </div>
                  <div className="account-item-actions">
                    <button
                      className="account-action-btn"
                      onClick={() => handleSync(item.id)}
                      disabled={syncing === item.id}
                      title={t('accounts.sync', 'Sync')}
                    >
                      {syncing === item.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                      )}
                    </button>
                    <button
                      className="account-action-btn account-action-danger"
                      onClick={() => handleUnlink(item.id)}
                      title={t('accounts.unlink', 'Unlink')}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {item.errorMessage && (
                  <div className="account-item-error-message">{item.errorMessage}</div>
                )}

                <div className="account-item-accounts">
                  {item.accounts.map((account) => (
                    <div key={account.id} className={`sub-account ${account.isHidden ? 'sub-account-hidden' : ''}`}>
                      <div className="sub-account-info">
                        <span className="sub-account-name">{account.name}</span>
                        <span className="sub-account-type">{account.subtype || account.type}</span>
                        {account.mask && <span className="sub-account-mask">****{account.mask}</span>}
                      </div>
                      <div className="sub-account-actions">
                        {account.currentBalance !== null && (
                          <AmountDisplay amount={account.currentBalance} size="sm" />
                        )}
                        <button
                          className="visibility-toggle"
                          onClick={() => handleToggleVisibility(account.id, account.isHidden)}
                          title={account.isHidden ? t('accounts.showAccount', 'Show account') : t('accounts.hideAccount', 'Hide account')}
                        >
                          {account.isHidden ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {item.lastSyncAt && (
                  <div className="account-item-sync">
                    {t('accounts.lastSync', 'Last synced')}: {new Date(item.lastSyncAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="accounts-add">
            <Button
              variant="primary"
              fullWidth
              onClick={() => open()}
              disabled={!ready}
            >
              {t('accounts.linkAnother', 'Link Another Account')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountsScreen;
