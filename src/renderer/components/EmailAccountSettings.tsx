import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Sync as SyncIcon,
    Google as GoogleIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';

interface EmailAccount {
    id: number;
    email_address: string;
    is_active: number;
    sync_enabled: number;
    last_sync_at?: string;
}

export const EmailAccountSettings: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const [authUrl, setAuthUrl] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [authenticating, setAuthenticating] = useState(false);

    useEffect(() => {
        if (user) {
            loadAccounts();
        }
    }, [user]);

    const loadAccounts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await window.api.getEmailAccounts(user.id);
            if (result.success && result.data) {
                setAccounts(result.data);
            }
        } catch (err) {
            console.error('Failed to load accounts:', err);
            setError('アカウントの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async () => {
        try {
            const result = await window.api.getGmailAuthUrl();
            if (result.success && result.url) {
                setAuthUrl(result.url);
                setAuthDialogOpen(true);
                // ブラウザで開く
                window.open(result.url, '_blank');
            } else {
                setError('認証URLの取得に失敗しました');
            }
        } catch (err) {
            setError('認証プロセスの開始に失敗しました');
        }
    };

    const handleAuthSubmit = async () => {
        if (!authCode.trim() || !user) return;

        setAuthenticating(true);
        try {
            const result = await window.api.authenticateGmail(authCode, user.id);
            if (result.success) {
                setAuthDialogOpen(false);
                setAuthCode('');
                loadAccounts();
                alert('Gmailアカウントを追加しました');
            } else {
                setError(result.error || '認証に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '認証中にエラーが発生しました');
        } finally {
            setAuthenticating(false);
        }
    };

    const handleSync = async (accountId: number) => {
        try {
            await window.api.syncEmails(accountId);
            loadAccounts(); // 最終同期日時を更新
            alert('同期を開始しました');
        } catch (err) {
            console.error('Sync failed:', err);
            alert('同期の開始に失敗しました');
        }
    };

    // 削除機能はAPIにないため、今回は実装しないか、必要なら追加する
    // 現状のpreload.tsには deleteEmailAccount がないため、無効化のみ対応するか、APIを追加する必要がある
    // ここでは一旦表示のみとする

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">連携済みアカウント</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddAccount}
                >
                    アカウント追加
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                </Box>
            ) : accounts.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    連携されているアカウントはありません
                </Typography>
            ) : (
                <List>
                    {accounts.map((account) => (
                        <ListItem
                            key={account.id}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                mb: 1,
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <GoogleIcon color="primary" fontSize="small" />
                                        {account.email_address}
                                        {account.sync_enabled === 1 ? (
                                            <Chip
                                                icon={<CheckCircleIcon />}
                                                label="同期有効"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Chip
                                                icon={<ErrorIcon />}
                                                label="同期無効"
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={
                                    account.last_sync_at
                                        ? `最終同期: ${new Date(account.last_sync_at).toLocaleString('ja-JP')}`
                                        : '未同期'
                                }
                            />
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    onClick={() => handleSync(account.id)}
                                    title="今すぐ同期"
                                >
                                    <SyncIcon />
                                </IconButton>
                                {/* 削除ボタンはAPI実装待ち */}
                                {/* <IconButton edge="end" color="error">
                  <DeleteIcon />
                </IconButton> */}
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            )}

            {/* 認証コード入力ダイアログ */}
            <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)}>
                <DialogTitle>Gmail認証</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        ブラウザでGoogleの認証ページが開きます。
                        認証を許可し、表示されたコードを以下に入力してください。
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="認証コード"
                        fullWidth
                        variant="outlined"
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAuthDialogOpen(false)}>キャンセル</Button>
                    <Button
                        onClick={handleAuthSubmit}
                        variant="contained"
                        disabled={!authCode || authenticating}
                    >
                        {authenticating ? '認証中...' : '認証する'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
