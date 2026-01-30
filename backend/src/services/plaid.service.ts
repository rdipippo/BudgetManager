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
