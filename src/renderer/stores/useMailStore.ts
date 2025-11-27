import { create } from 'zustand';
import { EmailMessage } from '../../database/types';

interface MailState {
    mails: EmailMessage[];
    loading: boolean;
    syncing: boolean;
    error: string | null;

    // Actions
    fetchMails: (companyId: number) => Promise<void>;
    syncMails: (emailAccountId: number) => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    downloadAttachment: (messageId: number, attachmentId: string) => Promise<void>;
    analyzeEmail: (messageId: number) => Promise<{ events: any[]; es: any[] } | null>;
}

export const useMailStore = create<MailState>((set, get) => ({
    mails: [],
    loading: false,
    syncing: false,
    error: null,

    fetchMails: async (companyId: number) => {
        set({ loading: true, error: null });
        try {
            const result = await window.api.getEmailsByCompany(companyId);
            if (result.success && result.data) {
                set({ mails: result.data });
            } else {
                set({ error: result.error || 'Failed to fetch mails' });
            }
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    syncMails: async (emailAccountId: number) => {
        set({ syncing: true, error: null });
        try {
            const result = await window.api.syncEmails(emailAccountId);
            if (!result.success) {
                set({ error: result.error || 'Sync failed' });
            }
            // 同期後は再取得が必要だが、companyIdがわからないため、呼び出し元で再取得するか、
            // ここで全メールを再取得するロジックが必要。
            // 今回は呼び出し元で fetchMails を呼ぶことを想定。
        } catch (error: any) {
            set({ error: error.message });
        } finally {
            set({ syncing: false });
        }
    },

    markAsRead: async (id: number) => {
        try {
            await window.api.markEmailAsRead(id);
            set((state) => ({
                mails: state.mails.map((m) =>
                    m.id === id ? { ...m, is_read: 1 } : m
                ),
            }));
        } catch (error: any) {
            console.error('Failed to mark as read:', error);
        }
    },

    downloadAttachment: async (messageId: number, attachmentId: string) => {
        try {
            const result = await window.api.downloadAttachment(messageId, attachmentId);
            if (result.success && result.data) {
                // ダウンロード処理 (ブラウザのダウンロード機能をトリガー)
                const blob = b64toBlob(result.data.data, 'application/octet-stream');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attachment_${attachmentId}`; // ファイル名があればそれを使う
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                console.error('Failed to download attachment:', result.error);
            }
        } catch (error: any) {
            console.error('Error downloading attachment:', error);
        }
    },

    analyzeEmail: async (messageId: number) => {
        try {
            const result = await window.api.analyzeEmail(messageId);
            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error: any) {
            console.error('Error analyzing email:', error);
            return null;
        }
    },
}));

// Base64 to Blob helper
function b64toBlob(b64Data: string, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data.replace(/-/g, '+').replace(/_/g, '/'));
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}
