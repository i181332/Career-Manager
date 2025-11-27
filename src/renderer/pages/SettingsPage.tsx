import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Notifications as NotificationsIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { EmailAccountSettings } from '../components/EmailAccountSettings';

const SettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.setUser);
  const { mode, toggleTheme } = useThemeStore();

  // プロフィール設定
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // 通知設定
  const [webhookUrl, setWebhookUrl] = useState('');
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(60);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // エクスポート設定
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportType, setExportType] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');

  // アップデート設定
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserEmail(user.email || '');
    }

    const savedWebhook = localStorage.getItem('slackWebhookUrl') || '';
    const savedSchedulerState = localStorage.getItem('schedulerEnabled') === 'true';
    const savedReminderMinutes = localStorage.getItem('defaultReminderMinutes');

    setWebhookUrl(savedWebhook);
    setSchedulerEnabled(savedSchedulerState);
    if (savedReminderMinutes) {
      setDefaultReminderMinutes(parseInt(savedReminderMinutes));
    }

    if (savedSchedulerState && savedWebhook) {
      window.api.startScheduler(savedWebhook);
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;

    try {
      setProfileError('');
      setProfileSaveSuccess(false);

      if (!userName.trim()) {
        setProfileError('ユーザー名を入力してください');
        return;
      }

      if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        setProfileError('有効なメールアドレスを入力してください');
        return;
      }

      const result = await window.api.updateUser(user.id, {
        name: userName,
        email: userEmail || undefined,
      });

      if (result.success && result.user) {
        updateUser(result.user);
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      } else {
        setProfileError(result.error || 'プロフィールの更新に失敗しました');
      }
    } catch (err) {
      console.error('プロフィールの更新に失敗しました:', err);
      setProfileError('プロフィールの更新に失敗しました');
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      setSaveSuccess(false);

      if (webhookUrl && !webhookUrl.startsWith('https://hooks.slack.com/')) {
        setError('有効なSlack Webhook URLを入力してください');
        return;
      }

      localStorage.setItem('slackWebhookUrl', webhookUrl);
      localStorage.setItem('schedulerEnabled', schedulerEnabled.toString());
      localStorage.setItem('defaultReminderMinutes', defaultReminderMinutes.toString());

      if (webhookUrl) {
        await window.api.setWebhookUrl(webhookUrl);
      }

      if (schedulerEnabled && webhookUrl) {
        await window.api.startScheduler(webhookUrl);
      } else {
        await window.api.stopScheduler();
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('設定の保存に失敗しました:', err);
      setError('設定の保存に失敗しました');
    }
  };

  const handleTestNotification = async () => {
    try {
      setError('');
      if (!webhookUrl) {
        setError('Webhook URLを設定してください');
        return;
      }

      console.log('Sending test notification to Slack...');
      const result = await window.api.sendTestNotification(webhookUrl);
      console.log('Test notification result:', result);

      if (result.success) {
        alert('✅ テスト通知をSlackに送信しました！Slackを確認してください。');
      } else {
        setError(result.error || 'テスト通知の送信に失敗しました');
      }
    } catch (err) {
      console.error('テスト通知の送信に失敗しました:', err);
      setError('テスト通知の送信に失敗しました');
    }
  };

  const handleExport = async () => {
    if (!user) return;

    try {
      setExporting(true);
      setError('');
      setExportSuccess('');

      const result = await window.api.exportData(exportFormat, exportType, user.id);

      if (result.success) {
        setExportSuccess(`エクスポートが完了しました`);
        setTimeout(() => setExportSuccess(''), 5000);
      } else {
        if (result.error !== 'キャンセルされました') {
          setError(result.error || 'エクスポートに失敗しました');
        }
      }
    } catch (err) {
      console.error('エクスポートに失敗しました:', err);
      setError('エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      setUpdateChecking(true);
      setUpdateMessage('');

      const result = await window.api.checkForUpdates();

      if (result.available) {
        setUpdateAvailable(true);
        setUpdateMessage(`新しいバージョン ${result.version} が利用可能です`);
      } else {
        setUpdateMessage('最新バージョンを使用中です');
      }
    } catch (error) {
      setUpdateMessage('アップデートの確認に失敗しました');
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      setUpdateDownloading(true);
      await window.api.downloadUpdate();
      setUpdateMessage('アップデートのダウンロードが完了しました。再起動してインストールできます。');
    } catch (error) {
      setUpdateMessage('ダウンロードに失敗しました');
    } finally {
      setUpdateDownloading(false);
    }
  };

  const handleInstallUpdate = () => {
    window.api.installUpdate();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        設定
      </Typography>

      <Stack spacing={3}>
        {/* プロフィール編集セクション */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6">プロフィール</Typography>
          </Box>

          {profileSaveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              プロフィールを更新しました
            </Alert>
          )}

          {profileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {profileError}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="ユーザー名"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              fullWidth
              required
              helperText="表示名として使用されます"
            />

            <TextField
              label="メールアドレス"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              fullWidth
              helperText="任意。通知設定などに使用できます"
            />

            <Box>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleProfileSave}>
                保存
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* メール設定セクション */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">メール設定</Typography>
          </Box>
          <EmailAccountSettings />
        </Paper>

        {/* テーマ設定セクション */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {mode === 'dark' ? (
              <DarkModeIcon sx={{ mr: 1 }} color="primary" />
            ) : (
              <LightModeIcon sx={{ mr: 1 }} color="primary" />
            )}
            <Typography variant="h6">外観設定</Typography>
          </Box>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleTheme}
                />
              }
              label={mode === 'dark' ? 'ダークモード' : 'ライトモード'}
            />
            <Typography variant="body2" color="text.secondary">
              ダークモードはアプリ全体の配色を暗くし、夜間の使用時に目の負担を軽減します。
            </Typography>
          </Stack>
        </Paper >

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <NotificationsIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6">Slack通知設定</Typography>
          </Box>

          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              設定を保存しました
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Slack Webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              fullWidth
              placeholder="https://hooks.slack.com/services/..."
              helperText="Slackの Incoming Webhook URLを入力してください"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={schedulerEnabled}
                  onChange={(e) => setSchedulerEnabled(e.target.checked)}
                />
              }
              label="自動通知を有効にする"
            />

            <FormControl fullWidth>
              <InputLabel>デフォルトリマインダー時間</InputLabel>
              <Select
                value={defaultReminderMinutes}
                label="デフォルトリマインダー時間"
                onChange={(e) => setDefaultReminderMinutes(Number(e.target.value))}
              >
                <MenuItem value={15}>15分前</MenuItem>
                <MenuItem value={30}>30分前</MenuItem>
                <MenuItem value={60}>1時間前</MenuItem>
                <MenuItem value={120}>2時間前</MenuItem>
                <MenuItem value={1440}>1日前</MenuItem>
                <MenuItem value={2880}>2日前</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                保存
              </Button>
              <Button variant="outlined" onClick={handleTestNotification}>
                通知をテスト
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DownloadIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6">データエクスポート</Typography>
          </Box>

          {exportSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {exportSuccess}
            </Alert>
          )}

          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>エクスポート形式</InputLabel>
              <Select
                value={exportFormat}
                label="エクスポート形式"
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV (Excel対応)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>データタイプ</InputLabel>
              <Select
                value={exportType}
                label="データタイプ"
                onChange={(e) => setExportType(e.target.value)}
              >
                <MenuItem value="all">すべてのデータ</MenuItem>
                <MenuItem value="companies">企業一覧</MenuItem>
                <MenuItem value="events">イベント一覧</MenuItem>
                <MenuItem value="es">ES一覧</MenuItem>
                <MenuItem value="selfAnalyses">自己分析</MenuItem>
                <MenuItem value="interviewNotes">面接ノート</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'エクスポート中...' : 'エクスポート'}
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            アプリケーション情報
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            バージョン: 1.0.0
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ビルド日: {new Date().toLocaleDateString('ja-JP')}
          </Typography>

          <Stack spacing={2}>
            {updateMessage && (
              <Alert severity={updateAvailable ? 'info' : 'success'}>
                {updateMessage}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={handleCheckForUpdates}
                disabled={updateChecking}
              >
                {updateChecking ? <CircularProgress size={20} /> : 'アップデートを確認'}
              </Button>

              {updateAvailable && (
                <>
                  <Button
                    variant="contained"
                    onClick={handleDownloadUpdate}
                    disabled={updateDownloading}
                  >
                    {updateDownloading ? <CircularProgress size={20} /> : 'ダウンロード'}
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleInstallUpdate}
                  >
                    再起動してインストール
                  </Button>
                </>
              )}
            </Box>
          </Stack>
        </Paper>
      </Stack >
    </Box >
  );
};

export default SettingsPage;
