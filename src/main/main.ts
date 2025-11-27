import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';
import { initDatabase } from '../database/init';
import { AuthService } from './services/authService';
import { CompanyService } from './services/companyService';
import { EventService } from './services/eventService';
import { NotificationService } from './services/notificationService';
import { SchedulerService } from './services/schedulerService';
import { ESEntryService } from './services/esEntryService';
import { SelfAnalysisService } from './services/selfAnalysisService';
import { InterviewNoteService } from './services/interviewNoteService';
import { ExportService } from './services/exportService';
import { CalendarExportService } from './services/calendarExportService';
import { EmailService } from './services/emailService';
import { EmailAllocationService } from './services/emailAllocationService';

// ログファイルの設定
const logPath = path.join(app.getPath('userData'), 'electron.log');
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logPath, logMessage);
};

log('=== Application Starting ===');

let mainWindow: BrowserWindow | null = null;
// サービスインスタンス（データベース初期化後に作成）
let authService: AuthService;
let companyService: CompanyService;
let eventService: EventService;
let notificationService: NotificationService;
let schedulerService: SchedulerService;
let esEntryService: ESEntryService;
let selfAnalysisService: SelfAnalysisService;
let interviewNoteService: InterviewNoteService;
let exportService: ExportService;
let calendarExportService: CalendarExportService;
let emailService: EmailService;
let emailAllocationService: EmailAllocationService;

// 開発モードの判定：Viteサーバーが利用可能かどうかで判定
const isDev = process.argv.includes('--dev') || process.env.ELECTRON_IS_DEV === '1';

log('=== Electron Startup ===');
log(`isDev: ${isDev}`);
log(`process.argv: ${JSON.stringify(process.argv)}`);
log(`ELECTRON_IS_DEV: ${process.env.ELECTRON_IS_DEV}`);
log(`app.isPackaged: ${app.isPackaged}`);
log('=======================');

function createWindow() {
  // preload.jsの正しいパスを取得
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.js');

  log(`Preload path: ${preloadPath}`);
  log(`Preload exists: ${fs.existsSync(preloadPath)}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: '就活管理',
    show: true, // すぐに表示
  });

  // 開発環境ではViteのサーバーを、本番環境ではビルド済みファイルをロード
  if (isDev) {
    log('Loading Vite server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 本番環境のパスを修正
    const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
    log(`Loading file: ${indexPath}`);
    log(`File exists: ${fs.existsSync(indexPath)}`);

    mainWindow.loadFile(indexPath).catch(err => {
      log(`Failed to load file: ${err}`);
    });
  }

  // デバッグ用
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`Did fail load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`Console [${level}]: ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Page finished loading');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 自動更新設定
function setupAutoUpdater() {
  if (!isDev) {
    // 自動ダウンロードを無効化（ユーザーに確認してから更新）
    autoUpdater.autoDownload = false;

    autoUpdater.on('checking-for-update', () => {
      log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      log(`Update available: ${info.version}`);
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', () => {
      log('Update not available');
    });

    autoUpdater.on('error', (err) => {
      log(`Update error: ${err}`);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      log(message);
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      log(`Update downloaded: ${info.version}`);
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // アプリ起動時に更新をチェック
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);

    // 1時間ごとに更新をチェック
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 3600000);
  }
}

// メール同期設定
function setupEmailSync() {
  // アプリ起動時に同期
  setTimeout(() => {
    log('Starting initial email sync...');
    emailService.syncAllActiveAccounts();
  }, 5000);

  // 5分ごとに同期
  setInterval(() => {
    log('Starting scheduled email sync...');
    emailService.syncAllActiveAccounts();
  }, 300000);
}

// サービスの初期化（データベース初期化後に呼び出す）
function initializeServices() {
  authService = new AuthService();
  companyService = new CompanyService();
  eventService = new EventService();
  notificationService = new NotificationService();
  schedulerService = new SchedulerService();
  esEntryService = new ESEntryService();
  selfAnalysisService = new SelfAnalysisService();
  interviewNoteService = new InterviewNoteService();
  exportService = new ExportService();
  calendarExportService = new CalendarExportService();
  emailService = new EmailService();
  emailAllocationService = new EmailAllocationService();
}

// アプリケーションの初期化
app.whenReady().then(async () => {
  try {
    // データベースの初期化
    await initDatabase();

    // サービスの初期化（データベース初期化後）
    initializeServices();

    // IPCハンドラーの登録
    registerIpcHandlers();

    createWindow();

    // 自動更新設定
    setupAutoUpdater();

    // メール同期設定
    setupEmailSync();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPCハンドラーの登録
function registerIpcHandlers() {
  // テスト用
  ipcMain.handle('ping', () => {
    return 'pong';
  });

  // 認証関連
  ipcMain.handle('user:register', async (_event, userData) => {
    return await authService.register(userData);
  });

  ipcMain.handle('user:login', async (_event, email, password) => {
    return await authService.login(email, password);
  });

  ipcMain.handle('user:get', (_event, userId) => {
    return authService.getUser(userId);
  });

  ipcMain.handle('user:update', (_event, userId, userData) => {
    return authService.updateUser(userId, userData);
  });

  // 企業関連
  ipcMain.handle('companies:getAll', (_event, userId) => {
    return companyService.getByUserId(userId);
  });

  ipcMain.handle('companies:get', (_event, id) => {
    return companyService.getById(id);
  });

  ipcMain.handle('companies:create', (_event, companyData) => {
    return companyService.create(companyData);
  });

  ipcMain.handle('companies:update', (_event, id, companyData) => {
    return companyService.update(id, companyData);
  });

  ipcMain.handle('companies:delete', (_event, id) => {
    return companyService.delete(id);
  });

  ipcMain.handle('companies:search', (_event, userId, query) => {
    return companyService.search(userId, query);
  });

  ipcMain.handle('companies:getByStatus', (_event, userId, status) => {
    return companyService.getByStatus(userId, status);
  });

  // イベント関連
  ipcMain.handle('events:getAll', (_event, userId, startDate?, endDate?) => {
    if (startDate && endDate) {
      return eventService.getByDateRange(userId, startDate, endDate);
    }
    return eventService.getByUserId(userId);
  });

  ipcMain.handle('events:get', (_event, id) => {
    return eventService.getById(id);
  });

  ipcMain.handle('events:create', (_event, eventData) => {
    return eventService.create(eventData);
  });

  ipcMain.handle('events:update', (_event, id, eventData) => {
    return eventService.update(id, eventData);
  });

  ipcMain.handle('events:delete', (_event, id) => {
    return eventService.delete(id);
  });

  ipcMain.handle('events:getByCompany', (_event, companyId) => {
    return eventService.getByCompanyId(companyId);
  });

  ipcMain.handle('events:getUpcoming', (_event, userId, limit) => {
    return eventService.getUpcoming(userId, limit);
  });

  // 通知関連
  ipcMain.handle('notifications:getAll', (_event, userId) => {
    return notificationService.getByUserId(userId);
  });

  ipcMain.handle('notifications:getByStatus', (_event, userId, status) => {
    return notificationService.getByStatus(userId, status);
  });

  ipcMain.handle('notifications:sendSlack', async (_event, notificationId, webhookUrl) => {
    return await notificationService.sendSlackNotification(notificationId, webhookUrl);
  });

  ipcMain.handle('notifications:retry', (_event, notificationId) => {
    return notificationService.retryNotification(notificationId);
  });

  ipcMain.handle('notifications:checkNow', async () => {
    try {
      console.log('=== IPC: notifications:checkNow called ===');
      await schedulerService.checkNow();
      console.log('=== IPC: notifications:checkNow completed ===');
      return { success: true };
    } catch (error) {
      console.error('=== IPC: notifications:checkNow error ===', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('notifications:sendTest', async (_event, webhookUrl: string) => {
    try {
      console.log('=== IPC: notifications:sendTest called ===');
      const result = await notificationService.sendTestNotification(webhookUrl);
      console.log('=== IPC: notifications:sendTest result ===', result);
      return result;
    } catch (error) {
      console.error('=== IPC: notifications:sendTest error ===', error);
      return { success: false, error: String(error) };
    }
  });

  // スケジューラー関連
  ipcMain.handle('scheduler:start', (_event, webhookUrl) => {
    schedulerService.start(webhookUrl);
    return { success: true };
  });

  ipcMain.handle('scheduler:stop', () => {
    schedulerService.stop();
    return { success: true };
  });

  ipcMain.handle('scheduler:setWebhook', (_event, webhookUrl) => {
    schedulerService.setWebhookUrl(webhookUrl);
    return { success: true };
  });

  // ES関連
  ipcMain.handle('es:getAll', (_event, userId) => {
    return esEntryService.getByUserId(userId);
  });

  ipcMain.handle('es:get', (_event, id) => {
    return esEntryService.getById(id);
  });

  ipcMain.handle('es:create', (_event, esData) => {
    return esEntryService.create(esData);
  });

  ipcMain.handle('es:update', (_event, id, esData) => {
    return esEntryService.update(id, esData);
  });

  ipcMain.handle('es:delete', (_event, id) => {
    return esEntryService.delete(id);
  });

  ipcMain.handle('es:getByCompany', (_event, companyId) => {
    return esEntryService.getByCompanyId(companyId);
  });

  ipcMain.handle('es:getByStatus', (_event, userId, status) => {
    return esEntryService.getByStatus(userId, status);
  });

  ipcMain.handle('es:search', (_event, userId, query) => {
    return esEntryService.search(userId, query);
  });

  ipcMain.handle('es:getDeadlineApproaching', (_event, userId, daysAhead) => {
    return esEntryService.getDeadlineApproaching(userId, daysAhead);
  });

  // 自己分析関連
  ipcMain.handle('selfAnalyses:getAll', (_event, userId) => {
    return selfAnalysisService.getByUserId(userId);
  });

  ipcMain.handle('selfAnalyses:get', (_event, id) => {
    return selfAnalysisService.getById(id);
  });

  ipcMain.handle('selfAnalyses:create', (_event, analysisData) => {
    return selfAnalysisService.create(analysisData);
  });

  ipcMain.handle('selfAnalyses:update', (_event, id, analysisData) => {
    return selfAnalysisService.update(id, analysisData);
  });

  ipcMain.handle('selfAnalyses:delete', (_event, id) => {
    return selfAnalysisService.delete(id);
  });

  ipcMain.handle('selfAnalyses:getByCategory', (_event, userId, category) => {
    return selfAnalysisService.getByCategory(userId, category);
  });

  ipcMain.handle('selfAnalyses:search', (_event, userId, query) => {
    return selfAnalysisService.search(userId, query);
  });

  ipcMain.handle('selfAnalyses:getCategories', (_event, userId) => {
    return selfAnalysisService.getCategories(userId);
  });

  // 面接ノート関連
  ipcMain.handle('interviewNotes:getAll', (_event, userId) => {
    return interviewNoteService.getByUserId(userId);
  });

  ipcMain.handle('interviewNotes:get', (_event, id) => {
    return interviewNoteService.getById(id);
  });

  ipcMain.handle('interviewNotes:create', (_event, noteData) => {
    return interviewNoteService.create(noteData);
  });

  ipcMain.handle('interviewNotes:update', (_event, id, noteData) => {
    return interviewNoteService.update(id, noteData);
  });

  ipcMain.handle('interviewNotes:delete', (_event, id) => {
    return interviewNoteService.delete(id);
  });

  ipcMain.handle('interviewNotes:getByCompany', (_event, companyId) => {
    return interviewNoteService.getByCompanyId(companyId);
  });

  ipcMain.handle('interviewNotes:search', (_event, userId, query) => {
    return interviewNoteService.search(userId, query);
  });

  ipcMain.handle('interviewNotes:getUpcoming', (_event, userId, daysAhead) => {
    return interviewNoteService.getUpcoming(userId, daysAhead);
  });

  // エクスポート関連
  ipcMain.handle('export:data', async (_event, format, dataType, userId) => {
    return await exportService.exportData(format, dataType, userId);
  });

  // 自動更新関連
  ipcMain.handle('updater:check', async () => {
    if (!isDev) {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    }
    return { success: false, error: 'Development mode' };
  });

  ipcMain.handle('updater:download', async () => {
    if (!isDev) {
      await autoUpdater.downloadUpdate();
      return { success: true };
    }
    return { success: false, error: 'Development mode' };
  });

  ipcMain.handle('updater:install', () => {
    if (!isDev) {
      autoUpdater.quitAndInstall();
      return { success: true };
    }
    return { success: false, error: 'Development mode' };
  });

  // カレンダーエクスポート関連
  ipcMain.handle('calendar:exportIcal', async (_event, userId) => {
    return await calendarExportService.exportToICal(userId);
  });

  // ESバージョン管理関連
  ipcMain.handle('es:createVersion', (_event, esEntryId, content, userId) => {
    return esEntryService.createVersion(esEntryId, content, userId);
  });

  ipcMain.handle('es:getVersions', (_event, esEntryId) => {
    return esEntryService.getVersions(esEntryId);
  });

  ipcMain.handle('es:restoreVersion', (_event, esEntryId, versionId) => {
    return esEntryService.restoreVersion(esEntryId, versionId);
  });

  // メールアカウント管理
  ipcMain.handle('email:getAuthUrl', () => {
    return { success: true, data: emailService.getGmailAuthUrl() };
  });

  ipcMain.handle('email:authenticate', async (_event, authCode, userId) => {
    return await emailService.authenticateGmail(authCode, userId);
  });

  ipcMain.handle('email:getAccounts', async (_event, userId) => {
    return await emailService.getAccountsByUserId(userId);
  });

  ipcMain.handle('email:syncNow', async (_event, emailAccountId) => {
    return await emailService.syncEmails(emailAccountId);
  });

  // メッセージ取得
  ipcMain.handle('email:getByCompany', async (_event, companyId, pagination) => {
    return await emailService.getEmailsByCompany(companyId, pagination);
  });

  ipcMain.handle('email:getUnallocated', async (_event, emailAccountId, pagination) => {
    return await emailService.getUnallocatedEmails(emailAccountId, pagination);
  });

  ipcMain.handle('email:getAll', async (_event, emailAccountId, pagination) => {
    return await emailService.getAllEmails(emailAccountId, pagination);
  });

  ipcMain.handle('email:getMessage', async (_event, id) => {
    return await emailService.getEmailMessage(id);
  });

  ipcMain.handle('email:markAsRead', async (_event, id) => {
    return await emailService.markAsRead(id);
  });

  ipcMain.handle('email:search', async (_event, emailAccountId, query) => {
    return await emailService.searchEmails(emailAccountId, query);
  });

  // メール割り振り
  ipcMain.handle('email:allocate', async (_event, emailMessageId, companyId) => {
    return await emailAllocationService.manuallyAllocate(emailMessageId, companyId);
  });

  ipcMain.handle('email:unallocate', async (_event, emailMessageId) => {
    return await emailAllocationService.unallocate(emailMessageId);
  });

  // パターン管理
  ipcMain.handle('email:addPattern', async (_event, companyId, patternData) => {
    return await emailAllocationService.addPattern(companyId, patternData);
  });

  ipcMain.handle('email:getPatterns', async (_event, companyId) => {
    return await emailAllocationService.getPatterns(companyId);
  });

  ipcMain.handle('email:removePattern', async (_event, patternId) => {
    return await emailAllocationService.removePattern(patternId);
  });

  ipcMain.handle('email:reallocateAll', async (_event, emailAccountId) => {
    return await emailAllocationService.reallocateAllEmails(emailAccountId);
  });

  ipcMain.handle('email:downloadAttachment', async (_event, emailMessageId, attachmentId) => {
    return await emailService.downloadAttachment(emailMessageId, attachmentId);
  });

  ipcMain.handle('email:analyze', async (_event, emailMessageId) => {
    return await emailService.analyzeEmail(emailMessageId);
  });
}
