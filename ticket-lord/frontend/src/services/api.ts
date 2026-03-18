import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed API helpers
export const authApi = {
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get<User>('/auth/profile'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) => api.put('/auth/profile', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) => api.post('/auth/reset-password', data),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
};

export const eventsApi = {
  list: (params?: EventFilters) => api.get<{ events: Event[]; total: number }>('/events', { params }),
  getById: (id: number) => api.get<Event>(`/events/${id}`),
  create: (data: CreateEventData) => api.post<Event>('/events', data),
  update: (id: number, data: Partial<CreateEventData>) => api.put<Event>(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  getMyEvents: (status?: string) => api.get<Event[]>('/events/host/my-events', { params: { status } }),
  addTicketType: (eventId: number, data: TicketTypeData) => api.post(`/events/${eventId}/ticket-types`, data),
  updateTicketType: (eventId: number, ttId: number, data: Partial<TicketTypeData>) =>
    api.put(`/events/${eventId}/ticket-types/${ttId}`, data),
  deleteTicketType: (eventId: number, ttId: number) =>
    api.delete(`/events/${eventId}/ticket-types/${ttId}`),
  getAttendees: (eventId: number) => api.get(`/events/${eventId}/attendees`),
  checkIn: (eventId: number, ticketNumber: string) =>
    api.post(`/events/${eventId}/check-in`, { ticketNumber }),
};

export const ordersApi = {
  create: (data: { eventId: number; items: Array<{ ticketTypeId: number; quantity: number }> }) =>
    api.post<{ orderId: number; clientSecret: string; totalAmount: number }>('/orders', data),
  getById: (id: number) => api.get(`/orders/${id}`),
  getMyOrders: () => api.get('/orders/my-orders'),
  refund: (id: number) => api.post(`/orders/${id}/refund`),
};

export const ticketsApi = {
  getMyTickets: () => api.get('/tickets/my-tickets'),
  getById: (id: number) => api.get(`/tickets/${id}`),
  getByNumber: (number: string) => api.get(`/tickets/number/${number}`),
};

export const paymentsApi = {
  getConfig: () => api.get<{ publishableKey: string }>('/payments/config'),
  connectStripe: () => api.post<{ url: string }>('/payments/connect'),
  getConnectStatus: () => api.get<{ connected: boolean; accountId: string | null }>('/payments/connect/status'),
};

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'attendee' | 'host' | 'admin';
  avatarUrl?: string;
  stripeConnected?: boolean;
}

export interface Event {
  id: number;
  hostId: number;
  title: string;
  description: string;
  category: string;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  country: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isOnline: boolean;
  onlineUrl?: string;
  maxAttendees?: number;
  tags?: string;
  hostName?: string;
  minPrice?: number;
  maxPrice?: number;
  totalTickets?: number;
  ticketsSold?: number;
  ticketTypes?: TicketType[];
}

export interface TicketType {
  id: number;
  eventId: number;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  quantitySold: number;
  maxPerOrder: number;
  minPerOrder: number;
  isVisible: boolean;
  saleStart?: string;
  saleEnd?: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  qrCode: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  eventTitle?: string;
  eventStartDate?: string;
  eventVenue?: string;
  ticketTypeName?: string;
  checkedInAt?: string;
}

export interface EventFilters {
  category?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateEventData {
  title: string;
  description: string;
  category: string;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  country: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  status?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  maxAttendees?: number;
  tags?: string;
}

export interface TicketTypeData {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  saleStart?: string;
  saleEnd?: string;
  maxPerOrder?: number;
  minPerOrder?: number;
  isVisible?: boolean;
}
