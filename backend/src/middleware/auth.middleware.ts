import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services';
import { UserModel, MembershipModel } from '../models';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userRole?: string;
  // Membership context fields
  primaryUserId?: number;       // Owner's userId for full/advisor data access
  accessType?: 'full' | 'partial' | 'advisor';
  membershipId?: number;
  partialOwnerUserId?: number;  // Owner's userId for partial-access transaction queries
  allowedAccountIds?: number[]; // Allowed plaid_account_ids for partial access
  // Effective userId for data queries (= primaryUserId for full/advisor, own userId otherwise)
  effectiveUserId?: number;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = TokenService.verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify user still exists and is enabled
  const user = await UserModel.findById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (!user.enabled) {
    res.status(403).json({ error: 'Account is disabled' });
    return;
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  req.userRole = payload.role;

  // Apply membership context from JWT
  if (payload.accessType && payload.membershipId) {
    req.accessType = payload.accessType;
    req.membershipId = payload.membershipId;

    if (payload.accessType === 'full' || payload.accessType === 'advisor') {
      req.primaryUserId = payload.primaryUserId;
      req.effectiveUserId = payload.primaryUserId ?? payload.userId;
    } else if (payload.accessType === 'partial') {
      req.partialOwnerUserId = payload.partialOwnerUserId;
      req.effectiveUserId = payload.userId; // own data for budgets/categories
      // Load allowed account IDs for partial access
      const allowedIds = await MembershipModel.getAllowedAccountIds(payload.membershipId);
      req.allowedAccountIds = allowedIds;
    }
  } else {
    req.effectiveUserId = payload.userId;
  }

  next();
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = TokenService.verifyAccessToken(token);

    if (payload) {
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.userRole = payload.role;
      req.effectiveUserId = payload.userId;
    }
  }

  next();
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const superAdminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};

// Blocks partial and advisor members from sending invitations
// (only account owners and full-access members can invite others)
export const canSendInvitationsMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.accessType === 'partial' || req.accessType === 'advisor') {
    res.status(403).json({ error: 'You do not have permission to send invitations' });
    return;
  }
  next();
};

// Blocks advisor and partial members from managing bank accounts (add/delete)
export const canManageAccountsMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.accessType === 'advisor' || req.accessType === 'partial') {
    res.status(403).json({ error: 'You do not have permission to manage bank accounts' });
    return;
  }
  next();
};

// Blocks advisor members from deleting transactions
export const canDeleteTransactionsMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.accessType === 'advisor') {
    res.status(403).json({ error: 'Advisors cannot delete transactions' });
    return;
  }
  next();
};
