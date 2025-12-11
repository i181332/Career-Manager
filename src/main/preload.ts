import { contextBridge, ipcRenderer } from 'electron';

// Renderer プロセスに公開するAPI
const api = {
  // 基本通信
  ping: () => ipcRenderer.invoke('ping'),

  // ユーザー関連
  createUser: (userData: any) => ipcRenderer.invoke('user:register', userData),
  getUser: (userId: number) => ipcRenderer.invoke('user:get', userId),
  login: (email: string, password: string) =>
    ipcRenderer.invoke('user:login', email, password),
  updateUser: (userId: number, userData: any) =>
    ipcRenderer.invoke('user:update', userId, userData),

  // 企業関連（後で実装）
  getCompanies: (userId: number) => ipcRenderer.invoke('companies:getAll', userId),
  getCompany: (id: number) => ipcRenderer.invoke('companies:get', id),
  createCompany: (companyData: any) => ipcRenderer.invoke('companies:create', companyData),
  updateCompany: (id: number, companyData: any) =>
    ipcRenderer.invoke('companies:update', id, companyData),
  deleteCompany: (id: number) => ipcRenderer.invoke('companies:delete', id),

  // イベント関連
  getEvents: (userId: number, startDate?: string, endDate?: string) =>
    ipcRenderer.invoke('events:getAll', userId, startDate, endDate),
  getEventsByCompany: (companyId: number) => ipcRenderer.invoke('events:getByCompany', companyId),
  getEvent: (id: number) => ipcRenderer.invoke('events:get', id),
  createEvent: (eventData: any) => ipcRenderer.invoke('events:create', eventData),
  updateEvent: (id: number, eventData: any) =>
    ipcRenderer.invoke('events:update', id, eventData),
  deleteEvent: (id: number) => ipcRenderer.invoke('events:delete', id),

  // ES関連
  getESEntries: (userId: number) => ipcRenderer.invoke('es:getAll', userId),
  getESByCompany: (companyId: number) => ipcRenderer.invoke('es:getByCompany', companyId),
  createESEntry: (esData: any) => ipcRenderer.invoke('es:create', esData),
  updateESEntry: (id: number, esData: any) => ipcRenderer.invoke('es:update', id, esData),
  deleteESEntry: (id: number) => ipcRenderer.invoke('es:delete', id),

  // 自己分析関連
  getSelfAnalyses: (userId: number) => ipcRenderer.invoke('selfAnalyses:getAll', userId),
  createSelfAnalysis: (data: any) => ipcRenderer.invoke('selfAnalyses:create', data),
  updateSelfAnalysis: (id: number, data: any) =>
    ipcRenderer.invoke('selfAnalyses:update', id, data),
  deleteSelfAnalysis: (id: number) => ipcRenderer.invoke('selfAnalyses:delete', id),

  // 面接ノート関連
  getInterviewNotes: (userId: number) => ipcRenderer.invoke('interviewNotes:getAll', userId),
  getInterviewNotesByCompany: (companyId: number) => ipcRenderer.invoke('interviewNotes:getByCompany', companyId),
  createInterviewNote: (data: any) => ipcRenderer.invoke('interviewNotes:create', data),
  updateInterviewNote: (id: number, data: any) =>
    ipcRenderer.invoke('interviewNotes:update', id, data),
  deleteInterviewNote: (id: number) => ipcRenderer.invoke('interviewNotes:delete', id),

  // 通知関連
  getNotifications: (userId: number) => ipcRenderer.invoke('notifications:getAll', userId),
  getNotificationsByStatus: (userId: number, status: string) =>
    ipcRenderer.invoke('notifications:getByStatus', userId, status),
  sendSlackNotification: (notificationId: number, webhookUrl: string) =>
    ipcRenderer.invoke('notifications:sendSlack', notificationId, webhookUrl),
  retryNotification: (notificationId: number) =>
    ipcRenderer.invoke('notifications:retry', notificationId),
  checkNotificationsNow: () => ipcRenderer.invoke('notifications:checkNow'),
  sendTestNotification: (webhookUrl: string) =>
    ipcRenderer.invoke('notifications:sendTest', webhookUrl),

  // スケジューラー関連
  startScheduler: (webhookUrl?: string) => ipcRenderer.invoke('scheduler:start', webhookUrl),
  stopScheduler: () => ipcRenderer.invoke('scheduler:stop'),
  setWebhookUrl: (webhookUrl: string) =>
    ipcRenderer.invoke('scheduler:setWebhook', webhookUrl),

  // エクスポート関連
  exportData: (format: 'json' | 'csv', dataType: string, userId: number) =>
    ipcRenderer.invoke('export:data', format, dataType, userId),

  // カレンダーエクスポート関連
  exportCalendarToICal: (userId: number) =>
    ipcRenderer.invoke('calendar:exportIcal', userId),

  // ES版数管理関連
  createESVersion: (esEntryId: number, content: string, userId: number) =>
    ipcRenderer.invoke('es:createVersion', esEntryId, content, userId),
  getESVersions: (esEntryId: number) =>
    ipcRenderer.invoke('es:getVersions', esEntryId),
  restoreESVersion: (esEntryId: number, versionId: number) =>
    ipcRenderer.invoke('es:restoreVersion', esEntryId, versionId),

  // 自動アップデート関連
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  // メールアカウント管理
  getGmailAuthUrl: () => ipcRenderer.invoke('email:getAuthUrl'),
  authenticateGmail: (authCode: string, userId: number) =>
    ipcRenderer.invoke('email:authenticate', authCode, userId),
  startGmailAuth: (userId: number) => ipcRenderer.invoke('email:startAuth', userId),
  getEmailAccounts: (userId: number) => ipcRenderer.invoke('email:getAccounts', userId),
  syncEmails: (emailAccountId: number) => ipcRenderer.invoke('email:syncNow', emailAccountId),
  syncAllEmails: () => ipcRenderer.invoke('email:syncAll'),
  syncCalendar: (userId: number) => ipcRenderer.invoke('calendar:sync', userId),

  // メッセージ取得
  getEmailsByCompany: (companyId: number, pagination?: any) =>
    ipcRenderer.invoke('email:getByCompany', companyId, pagination),
  getUnallocatedEmails: (emailAccountId: number, pagination?: any) =>
    ipcRenderer.invoke('email:getUnallocated', emailAccountId, pagination),
  getAllEmails: (emailAccountId: number, pagination?: any) =>
    ipcRenderer.invoke('email:getAll', emailAccountId, pagination),
  getEmailMessage: (id: number) => ipcRenderer.invoke('email:getMessage', id),
  markEmailAsRead: (id: number) => ipcRenderer.invoke('email:markAsRead', id),
  searchEmails: (emailAccountId: number, query: string) =>
    ipcRenderer.invoke('email:search', emailAccountId, query),

  // メール割り振り
  allocateEmail: (emailMessageId: number, companyId: number) =>
    ipcRenderer.invoke('email:allocate', emailMessageId, companyId),
  unallocateEmail: (emailMessageId: number) =>
    ipcRenderer.invoke('email:unallocate', emailMessageId),

  // パターン管理
  addEmailPattern: (companyId: number, patternData: any) =>
    ipcRenderer.invoke('email:addPattern', companyId, patternData),
  getEmailPatterns: (companyId: number) => ipcRenderer.invoke('email:getPatterns', companyId),
  removeEmailPattern: (patternId: number) =>
    ipcRenderer.invoke('email:removePattern', patternId),
  reallocateAllEmails: (emailAccountId: number) =>
    ipcRenderer.invoke('email:reallocateAll', emailAccountId),

  downloadAttachment: (emailMessageId: number, attachmentId: string) =>
    ipcRenderer.invoke('email:downloadAttachment', emailMessageId, attachmentId),

  analyzeEmail: (emailMessageId: number) => ipcRenderer.invoke('email:analyze', emailMessageId),

  // システム関連
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // AI関連
  extractEventWithAI: (emailBody: string, commandTemplate: string) =>
    ipcRenderer.invoke('llm:extract-event', emailBody, commandTemplate),
  processBatchWithAI: (userId: number, commandTemplate: string) =>
    ipcRenderer.invoke('llm:process-batch', userId, commandTemplate),

  // ログ関連
  onAILog: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai:log', subscription);
    return () => ipcRenderer.removeListener('ai:log', subscription);
  },
};

// APIを window.api として公開
contextBridge.exposeInMainWorld('api', api);

// TypeScript用の型定義をエクスポート
export type ElectronAPI = typeof api;
