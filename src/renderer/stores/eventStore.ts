import { create } from 'zustand';

export interface Event {
  id: number;
  user_id: number;
  company_id?: number;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  all_day: number;
  location?: string;
  type?: string;
  remind_before_minutes: number;
  slack_notify: number;
  created_at: string;
  updated_at: string;
}

interface EventState {
  events: Event[];
  selectedEvent: Event | null;
  loading: boolean;
  error: string | null;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  removeEvent: (id: number) => void;
  setSelectedEvent: (event: Event | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  selectedEvent: null,
  loading: false,
  error: null,
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),
  updateEvent: (event) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
      selectedEvent:
        state.selectedEvent?.id === event.id ? event : state.selectedEvent,
    })),
  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
    })),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
