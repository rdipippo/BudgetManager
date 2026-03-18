import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventCategory = 'music' | 'sports' | 'arts' | 'food' | 'business' | 'technology' | 'education' | 'other';

export interface Event extends RowDataPacket {
  id: number;
  host_id: number;
  title: string;
  description: string;
  category: EventCategory;
  venue_name: string;
  venue_address: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  start_date: Date;
  end_date: Date;
  image_url: string | null;
  status: EventStatus;
  is_online: boolean;
  online_url: string | null;
  max_attendees: number | null;
  tags: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  host_name?: string;
  host_email?: string;
  min_price?: number;
  max_price?: number;
  total_tickets?: number;
  tickets_sold?: number;
}

export interface EventFilters {
  category?: EventCategory;
  city?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: EventStatus;
  hostId?: number;
  page?: number;
  limit?: number;
}

export const EventModel = {
  async findById(id: number): Promise<Event | null> {
    const [rows] = await pool.query<Event[]>(
      `SELECT e.*, u.name as host_name, u.email as host_email,
        MIN(tt.price) as min_price, MAX(tt.price) as max_price,
        SUM(tt.quantity) as total_tickets, SUM(tt.quantity_sold) as tickets_sold
       FROM events e
       JOIN users u ON e.host_id = u.id
       LEFT JOIN ticket_types tt ON e.id = tt.event_id AND tt.deleted_at IS NULL
       WHERE e.id = ?
       GROUP BY e.id`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll(filters: EventFilters = {}): Promise<{ events: Event[]; total: number }> {
    const conditions: string[] = ['e.status = "published"'];
    const params: unknown[] = [];

    if (filters.category) { conditions.push('e.category = ?'); params.push(filters.category); }
    if (filters.city) { conditions.push('e.city LIKE ?'); params.push(`%${filters.city}%`); }
    if (filters.startDate) { conditions.push('e.start_date >= ?'); params.push(filters.startDate); }
    if (filters.endDate) { conditions.push('e.end_date <= ?'); params.push(filters.endDate); }
    if (filters.search) {
      conditions.push('(e.title LIKE ? OR e.description LIKE ? OR e.venue_name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT e.id) as total FROM events e ${where}`,
      params
    );
    const total = (countRows[0] as RowDataPacket).total as number;

    const [events] = await pool.query<Event[]>(
      `SELECT e.*, u.name as host_name,
        MIN(tt.price) as min_price, MAX(tt.price) as max_price,
        SUM(tt.quantity) as total_tickets, SUM(tt.quantity_sold) as tickets_sold
       FROM events e
       JOIN users u ON e.host_id = u.id
       LEFT JOIN ticket_types tt ON e.id = tt.event_id AND tt.deleted_at IS NULL
       ${where}
       GROUP BY e.id
       ORDER BY e.start_date ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { events, total };
  },

  async findByHostId(hostId: number, filters: EventFilters = {}): Promise<Event[]> {
    const conditions: string[] = ['e.host_id = ?'];
    const params: unknown[] = [hostId];

    if (filters.status) { conditions.push('e.status = ?'); params.push(filters.status); }

    const [events] = await pool.query<Event[]>(
      `SELECT e.*,
        MIN(tt.price) as min_price, MAX(tt.price) as max_price,
        SUM(tt.quantity) as total_tickets, SUM(tt.quantity_sold) as tickets_sold
       FROM events e
       LEFT JOIN ticket_types tt ON e.id = tt.event_id AND tt.deleted_at IS NULL
       WHERE ${conditions.join(' AND ')}
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      params
    );
    return events;
  },

  async create(data: {
    hostId: number;
    title: string;
    description: string;
    category: EventCategory;
    venueName: string;
    venueAddress: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
    startDate: string;
    endDate: string;
    imageUrl?: string;
    status?: EventStatus;
    isOnline?: boolean;
    onlineUrl?: string;
    maxAttendees?: number;
    tags?: string;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO events (host_id, title, description, category, venue_name, venue_address,
        city, state, country, latitude, longitude, start_date, end_date, image_url, status,
        is_online, online_url, max_attendees, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.hostId, data.title, data.description, data.category,
        data.venueName, data.venueAddress, data.city, data.state, data.country,
        data.latitude || null, data.longitude || null,
        data.startDate, data.endDate, data.imageUrl || null,
        data.status || 'draft', data.isOnline || false, data.onlineUrl || null,
        data.maxAttendees || null, data.tags || null,
      ]
    );
    return result.insertId;
  },

  async update(id: number, hostId: number, data: Partial<{
    title: string; description: string; category: EventCategory;
    venueName: string; venueAddress: string; city: string; state: string; country: string;
    startDate: string; endDate: string; imageUrl: string; status: EventStatus;
    isOnline: boolean; onlineUrl: string; maxAttendees: number; tags: string;
  }>): Promise<boolean> {
    const fieldMap: Record<string, string> = {
      title: 'title', description: 'description', category: 'category',
      venueName: 'venue_name', venueAddress: 'venue_address', city: 'city',
      state: 'state', country: 'country', startDate: 'start_date', endDate: 'end_date',
      imageUrl: 'image_url', status: 'status', isOnline: 'is_online',
      onlineUrl: 'online_url', maxAttendees: 'max_attendees', tags: 'tags',
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) { fields.push(`${col} = ?`); values.push((data as Record<string, unknown>)[key]); }
    }
    if (fields.length === 0) return false;
    values.push(id, hostId);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE events SET ${fields.join(', ')} WHERE id = ? AND host_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, hostId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM events WHERE id = ? AND host_id = ? AND status = "draft"',
      [id, hostId]
    );
    return result.affectedRows > 0;
  },
};
