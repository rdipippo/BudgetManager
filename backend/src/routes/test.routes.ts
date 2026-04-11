import { Router, Request, Response } from 'express';
import { ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { UserModel, InvitationModel, NoteModel } from '../models';
import type { NoteEntityType } from '../models';
import { TokenService, PasswordService } from '../services';
import { authMiddleware } from '../middleware';
import type { AuthRequest } from '../middleware';

const router = Router();

/**
 * POST /api/test/create-verified-user
 * Creates a test user with email pre-verified and returns auth tokens.
 * If a user with that email already exists, it is deleted first.
 */
router.post('/create-verified-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Remove any existing user with this email to allow idempotent test setup
    await pool.execute<ResultSetHeader>('DELETE FROM users WHERE email = ?', [email.toLowerCase()]);

    const passwordHash = await PasswordService.hash(password);
    const userId = await UserModel.create({
      email,
      password_hash: passwordHash,
      first_name: firstName || null,
      last_name: lastName || null,
      role,
    });

    await UserModel.verifyEmail(userId);

    const user = await UserModel.findById(userId);
    const tokens = await TokenService.generateTokenPair(userId, email.toLowerCase(), role);

    res.status(201).json({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: UserModel.toPublic(user!),
    });
  } catch (error) {
    console.error('[test] create-verified-user error:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
});

/**
 * POST /api/test/create-invitation-token
 * Creates an invitation in the DB and returns the raw (unhashed) token.
 * Skips the email-sending step so tests don't need an SMTP server.
 * Requires authentication as the inviting owner.
 */
router.post(
  '/create-invitation-token',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, accessType = 'full' } = req.body;
      const ownerUserId = req.userId!;

      const { token, tokenHash } = await TokenService.generateInvitationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitationId = await InvitationModel.create(
        ownerUserId,
        email.toLowerCase(),
        accessType,
        tokenHash,
        expiresAt
      );

      res.status(201).json({ token, invitationId });
    } catch (error) {
      console.error('[test] create-invitation-token error:', error);
      res.status(500).json({ error: 'Failed to create test invitation' });
    }
  }
);

/**
 * POST /api/test/create-note
 * Creates a note directly in the DB (bypassing entity ownership checks).
 * Accepts ownerUserId, authorUserId, entityType, entityId, body, and optional year/month.
 * Returns the note with author info.
 */
router.post('/create-note', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ownerUserId,
      authorUserId,
      entityType,
      entityId = 0,
      body,
      year = null,
      month = null,
    } = req.body;

    const noteId = await NoteModel.create({
      owner_user_id: ownerUserId,
      author_user_id: authorUserId,
      entity_type: entityType as NoteEntityType,
      entity_id: entityId,
      budget_year: year,
      budget_month: month,
      body,
    });

    const note = await NoteModel.findByIdWithAuthor(noteId);
    res.status(201).json({ note });
  } catch (error) {
    console.error('[test] create-note error:', error);
    res.status(500).json({ error: 'Failed to create test note' });
  }
});

/**
 * DELETE /api/test/cleanup-user
 * Deletes a user by email. Cascades to all related data (members, tokens, etc.).
 */
router.delete('/cleanup-user', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    await pool.execute<ResultSetHeader>('DELETE FROM users WHERE email = ?', [email.toLowerCase()]);
    res.json({ deleted: true });
  } catch (error) {
    console.error('[test] cleanup-user error:', error);
    res.status(500).json({ error: 'Failed to cleanup test user' });
  }
});

export default router;
