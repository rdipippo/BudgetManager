import { Router } from 'express';
import { InvitationController } from '../controllers';
import {
  authMiddleware,
  authLimiter,
  canSendInvitationsMiddleware,
  sendInvitationValidation,
  acceptInvitationValidation,
} from '../middleware';

const router = Router();

// Public routes
router.get('/details/:token', InvitationController.getInvitationDetails);
router.post('/accept', authLimiter, acceptInvitationValidation, InvitationController.acceptInvitation);

// Protected routes (authenticated)
router.use(authMiddleware);

router.get('/', InvitationController.getInvitations);
router.get('/members', InvitationController.getMembers);
router.delete('/members/:id', InvitationController.removeMember);

// Only owners and full-access members can send invitations
router.post('/', canSendInvitationsMiddleware, sendInvitationValidation, InvitationController.sendInvitation);
router.delete('/:id', canSendInvitationsMiddleware, InvitationController.revokeInvitation);

export default router;
