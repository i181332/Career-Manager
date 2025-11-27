import { create } from 'zustand';

export interface InterviewNote {
  id: number;
  user_id: number;
  company_id: number;
  date: string;
  qa_list: string;
  score: number | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

interface InterviewNoteState {
  interviewNotes: InterviewNote[];
  loading: boolean;
  setInterviewNotes: (notes: InterviewNote[]) => void;
  addInterviewNote: (note: InterviewNote) => void;
  updateInterviewNote: (id: number, note: Partial<InterviewNote>) => void;
  removeInterviewNote: (id: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useInterviewNoteStore = create<InterviewNoteState>((set) => ({
  interviewNotes: [],
  loading: false,
  setInterviewNotes: (notes) => set({ interviewNotes: notes }),
  addInterviewNote: (note) =>
    set((state) => ({ interviewNotes: [...state.interviewNotes, note] })),
  updateInterviewNote: (id, updatedData) =>
    set((state) => ({
      interviewNotes: state.interviewNotes.map((note) =>
        note.id === id ? { ...note, ...updatedData } : note
      ),
    })),
  removeInterviewNote: (id) =>
    set((state) => ({
      interviewNotes: state.interviewNotes.filter((note) => note.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
}));
