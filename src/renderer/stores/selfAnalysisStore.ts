import { create } from 'zustand';

export interface SelfAnalysis {
  id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  tags: string;
  linked_companies: string;
  created_at: string;
  updated_at: string;
}

interface SelfAnalysisState {
  selfAnalyses: SelfAnalysis[];
  loading: boolean;
  setSelfAnalyses: (selfAnalyses: SelfAnalysis[]) => void;
  addSelfAnalysis: (selfAnalysis: SelfAnalysis) => void;
  updateSelfAnalysis: (id: number, selfAnalysis: Partial<SelfAnalysis>) => void;
  removeSelfAnalysis: (id: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useSelfAnalysisStore = create<SelfAnalysisState>((set) => ({
  selfAnalyses: [],
  loading: false,
  setSelfAnalyses: (selfAnalyses) => set({ selfAnalyses }),
  addSelfAnalysis: (selfAnalysis) =>
    set((state) => ({ selfAnalyses: [...state.selfAnalyses, selfAnalysis] })),
  updateSelfAnalysis: (id, updatedData) =>
    set((state) => ({
      selfAnalyses: state.selfAnalyses.map((sa) =>
        sa.id === id ? { ...sa, ...updatedData } : sa
      ),
    })),
  removeSelfAnalysis: (id) =>
    set((state) => ({
      selfAnalyses: state.selfAnalyses.filter((sa) => sa.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
}));
