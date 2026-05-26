import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  Transaction as PlaidTransaction,
  RemovedTransaction,
} from 'plaid';
import { config } from '../config';

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[config.plaid.env],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': config.plaid.clientId,
      'PLAID-SECRET': config.plaid.secret,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export interface PlaidLinkTokenResponse {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResponse {
  accessToken: string;
  itemId: string;
}

export interface PlaidAccountInfo {
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  currencyCode: string | null;
}

export interface PlaidInstitutionInfo {
  institutionId: string | null;
  institutionName: string | null;
}

export interface TransactionSyncResult {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: RemovedTransaction[];
  hasMore: boolean;
  nextCursor: string;
}

export const PlaidService = {
  async createLinkToken(userId: number): Promise<PlaidLinkTokenResponse> {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId.toString() },
      client_name: 'Budget Manager',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: config.plaid.webhookUrl || undefined,
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    };
  },

  async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResponse> {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  },

  async getAccounts(accessToken: string): Promise<PlaidAccountInfo[]> {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    return response.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name || null,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      currentBalance: account.balances.current,
      availableBalance: account.balances.available,
      currencyCode: account.balances.iso_currency_code || null,
    }));
  },

  /**
   * Pulls *real-time* balances directly from the institution by calling
   * `/accounts/balance/get`. This is the on-demand counterpart to
   * `/transactions/refresh` — `accountsGet` returns whatever balance Plaid
   * has cached, while `accountsBalanceGet` makes a live call upstream. It's
   * slower (a few seconds against real banks; fast in Sandbox) and rate
   * limits are stricter, so use it only when the user explicitly asks for
   * fresh data (e.g. pressing the refresh button).
   */
  async getAccountsBalance(accessToken: string): Promise<PlaidAccountInfo[]> {
    const response = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    return response.data.accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name || null,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      currentBalance: account.balances.current,
      availableBalance: account.balances.available,
      currencyCode: account.balances.iso_currency_code || null,
    }));
  },

  async getInstitution(accessToken: string): Promise<PlaidInstitutionInfo> {
    try {
      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      });

      const institutionId = itemResponse.data.item.institution_id;
      if (!institutionId) {
        return { institutionId: null, institutionName: null };
      }

      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });

      return {
        institutionId,
        institutionName: institutionResponse.data.institution.name,
      };
    } catch (error) {
      console.error('Failed to get institution info:', error);
      return { institutionId: null, institutionName: null };
    }
  },

  async syncTransactions(accessToken: string, cursor?: string): Promise<TransactionSyncResult> {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: cursor || undefined,
    });

    return {
      added: response.data.added,
      modified: response.data.modified,
      removed: response.data.removed,
      hasMore: response.data.has_more,
      nextCursor: response.data.next_cursor,
    };
  },

  /**
   * Asks Plaid to fetch the latest transactions from the institution right now,
   * rather than waiting for Plaid's normal scheduled pull. This is the
   * `/transactions/refresh` endpoint, which is a paid add-on — institutions or
   * plans without it will return `PRODUCTS_NOT_SUPPORTED` / `PRODUCT_NOT_READY`.
   * The refresh is asynchronous on Plaid's side; callers should wait briefly
   * (or rely on the SYNC_UPDATES_AVAILABLE webhook) before running
   * transactionsSync to pick up any new data.
   */
  async refreshTransactions(accessToken: string): Promise<void> {
    await plaidClient.transactionsRefresh({
      access_token: accessToken,
    });
  },

  /**
   * Sandbox-only. Injects custom transactions onto an Item that was created
   * with the `user_transactions_dynamic` test user. Plaid commits the
   * transactions before returning, so the next `/transactions/sync` call is
   * guaranteed to see them. This bypasses the `transactions:refresh` add-on
   * and works regardless of OAuth-vs-non-OAuth institution choice.
   *
   * Throws if the Item wasn't created with `user_transactions_dynamic` (Plaid
   * returns `INVALID_FIELD` or similar). Up to 10 transactions per call.
   */
  async sandboxCreateTransactions(
    accessToken: string,
    transactions: Array<{
      amount: number;
      date_posted: string; // YYYY-MM-DD
      date_transacted: string; // YYYY-MM-DD
      description: string;
      iso_currency_code?: string;
    }>
  ): Promise<{ requestId: string }> {
    const response = await plaidClient.sandboxTransactionsCreate({
      access_token: accessToken,
      transactions,
    });
    return { requestId: response.data.request_id };
  },

  async removeItem(accessToken: string): Promise<void> {
    await plaidClient.itemRemove({
      access_token: accessToken,
    });
  },

  async getItemStatus(accessToken: string): Promise<{
    available: boolean;
    lastSuccessfulUpdate: Date | null;
    errorCode: string | null;
    errorMessage: string | null;
  }> {
    try {
      const response = await plaidClient.itemGet({
        access_token: accessToken,
      });

      const item = response.data.item;
      const status = response.data.status;

      return {
        available: !item.error,
        lastSuccessfulUpdate: status?.transactions?.last_successful_update
          ? new Date(status.transactions.last_successful_update)
          : null,
        errorCode: item.error?.error_code || null,
        errorMessage: item.error?.error_message || null,
      };
    } catch (error: any) {
      return {
        available: false,
        lastSuccessfulUpdate: null,
        errorCode: error?.response?.data?.error_code || 'UNKNOWN',
        errorMessage: error?.response?.data?.error_message || 'Unknown error',
      };
    }
  },
};
