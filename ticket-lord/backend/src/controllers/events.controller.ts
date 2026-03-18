import { Request, Response } from 'express';
import { EventModel } from '../models/event.model';
import { TicketTypeModel } from '../models/ticketType.model';
import { AuthRequest } from '../middleware/auth';

export const EventsController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { category, city, startDate, endDate, search, page, limit } = req.query;
      const result = await EventModel.findAll({
        category: category as string | undefined,
        city: city as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      } as Parameters<typeof EventModel.findAll>[0]);
      res.json(result);
    } catch (err) {
      console.error('List events error:', err);
      res.status(500).json({ error: 'Failed to list events' });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

      const ticketTypes = await TicketTypeModel.findByEventId(event.id);
      res.json({ ...event, ticketTypes });
    } catch {
      res.status(500).json({ error: 'Failed to get event' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const eventId = await EventModel.create({ ...req.body, hostId: req.user!.id });
      const event = await EventModel.findById(eventId);
      res.status(201).json(event);
    } catch (err) {
      console.error('Create event error:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updated = await EventModel.update(parseInt(req.params.id), req.user!.id, req.body);
      if (!updated) { res.status(404).json({ error: 'Event not found or unauthorized' }); return; }
      const event = await EventModel.findById(parseInt(req.params.id));
      res.json(event);
    } catch {
      res.status(500).json({ error: 'Failed to update event' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await EventModel.delete(parseInt(req.params.id), req.user!.id);
      if (!deleted) { res.status(404).json({ error: 'Event not found, unauthorized, or not a draft' }); return; }
      res.json({ message: 'Event deleted' });
    } catch {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  },

  async getMyEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const events = await EventModel.findByHostId(req.user!.id, {
        status: req.query.status as string | undefined,
      } as Parameters<typeof EventModel.findByHostId>[1]);
      res.json(events);
    } catch {
      res.status(500).json({ error: 'Failed to get events' });
    }
  },

  // Ticket types for an event
  async addTicketType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event || event.host_id !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const id = await TicketTypeModel.create({ ...req.body, eventId: event.id });
      const ticketType = await TicketTypeModel.findById(id);
      res.status(201).json(ticketType);
    } catch {
      res.status(500).json({ error: 'Failed to add ticket type' });
    }
  },

  async updateTicketType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event || event.host_id !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const updated = await TicketTypeModel.update(
        parseInt(req.params.ticketTypeId), event.id, req.body
      );
      if (!updated) { res.status(404).json({ error: 'Ticket type not found' }); return; }
      res.json(await TicketTypeModel.findById(parseInt(req.params.ticketTypeId)));
    } catch {
      res.status(500).json({ error: 'Failed to update ticket type' });
    }
  },

  async deleteTicketType(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event || event.host_id !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const deleted = await TicketTypeModel.softDelete(
        parseInt(req.params.ticketTypeId), event.id
      );
      if (!deleted) { res.status(404).json({ error: 'Ticket type not found' }); return; }
      res.json({ message: 'Ticket type removed' });
    } catch {
      res.status(500).json({ error: 'Failed to remove ticket type' });
    }
  },

  async getAttendees(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event || event.host_id !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const { TicketModel } = await import('../models/ticket.model');
      const tickets = await TicketModel.findByEventId(event.id);
      res.json(tickets);
    } catch {
      res.status(500).json({ error: 'Failed to get attendees' });
    }
  },

  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    try {
      const event = await EventModel.findById(parseInt(req.params.id));
      if (!event || event.host_id !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const { TicketService } = await import('../services/ticket.service');
      const result = await TicketService.validateTicket(req.body.ticketNumber, event.id);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Check-in failed' });
    }
  },
};
