import { Response } from 'express';
import { TicketModel } from '../models/ticket.model';
import { AuthRequest } from '../middleware/auth';

export const TicketsController = {
  async getMyTickets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tickets = await TicketModel.findByUserId(req.user!.id);
      res.json(tickets);
    } catch {
      res.status(500).json({ error: 'Failed to get tickets' });
    }
  },

  async getTicketById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ticket = await TicketModel.findById(parseInt(req.params.id));
      if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
      if (ticket.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized' }); return;
      }
      res.json(ticket);
    } catch {
      res.status(500).json({ error: 'Failed to get ticket' });
    }
  },

  async getTicketByNumber(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ticket = await TicketModel.findByTicketNumber(req.params.number);
      if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
      if (ticket.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized' }); return;
      }
      res.json(ticket);
    } catch {
      res.status(500).json({ error: 'Failed to get ticket' });
    }
  },
};
