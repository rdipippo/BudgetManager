import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { NoteModel, NoteEntityType } from '../models/note.model';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

const VALID_ENTITY_TYPES: NoteEntityType[] = ['plaid_account', 'category', 'monthly_budget'];

async function verifyEntityAccess(
  req: AuthRequest,
  entityType: NoteEntityType,
  entityId: number
): Promise<boolean> {
  const userId = req.userId!;

  if (entityType === 'monthly_budget') {
    return true; // scoped by owner_user_id at DB level; no additional entity check needed
  }

  if (entityType === 'category') {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [entityId, userId]
    );
    return rows.length > 0;
  }

  if (entityType === 'plaid_account') {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pa.id FROM plaid_accounts pa
       JOIN plaid_items pi ON pa.item_id = pi.id
       WHERE pa.id = ? AND pi.user_id = ?`,
      [entityId, userId]
    );
    if (rows.length === 0) return false;

    // For partial members, also check allowedAccountIds
    if (req.allowedAccountIds && !req.allowedAccountIds.includes(entityId)) {
      return false;
    }
    return true;
  }

  return false;
}

export const NoteController = {
  async getNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { entityType, entityId, year, month } = req.query;

      if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as NoteEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const parsedEntityId = parseInt(entityId as string) || 0;
      const parsedYear = year ? parseInt(year as string) : undefined;
      const parsedMonth = month ? parseInt(month as string) : undefined;

      if (entityType === 'monthly_budget' && (!parsedYear || !parsedMonth)) {
        res.status(400).json({ error: 'year and month are required for monthly_budget notes' });
        return;
      }

      const hasAccess = await verifyEntityAccess(req, entityType as NoteEntityType, parsedEntityId);
      if (!hasAccess) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      const notes = await NoteModel.findByEntity(
        req.userId,
        entityType as NoteEntityType,
        parsedEntityId,
        parsedYear,
        parsedMonth
      );

      res.json({ notes });
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ error: 'Failed to get notes' });
    }
  },

  async createNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { entityType, entityId, body, year, month } = req.body;
      const parsedEntityId = parseInt(entityId) || 0;
      const parsedYear = year ? parseInt(year) : undefined;
      const parsedMonth = month ? parseInt(month) : undefined;

      const hasAccess = await verifyEntityAccess(req, entityType as NoteEntityType, parsedEntityId);
      if (!hasAccess) {
        res.status(404).json({ error: 'Entity not found' });
        return;
      }

      const noteId = await NoteModel.create({
        owner_user_id: req.userId,
        author_user_id: req.actingUserId!,
        entity_type: entityType as NoteEntityType,
        entity_id: parsedEntityId,
        budget_year: parsedYear ?? null,
        budget_month: parsedMonth ?? null,
        body: body.trim(),
      });

      const note = await NoteModel.findByIdWithAuthor(noteId);
      res.status(201).json({ note });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  },

  async updateNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { body } = req.body;

      const note = await NoteModel.findById(parseInt(id));
      if (!note || note.owner_user_id !== req.userId) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      if (note.author_user_id !== req.actingUserId) {
        res.status(403).json({ error: 'You can only edit your own notes' });
        return;
      }

      await NoteModel.update(parseInt(id), req.userId, req.actingUserId!, body.trim());
      const updated = await NoteModel.findByIdWithAuthor(parseInt(id));
      res.json({ note: updated });
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({ error: 'Failed to update note' });
    }
  },

  async deleteNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const note = await NoteModel.findById(parseInt(id));
      if (!note || note.owner_user_id !== req.userId) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      // Authors can always delete their own note; owners and full-access members can delete any
      const isAuthor = note.author_user_id === req.actingUserId;
      const canDeleteAny = req.userRole !== 'partial' && req.userRole !== 'advisor';
      if (!isAuthor && !canDeleteAny) {
        res.status(403).json({ error: 'You do not have permission to delete this note' });
        return;
      }

      await NoteModel.delete(parseInt(id), req.userId);
      res.json({ message: 'Note deleted' });
    } catch (error) {
      console.error('Delete note error:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  },
};
