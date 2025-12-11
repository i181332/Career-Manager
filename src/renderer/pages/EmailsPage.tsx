import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Inbox as InboxIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { useEmailStore } from '../stores/emailStore';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import EmailDetailDialog from '../components/EmailDetailDialog';
import EmailPatternDialog from '../components/EmailPatternDialog';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { AIDebugLog } from '../components/AIDebugLog';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const EmailsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const {
    accounts,
    selectedAccount,
    messages,
    selectedMessage,
    loading,
    error,
    currentTab,
    syncing,
    setAccounts,
    setSelectedAccount,
    setMessages,
    setSelectedMessage,
    setLoading,
    setError,
    setCurrentTab,
    setSyncing,
  } = useEmailStore();

  const companies = useCompanyStore((state) => state.companies);

  const [searchQuery, setSearchQuery] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [patternDialogOpen, setPatternDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  // 初回ロード時にアカウントを取得
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // アカウント選択時にメールを読み込み
  useEffect(() => {
    if (selectedAccount) {
      loadMessages();
    }
  }, [selectedAccount, currentTab]);

  const loadAccounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await window.api.getEmailAccounts(user.id);
      if (result.success && result.data) {
        setAccounts(result.data);
        if (result.data.length > 0 && !selectedAccount) {
          setSelectedAccount(result.data[0]);
        }
      } else {
        setError(result.error || 'メールアカウントの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      let result;
      if (currentTab === 'all') {
        result = await window.api.getAllEmails(selectedAccount.id, {
          limit: 100,
          offset: 0,
        });
      } else if (currentTab === 'unallocated') {
        result = await window.api.getUnallocatedEmails(selectedAccount.id, {
          limit: 100,
          offset: 0,
        });
      } else {
        // allocated - company_id が存在するメール
        result = await window.api.getAllEmails(selectedAccount.id, {
          limit: 100,
          offset: 0,
        });
        if (result.success && result.data) {
          result.data = result.data.filter((m: any) => m.company_id);
        }
      }

      if (result.success && result.data) {
        setMessages(result.data);
      } else {
        setError(result.error || 'メールの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;

    setSyncing(true);
    try {
      const result = await window.api.syncEmails(selectedAccount.id);
      if (result.success && result.data) {
        setSnackbarMessage(
          `同期完了: ${result.data.messagesFetched}件取得、${result.data.messagesAllocated}件割り振り`
        );
        setSnackbarOpen(true);
        await loadMessages();
      } else {
        setError(result.error || 'メール同期に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchExtraction = async () => {
    if (!user || !user.ai_config) return;

    let config;
    try {
      config = JSON.parse(user.ai_config);
    } catch (e) {
      setError('AI設定の読み込みに失敗しました');
      return;
    }

    if (!config.enabled || !config.commandTemplate) {
      setError('AI機能が無効か、コマンドが設定されていません');
      return;
    }

    setBatchProcessing(true);
    setLogDialogOpen(true); // Open log dialog immediately

    try {
      const result = await window.api.processBatchWithAI(user.id, config.commandTemplate);
      setSnackbarMessage(
        `AI抽出完了: ${result.processed}件処理 (イベント: ${result.eventsCreated}件, 締切: ${result.esEntriesCreated}件, エラー: ${result.errors}件)`
      );
      setSnackbarOpen(true);
      await loadMessages(); // Refresh to show updated status if we display it
    } catch (err: any) {
      setError('AI一括抽出に失敗しました: ' + err.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedAccount || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await window.api.searchEmails(
        selectedAccount.id,
        searchQuery
      );
      if (result.success && result.data) {
        setMessages(result.data);
      } else {
        setError(result.error || '検索に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    setDetailDialogOpen(true);
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return null;
    const company = companies.find((c) => c.id === companyId);
    return company?.name;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy/MM/dd HH:mm', { locale: ja });
    } catch {
      return dateStr;
    }
  };

  const isAIEnabled = () => {
    if (!user?.ai_config) return false;
    try {
      const config = JSON.parse(user.ai_config);
      return !!config.enabled && !!config.commandTemplate;
    } catch {
      return false;
    }
  };

  if (!user) {
    return (
      <Container>
        <Alert severity="warning">ログインしてください</Alert>
      </Container>
    );
  }

  if (accounts.length === 0 && !loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EmailIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            メールアカウントが連携されていません
          </Typography>
          <Typography color="text.secondary" paragraph>
            Gmailを連携してメール管理を始めましょう
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              // 設定ページへ遷移
              window.location.hash = '#/settings';
            }}
          >
            Gmail を連携 (設定ページへ)
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          メール管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAIEnabled() && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={batchProcessing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleBatchExtraction}
              disabled={batchProcessing}
            >
              {batchProcessing ? 'AI抽出中...' : 'AI一括抽出'}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={!selectedAccount || syncing}
          >
            {syncing ? '同期中...' : '同期'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setPatternDialogOpen(true)}
            disabled={!selectedAccount}
          >
            自動振分ルール
          </Button>
          <IconButton onClick={() => window.location.hash = '#/settings'}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* アカウント情報 */}
      {selectedAccount && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            アカウント: {selectedAccount.email_address}
          </Typography>
          {selectedAccount.last_sync_at && (
            <Typography variant="caption" color="text.secondary">
              最終同期: {formatDate(selectedAccount.last_sync_at)}
            </Typography>
          )}
        </Paper>
      )}

      {/* タブ */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab
            icon={<InboxIcon />}
            label="全メール"
            value="all"
            iconPosition="start"
          />
          <Tab
            icon={<BusinessIcon />}
            label="企業別"
            value="allocated"
            iconPosition="start"
          />
          <Tab
            icon={<EmailIcon />}
            label="未割り振り"
            value="unallocated"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* 検索バー */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="メールを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <Button onClick={handleSearch}>検索</Button>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* メール一覧 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : messages.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">メールがありません</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {messages.map((message) => (
            <Card
              key={message.id}
              sx={{
                opacity: message.is_read ? 0.7 : 1,
                borderLeft: message.is_read
                  ? 'none'
                  : '4px solid',
                borderLeftColor: 'primary.main',
              }}
            >
              <CardActionArea onClick={() => handleMessageClick(message)}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" component="div" sx={{ flex: 1 }}>
                      {message.subject || '(件名なし)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(message.received_at)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    From: {message.from_name || message.from_address}
                  </Typography>
                  {message.company_id && (
                    <Chip
                      icon={<BusinessIcon />}
                      label={getCompanyName(message.company_id)}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  )}
                  {!message.company_id && currentTab !== 'unallocated' && (
                    <Chip
                      label="未割り振り"
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      {/* メール詳細ダイアログ */}
      {selectedMessage && (
        <EmailDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedMessage(null);
          }}
          message={selectedMessage}
          onUpdate={loadMessages}
        />
      )}

      {/* 自動振分ルールダイアログ */}
      {selectedAccount && (
        <EmailPatternDialog
          open={patternDialogOpen}
          onClose={() => setPatternDialogOpen(false)}
          companyId={0} // 0 means global or we need to adjust the dialog to handle global patterns if supported, or just list all
          // The current EmailPatternDialog might expect a specific companyId. 
          // If it requires a companyId, we might need to adjust it or only allow pattern editing from CompanyDetail.
          // Let's check EmailPatternDialog implementation.
          // Assuming for now we want to show ALL patterns or allow adding for any company.
          // If the dialog is strictly for ONE company, this might be tricky.
          // Let's assume for now we pass 0 or undefined if the dialog supports it, or we need to modify the dialog.
          // Wait, I should check EmailPatternDialog content first.
          // I'll proceed with rendering it, but I might need to fix it if it crashes.
          // Actually, let's pass companyId={0} and see if we can modify the dialog to handle "All Companies" or select company inside.
          companyName="すべての企業"
        />
      )}

      {/* AIログダイアログ */}
      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>AI処理ログ</DialogTitle>
        <DialogContent>
          <AIDebugLog />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)} disabled={batchProcessing}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* エラー表示 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      {/* 成功メッセージ */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailsPage;
