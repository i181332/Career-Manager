import { create } from 'zustand';

interface EmailAccount {
  id: number;
  user_id: number;
  email_address: string;
  provider: string;
  last_sync_at?: string;
  sync_enabled: number;
  created_at: string;
  updated_at: string;
}

interface EmailMessage {
  id: number;
  email_account_id: number;
  message_id: string;
  thread_id?: string;
  company_id?: number;
  subject?: string;
  from_address: string;
  from_name?: string;
  to_address?: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  is_read: number;
  is_starred: number;
  has_attachments: number;
  allocation_method?: string;
  allocated_at?: string;
}

interface CompanyEmailPattern {
  id: number;
  company_id: number;
  pattern_type: string;
  pattern_value: string;
  priority: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface EmailState {
  accounts: EmailAccount[];
  selectedAccount: EmailAccount | null;
  messages: EmailMessage[];
  selectedMessage: EmailMessage | null;
  patterns: CompanyEmailPattern[];
  loading: boolean;
  error: string | null;
  currentTab: 'all' | 'allocated' | 'unallocated';
  syncing: boolean;

  // Actions
  setAccounts: (accounts: EmailAccount[]) => void;
  setSelectedAccount: (account: EmailAccount | null) => void;
  setMessages: (messages: EmailMessage[]) => void;
  setSelectedMessage: (message: EmailMessage | null) => void;
  setPatterns: (patterns: CompanyEmailPattern[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentTab: (tab: 'all' | 'allocated' | 'unallocated') => void;
  setSyncing: (syncing: boolean) => void;
  addMessage: (message: EmailMessage) => void;
  updateMessage: (message: EmailMessage) => void;
  removeMessage: (id: number) => void;
  addPattern: (pattern: CompanyEmailPattern) => void;
  removePattern: (id: number) => void;
  reset: () => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  accounts: [],
  selectedAccount: null,
  messages: [],
  selectedMessage: null,
  patterns: [],
  loading: false,
  error: null,
  currentTab: 'all',
  syncing: false,

  setAccounts: (accounts) => set({ accounts }),
  setSelectedAccount: (account) => set({ selectedAccount: account }),
  setMessages: (messages) => set({ messages }),
  setSelectedMessage: (message) => set({ selectedMessage: message }),
  setPatterns: (patterns) => set({ patterns }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentTab: (tab) => set({ currentTab: tab }),
  setSyncing: (syncing) => set({ syncing }),
  addMessage: (message) =>
    set((state) => ({ messages: [message, ...state.messages] })),
  updateMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  addPattern: (pattern) =>
    set((state) => ({ patterns: [...state.patterns, pattern] })),
  removePattern: (id) =>
    set((state) => ({
      patterns: state.patterns.filter((p) => p.id !== id),
    })),
  reset: () =>
    set({
      accounts: [],
      selectedAccount: null,
      messages: [],
      selectedMessage: null,
      patterns: [],
      loading: false,
      error: null,
      currentTab: 'all',
      syncing: false,
    }),
}));
