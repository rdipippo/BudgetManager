import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services';
import { UserModel, InvitationModel } from '../models';

export interface AuthRequest extends Request {
  userId?: number;       // Resolved to owner's id for full/partial/advisor members
  userEmail?: string;
  userRole?: string;
  allowedAccountIds?: number[]; // Populated for partial access only
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

  // For members, resolve userId to the owner's account so controllers need no membership awareness
  req.userId = user.owner_user_id ?? user.id;
  req.userEmail = user.email;
  req.userRole = user.role;

  if (user.role === 'partial') {
    req.allowedAccountIds = await InvitationModel.getActiveAllowedAccountsForUser(
      user.email, user.owner_user_id!
    );
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
  if (req.userRole === 'partial' || req.userRole === 'advisor') {
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
  if (req.userRole === 'advisor' || req.userRole === 'partial') {
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
  if (req.userRole === 'advisor') {
    res.status(403).json({ error: 'Advisors cannot delete transactions' });
    return;
  }
  next();
};
