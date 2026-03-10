import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, Alert, Spinner, SideMenu } from '../components';
import { invitationService, plaidService } from '../services';
import type { Invitation, Member } from '../services';
import type { PlaidItem } from '../types/budget.types';
import { AxiosError } from 'axios';

type AccessType = 'full' | 'partial' | 'advisor';
type ActiveTab = 'invite' | 'pending' | 'members';

export const InvitationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('invite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [accessType, setAccessType] = useState<AccessType>('full');
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Pending invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (plaidItems.length > 0) return;
    setLoadingAccounts(true);
    try {
      const items = await plaidService.getItems();
      setPlaidItems(items);
    } catch {
      // ignore
    } finally {
      setLoadingAccounts(false);
    }
  }, [plaidItems.length]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const { invitations: data } = await invitationService.getInvitations();
      setInvitations(data);
    } catch {
      // ignore
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const { members: data } = await invitationService.getMembers();
      setMembers(data);
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'invite') {
      loadAccounts();
    } else if (activeTab === 'pending') {
      loadInvitations();
    } else if (activeTab === 'members') {
      loadMembers();
    }
  }, [activeTab, loadAccounts, loadInvitations, loadMembers]);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError(t('validation.emailRequired', 'Email is required'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('validation.emailInvalid', 'Please enter a valid email address'));
      return false;
    }
    return true;
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailError('');

    if (!validateEmail(inviteEmail)) return;

    if (accessType === 'partial' && selectedAccountIds.length === 0) {
      setError(t('invitations.selectAccountsRequired', 'Please select at least one account for partial access'));
      return;
    }

    setLoading(true);
    try {
      await invitationService.sendInvitation({
        email: inviteEmail,
        accessType,
        allowedAccountIds: accessType === 'partial' ? selectedAccountIds : undefined,
      });
      setSuccess(t('invitations.inviteSent', 'Invitation sent successfully!'));
      setInviteEmail('');
      setSelectedAccountIds([]);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: string }>;
      if (axiosError.response?.status === 409) {
        setError(t('invitations.alreadyMember', 'This person is already a member of your account'));
      } else if (axiosError.response?.status === 403) {
        setError(t('invitations.noPermission', 'You do not have permission to send invitations'));
      } else if (axiosError.response?.data?.error) {
        setError(axiosError.response.data.error);
      } else {
        setError(t('errors.serverError', 'An error occurred. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvitation = async (id: number) => {
    try {
      await invitationService.revokeInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      setError(t('errors.serverError', 'Failed to revoke invitation'));
    }
  };

  const handleRemoveMember = async (id: number) => {
    try {
      await invitationService.removeMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError(t('errors.serverError', 'Failed to remove member'));
    }
  };

  const toggleAccountId = (id: number) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const accessTypeLabels: Record<AccessType, string> = {
    full: t('invitations.accessFull', 'Full Access'),
    partial: t('invitations.accessPartial', 'Partial Access'),
    advisor: t('invitations.accessAdvisor', 'Financial Advisor'),
  };

  const accessTypeDescriptions: Record<AccessType, string> = {
    full: t('invitations.accessFullDesc', 'Full access to all data. Can also send invitations.'),
    partial: t('invitations.accessPartialDesc', 'Can view selected accounts and manage their own budgets.'),
    advisor: t('invitations.accessAdvisorDesc', 'Full read access. Can add transactions but cannot delete transactions or manage accounts.'),
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const getMemberName = (member: Member) => {
    if (member.member_first_name || member.member_last_name) {
      return [member.member_first_name, member.member_last_name].filter(Boolean).join(' ');
    }
    return member.member_email;
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />

      <div className="screen-header">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{t('invitations.title', 'Invitations')}</h1>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-button${activeTab === 'invite' ? ' tab-button--active' : ''}`}
          onClick={() => { setActiveTab('invite'); setError(''); setSuccess(''); }}
        >
          {t('invitations.tabInvite', 'Invite')}
        </button>
        <button
          className={`tab-button${activeTab === 'pending' ? ' tab-button--active' : ''}`}
          onClick={() => { setActiveTab('pending'); setError(''); setSuccess(''); }}
        >
          {t('invitations.tabPending', 'Pending')}
        </button>
        <button
          className={`tab-button${activeTab === 'members' ? ' tab-button--active' : ''}`}
          onClick={() => { setActiveTab('members'); setError(''); setSuccess(''); }}
        >
          {t('invitations.tabMembers', 'Members')}
        </button>
      </div>

      <div className="screen-content">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <form onSubmit={handleSendInvite}>
            <p className="screen-description">
              {t('invitations.inviteDescription', 'Invite someone to access your Budget Manager account.')}
            </p>

            <div className="form-group">
              <Input
                label={t('invitations.inviteEmail', 'Email Address')}
                type="email"
                name="inviteEmail"
                placeholder={t('invitations.inviteEmailPlaceholder', 'Enter their email address')}
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            <div className="form-group">
              <label className="input-label">{t('invitations.accessType', 'Access Type')}</label>
              <div className="access-type-options">
                {(['full', 'partial', 'advisor'] as AccessType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`access-type-option${accessType === type ? ' access-type-option--selected' : ''}`}
                    onClick={() => { setAccessType(type); setSelectedAccountIds([]); }}
                  >
                    <span className="access-type-label">{accessTypeLabels[type]}</span>
                    <span className="access-type-desc">{accessTypeDescriptions[type]}</span>
                  </button>
                ))}
              </div>
            </div>

            {accessType === 'partial' && (
              <div className="form-group">
                <label className="input-label">
                  {t('invitations.selectAccounts', 'Select Accounts to Share')}
                </label>
                {loadingAccounts ? (
                  <div className="loading-state"><Spinner size="sm" /></div>
                ) : plaidItems.length === 0 ? (
                  <p className="empty-state-text">
                    {t('invitations.noAccountsLinked', 'No bank accounts linked yet. Link an account first.')}
                  </p>
                ) : (
                  <div className="account-checklist">
                    {plaidItems.map((item) =>
                      item.accounts.map((account) => (
                        <label key={account.id} className="account-checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedAccountIds.includes(account.id)}
                            onChange={() => toggleAccountId(account.id)}
                          />
                          <span className="account-checkbox-info">
                            <span className="account-checkbox-name">{account.name}</span>
                            {account.mask && (
                              <span className="account-checkbox-mask">••••{account.mask}</span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              {t('invitations.sendInvite', 'Send Invitation')}
            </Button>
          </form>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div>
            {loadingInvitations ? (
              <div className="loading-state"><Spinner size="md" /></div>
            ) : invitations.length === 0 ? (
              <div className="empty-state">
                <p>{t('invitations.noPending', 'No pending invitations.')}</p>
              </div>
            ) : (
              <div className="list-container">
                {invitations.map((inv) => (
                  <div key={inv.id} className="list-item">
                    <div className="list-item-content">
                      <span className="list-item-title">{inv.invitee_email}</span>
                      <span className="list-item-subtitle">
                        {accessTypeLabels[inv.access_type]} &middot; {t('invitations.expires', 'Expires')} {formatDate(inv.expires_at)}
                      </span>
                    </div>
                    <button
                      className="list-item-action list-item-action--danger"
                      onClick={() => handleRevokeInvitation(inv.id)}
                    >
                      {t('invitations.revoke', 'Revoke')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            {loadingMembers ? (
              <div className="loading-state"><Spinner size="md" /></div>
            ) : members.length === 0 ? (
              <div className="empty-state">
                <p>{t('invitations.noMembers', 'No members have joined yet.')}</p>
              </div>
            ) : (
              <div className="list-container">
                {members.map((member) => (
                  <div key={member.id} className="list-item">
                    <div className="list-item-content">
                      <span className="list-item-title">{getMemberName(member)}</span>
                      <span className="list-item-subtitle">
                        {member.member_email} &middot; {accessTypeLabels[member.access_type]}
                      </span>
                    </div>
                    <button
                      className="list-item-action list-item-action--danger"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      {t('invitations.remove', 'Remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationsScreen;
