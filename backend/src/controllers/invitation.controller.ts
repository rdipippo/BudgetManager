import { Request, Response } from 'express';
import { AuthRequest } from '../middleware';
import { InvitationModel, UserModel, CategoryModel } from '../models';
import { TokenService, EmailService, PasswordService } from '../services';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const InvitationController = {
  // POST /api/invitations — send an invitation (owner or full-access member only)
  async sendInvitation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { email, accessType, allowedAccountIds } = req.body;
      const inviteeEmail = email.toLowerCase();

      // Invitations are always sent on behalf of the account owner
      const ownerUserId = (req.ownerUserId ?? req.userId)!;

      const ownerUser = await UserModel.findById(ownerUserId);
      if (!ownerUser) {
        res.status(404).json({ error: 'Owner account not found' });
        return;
      }

      if (ownerUser.email === inviteeEmail) {
        res.status(400).json({ error: 'You cannot invite yourself' });
        return;
      }

      // Check if already an active member of this account
      const alreadyMember = await UserModel.isMemberByEmail(ownerUserId, inviteeEmail);
      if (alreadyMember) {
        res.status(409).json({ error: 'This person is already a member of your account' });
        return;
      }

      if (accessType === 'partial' && (!allowedAccountIds || allowedAccountIds.length === 0)) {
        res.status(400).json({ error: 'At least one account must be selected for partial access' });
        return;
      }

      const { token, tokenHash } = await TokenService.generateInvitationToken();
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

      const invitationId = await InvitationModel.create(
        ownerUserId,
        inviteeEmail,
        accessType,
        tokenHash,
        expiresAt
      );

      if (accessType === 'partial' && allowedAccountIds?.length > 0) {
        for (const accountId of allowedAccountIds) {
          await InvitationModel.addAllowedAccount(invitationId, parseInt(accountId));
        }
      }

      const ownerName = ownerUser.first_name
        ? `${ownerUser.first_name}${ownerUser.last_name ? ' ' + ownerUser.last_name : ''}`
        : ownerUser.email;

      await EmailService.sendInvitationEmail(inviteeEmail, token, ownerName, accessType);

      res.status(201).json({ message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('Send invitation error:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
    }
  },

  // GET /api/invitations — list pending invitations sent by this owner
  async getInvitations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const invitations = await InvitationModel.findByOwner((req.ownerUserId ?? req.userId)!);
      res.json({ invitations });
    } catch (error) {
      console.error('Get invitations error:', error);
      res.status(500).json({ error: 'Failed to get invitations' });
    }
  },

  // DELETE /api/invitations/:id — revoke a pending invitation
  async revokeInvitation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const revoked = await InvitationModel.revoke(parseInt(id), (req.ownerUserId ?? req.userId)!);

      if (!revoked) {
        res.status(404).json({ error: 'Invitation not found' });
        return;
      }

      res.json({ message: 'Invitation revoked' });
    } catch (error) {
      console.error('Revoke invitation error:', error);
      res.status(500).json({ error: 'Failed to revoke invitation' });
    }
  },

  // GET /api/invitations/members — list active members of this account
  async getMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const members = await UserModel.findMembersByOwner((req.ownerUserId ?? req.userId)!);
      res.json({ members });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  },

  // DELETE /api/invitations/members/:id — disable a member (revoke access)
  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const disabled = await UserModel.disableMember(parseInt(id), (req.ownerUserId ?? req.userId)!);

      if (!disabled) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      res.json({ message: 'Member removed' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  },

  // GET /api/invitations/details/:token — public, get invitation info for display
  async getInvitationDetails(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const tokenHash = TokenService.hashToken(token);
      const invitation = await InvitationModel.findByTokenHash(tokenHash);

      if (!invitation) {
        res.status(404).json({ error: 'Invitation not found or has expired' });
        return;
      }

      if (invitation.used) {
        res.status(410).json({ error: 'This invitation has already been used' });
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        res.status(410).json({ error: 'This invitation has expired' });
        return;
      }

      const ownerName = invitation.owner_first_name
        ? `${invitation.owner_first_name}${invitation.owner_last_name ? ' ' + invitation.owner_last_name : ''}`
        : invitation.owner_email;

      res.json({
        invitation: {
          id: invitation.id,
          inviteeEmail: invitation.invitee_email,
          accessType: invitation.access_type,
          ownerName,
          ownerEmail: invitation.owner_email,
          expiresAt: invitation.expires_at,
        },
      });
    } catch (error) {
      console.error('Get invitation details error:', error);
      res.status(500).json({ error: 'Failed to get invitation details' });
    }
  },

  // POST /api/invitations/accept — accept an invitation by registering a new account
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token, password, firstName, lastName } = req.body;

      const tokenHash = TokenService.hashToken(token);
      const invitation = await InvitationModel.findByTokenHash(tokenHash);

      if (!invitation) {
        res.status(404).json({ error: 'Invitation not found or has expired' });
        return;
      }

      if (invitation.used) {
        res.status(410).json({ error: 'This invitation has already been used' });
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        res.status(410).json({ error: 'This invitation has expired' });
        return;
      }

      const inviteeEmail = invitation.invitee_email;

      const existingUser = await UserModel.findByEmail(inviteeEmail);
      if (existingUser) {
        res.status(409).json({
          error: 'An account with this email already exists. Please use a different email address for your invitation.',
        });
        return;
      }

      // Create the new user with role = access_type and owner_user_id set
      const passwordHash = await PasswordService.hash(password);
      const newUserId = await UserModel.create({
        email: inviteeEmail,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: invitation.access_type,
        owner_user_id: invitation.owner_user_id,
      });

      // Email pre-verified since they received the invitation
      await UserModel.verifyEmail(newUserId);

      // Create default categories for partial-access users (they have their own budget view)
      if (invitation.access_type === 'partial') {
        await CategoryModel.createDefaultsForUser(newUserId);
      }

      // Activate allowed accounts for partial access
      if (invitation.access_type === 'partial') {
        await InvitationModel.activateAllowedAccounts(invitation.id);
      }

      // Mark invitation as used
      await InvitationModel.markAsUsed(invitation.id);

      // Generate token pair with ownerUserId embedded for non-partial roles
      const newUser = await UserModel.findById(newUserId);
      if (!newUser) {
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }

      const tokens = await TokenService.generateTokenPair(newUser.id, newUser.email, newUser.role);

      res.status(201).json({
        message: 'Invitation accepted. Account created successfully.',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: UserModel.toPublic(newUser),
      });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  },
};
