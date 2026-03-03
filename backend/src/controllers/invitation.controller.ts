import { Request, Response } from 'express';
import { AuthRequest } from '../middleware';
import { InvitationModel, MembershipModel, UserModel, CategoryModel } from '../models';
import { TokenService, EmailService, PasswordService } from '../services';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const InvitationController = {
  // POST /api/invitations — send an invitation (owner or full-access member only)
  async sendInvitation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId || !req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { email, accessType, allowedAccountIds } = req.body;
      const inviteeEmail = email.toLowerCase();

      // The invitations are always sent on behalf of the account owner
      // For full-access members, effectiveUserId is the owner's ID
      const ownerUserId = req.effectiveUserId;

      // Cannot invite yourself
      const ownerUser = await UserModel.findById(ownerUserId);
      if (!ownerUser) {
        res.status(404).json({ error: 'Owner account not found' });
        return;
      }

      if (ownerUser.email === inviteeEmail) {
        res.status(400).json({ error: 'You cannot invite yourself' });
        return;
      }

      // Check if the invitee is already a member of this account
      const alreadyMember = await MembershipModel.existsByOwnerAndEmail(ownerUserId, inviteeEmail);
      if (alreadyMember) {
        res.status(409).json({ error: 'This person is already a member of your account' });
        return;
      }

      // For partial access, allowedAccountIds is required
      if (accessType === 'partial' && (!allowedAccountIds || allowedAccountIds.length === 0)) {
        res.status(400).json({ error: 'At least one account must be selected for partial access' });
        return;
      }

      // Generate invitation token
      const { token, tokenHash } = await TokenService.generateInvitationToken();
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

      const invitationId = await InvitationModel.create(
        ownerUserId,
        inviteeEmail,
        accessType,
        tokenHash,
        expiresAt
      );

      // Save allowed accounts for partial access
      if (accessType === 'partial' && allowedAccountIds?.length > 0) {
        for (const accountId of allowedAccountIds) {
          await InvitationModel.addAllowedAccount(invitationId, parseInt(accountId));
        }
      }

      // Send invitation email
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
      if (!req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const invitations = await InvitationModel.findByOwner(req.effectiveUserId);

      res.json({ invitations });
    } catch (error) {
      console.error('Get invitations error:', error);
      res.status(500).json({ error: 'Failed to get invitations' });
    }
  },

  // DELETE /api/invitations/:id — revoke a pending invitation
  async revokeInvitation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const revoked = await InvitationModel.revoke(parseInt(id), req.effectiveUserId);

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
      if (!req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const members = await MembershipModel.findByOwner(req.effectiveUserId);

      res.json({ members });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  },

  // DELETE /api/invitations/members/:id — remove a member from this account
  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.effectiveUserId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const revoked = await MembershipModel.revoke(parseInt(id), req.effectiveUserId);

      if (!revoked) {
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

      // The invitee must register with the invited email address
      const existingUser = await UserModel.findByEmail(inviteeEmail);
      if (existingUser) {
        res.status(409).json({
          error: 'An account with this email already exists. Please use a different email address for your invitation.',
        });
        return;
      }

      // Create the new user account with email pre-verified (invitation email proves ownership)
      const passwordHash = await PasswordService.hash(password);
      const newUserId = await UserModel.create({
        email: inviteeEmail,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
      });

      // Mark email as verified since they received the invitation
      await UserModel.verifyEmail(newUserId);

      // Create default categories for the new user (for partial access where they have their own)
      await CategoryModel.createDefaultsForUser(newUserId);

      // Mark invitation as used
      await InvitationModel.markAsUsed(invitation.id);

      // Create the membership
      const membershipId = await MembershipModel.create(
        invitation.owner_user_id,
        newUserId,
        invitation.access_type
      );

      // Copy allowed accounts from invitation to membership (for partial access)
      if (invitation.access_type === 'partial') {
        const allowedAccountIds = await InvitationModel.getAllowedAccounts(invitation.id);
        for (const accountId of allowedAccountIds) {
          await MembershipModel.addAllowedAccount(membershipId, accountId);
        }
      }

      // Build membership context for JWT
      const membershipContext = buildMembershipContext(
        invitation.access_type,
        invitation.owner_user_id,
        membershipId
      );

      // Generate token pair with membership context
      const newUser = await UserModel.findById(newUserId);
      if (!newUser) {
        res.status(500).json({ error: 'Failed to create user' });
        return;
      }

      const tokens = await TokenService.generateTokenPair(
        newUser.id,
        newUser.email,
        newUser.role,
        membershipContext
      );

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

function buildMembershipContext(
  accessType: 'full' | 'partial' | 'advisor',
  ownerUserId: number,
  membershipId: number
) {
  if (accessType === 'full' || accessType === 'advisor') {
    return {
      primaryUserId: ownerUserId,
      accessType,
      membershipId,
    };
  } else {
    // partial access
    return {
      accessType,
      membershipId,
      partialOwnerUserId: ownerUserId,
    };
  }
}
