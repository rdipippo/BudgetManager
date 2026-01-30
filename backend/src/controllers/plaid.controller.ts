import { Request, Response } from 'express';
import { AuthRequest } from '../middleware';
import { PlaidService, EncryptionService, TransactionSyncService } from '../services';
import { PlaidItemModel, PlaidAccountModel } from '../models';

export const PlaidController = {
  async createLinkToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await PlaidService.createLinkToken(req.userId);
      res.json({
        linkToken: result.linkToken,
        expiration: result.expiration,
      });
    } catch (error) {
      console.error('Create link token error:', error);
      res.status(500).json({ error: 'Failed to create link token' });
    }
  },

  async exchangeToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { publicToken } = req.body;

      // Exchange public token for access token
      const { accessToken, itemId } = await PlaidService.exchangePublicToken(publicToken);

      // Encrypt access token before storing
      const encryptedToken = EncryptionService.encrypt(accessToken);

      // Get institution info
      const institution = await PlaidService.getInstitution(accessToken);

      // Store the plaid item
      const plaidItemId = await PlaidItemModel.create({
        user_id: req.userId,
        plaid_item_id: itemId,
        access_token_encrypted: encryptedToken,
        institution_id: institution.institutionId || undefined,
        institution_name: institution.institutionName || undefined,
      });

      // Get and store accounts
      const accounts = await PlaidService.getAccounts(accessToken);
      for (const account of accounts) {
        await PlaidAccountModel.create({
          plaid_item_id: plaidItemId,
          plaid_account_id: account.accountId,
          name: account.name,
          official_name: account.officialName || undefined,
          type: account.type,
          subtype: account.subtype || undefined,
          mask: account.mask || undefined,
          current_balance: account.currentBalance ?? undefined,
          available_balance: account.availableBalance ?? undefined,
          currency_code: account.currencyCode || undefined,
        });
      }

      // Trigger initial transaction sync
      const syncResult = await TransactionSyncService.syncItem(plaidItemId, req.userId);

      res.json({
        message: 'Account linked successfully',
        itemId: plaidItemId,
        institutionName: institution.institutionName,
        accountsLinked: accounts.length,
        transactionsSynced: syncResult.added,
      });
    } catch (error: any) {
      console.error('Exchange token error:', error);
      const errorMessage = error.response?.data?.error_message || 'Failed to link account';
      res.status(500).json({ error: errorMessage });
    }
  },

  async getItems(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const items = await PlaidItemModel.findByUserId(req.userId);

      // Get accounts for each item
      const itemsWithAccounts = await Promise.all(
        items.map(async (item) => {
          const accounts = await PlaidAccountModel.findByPlaidItemId(item.id);
          return {
            id: item.id,
            institutionName: item.institution_name,
            status: item.status,
            lastSyncAt: item.last_sync_at,
            errorCode: item.error_code,
            errorMessage: item.error_message,
            accounts: accounts.map((acc) => ({
              id: acc.id,
              name: acc.name,
              officialName: acc.official_name,
              type: acc.type,
              subtype: acc.subtype,
              mask: acc.mask,
              currentBalance: acc.current_balance,
              availableBalance: acc.available_balance,
              isHidden: acc.is_hidden,
            })),
          };
        })
      );

      res.json({ items: itemsWithAccounts });
    } catch (error) {
      console.error('Get items error:', error);
      res.status(500).json({ error: 'Failed to get linked accounts' });
    }
  },

  async syncItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const itemId = parseInt(id);

      const item = await PlaidItemModel.findByIdAndUser(itemId, req.userId);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      // Sync accounts first
      await TransactionSyncService.syncAccounts(itemId);

      // Then sync transactions
      const result = await TransactionSyncService.syncItem(itemId, req.userId);

      res.json({
        message: 'Sync completed',
        added: result.added,
        modified: result.modified,
        removed: result.removed,
        errors: result.errors,
      });
    } catch (error) {
      console.error('Sync item error:', error);
      res.status(500).json({ error: 'Failed to sync transactions' });
    }
  },

  async deleteItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const itemId = parseInt(id);

      const item = await PlaidItemModel.findByIdAndUser(itemId, req.userId);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      // Remove from Plaid
      try {
        const accessToken = EncryptionService.decrypt(item.access_token_encrypted);
        await PlaidService.removeItem(accessToken);
      } catch (error) {
        console.error('Failed to remove item from Plaid:', error);
        // Continue with local deletion even if Plaid fails
      }

      // Delete from database (cascades to accounts and sets transactions plaid_account_id to null)
      await PlaidItemModel.delete(itemId, req.userId);

      res.json({ message: 'Account unlinked successfully' });
    } catch (error) {
      console.error('Delete item error:', error);
      res.status(500).json({ error: 'Failed to unlink account' });
    }
  },

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhook_type, webhook_code, item_id, error } = req.body;

      console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id });

      // Acknowledge immediately
      res.json({ received: true });

      // Process asynchronously
      if (webhook_type === 'TRANSACTIONS') {
        if (webhook_code === 'SYNC_UPDATES_AVAILABLE') {
          const item = await PlaidItemModel.findByPlaidItemId(item_id);
          if (item) {
            await TransactionSyncService.syncItem(item.id, item.user_id);
          }
        }
      } else if (webhook_type === 'ITEM') {
        if (webhook_code === 'ERROR') {
          await PlaidItemModel.updateStatusByPlaidItemId(
            item_id,
            'error',
            error?.error_code,
            error?.error_message
          );
        } else if (webhook_code === 'PENDING_EXPIRATION') {
          await PlaidItemModel.updateStatusByPlaidItemId(item_id, 'pending_expiration');
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err);
      // Still return 200 to acknowledge receipt
      if (!res.headersSent) {
        res.json({ received: true });
      }
    }
  },

  async setAccountVisibility(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const accountId = parseInt(id);
      const { hidden } = req.body;

      if (typeof hidden !== 'boolean') {
        res.status(400).json({ error: 'Hidden must be a boolean' });
        return;
      }

      // Verify the account belongs to the user
      const account = await PlaidAccountModel.findById(accountId);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      const item = await PlaidItemModel.findByIdAndUser(account.plaid_item_id, req.userId);
      if (!item) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      await PlaidAccountModel.setHidden(accountId, hidden);

      res.json({ message: hidden ? 'Account hidden' : 'Account shown' });
    } catch (error) {
      console.error('Set account visibility error:', error);
      res.status(500).json({ error: 'Failed to update account visibility' });
    }
  },
};
