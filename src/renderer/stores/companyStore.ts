import { create } from 'zustand';

export interface Company {
  id: number;
  user_id: number;
  name: string;
  industry?: string;
  size?: string;
  url?: string;
  status: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  loading: boolean;
  error: string | null;
  setCompanies: (companies: Company[]) => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  removeCompany: (id: number) => void;
  setSelectedCompany: (company: Company | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  selectedCompany: null,
  loading: false,
  error: null,
  setCompanies: (companies) => set({ companies }),
  addCompany: (company) =>
    set((state) => ({ companies: [company, ...state.companies] })),
  updateCompany: (company) =>
    set((state) => ({
      companies: state.companies.map((c) => (c.id === company.id ? company : c)),
      selectedCompany:
        state.selectedCompany?.id === company.id ? company : state.selectedCompany,
    })),
  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
      selectedCompany: state.selectedCompany?.id === id ? null : state.selectedCompany,
    })),
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
