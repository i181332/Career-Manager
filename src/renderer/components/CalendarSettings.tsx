import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Alert,
    CircularProgress,
    Stack,
    Chip
} from '@mui/material';
import {
    Sync as SyncIcon,
    Google as GoogleIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';

export const CalendarSettings: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [linkedAccount, setLinkedAccount] = useState<any | null>(null);

    useEffect(() => {
        if (user) {
            checkLinkStatus();
        }
    }, [user]);

    const checkLinkStatus = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // メールアカウント情報を取得してGoogle連携状態を確認
            const result = await window.api.getEmailAccounts(user.id);
            if (result.success && result.data) {
                // Gmailかつアクセストークンがあるアカウントを探す
                const gmailAccount = result.data.find((acc: any) => acc.provider === 'gmail');
                setLinkedAccount(gmailAccount || null);
            }
        } catch (err) {
            console.error('Failed to check link status:', err);
            setError('連携状態の確認に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!user) return;
        setSyncing(true);
        setError(null);
        try {
            const result = await window.api.syncCalendar(user.id);
            if (result.success) {
                alert('カレンダー同期が完了しました');
            } else {
                setError(result.error || '同期に失敗しました');
            }
        } catch (err: any) {
            console.error('Sync failed:', err);
            setError(err.message || '同期中にエラーが発生しました');
        } finally {
            setSyncing(false);
        }
    };

    const handleConnect = async () => {
        if (!user) return;
        try {
            // メール認証フローと同じものを使用（スコープは更新済み）
            const result = await window.api.startGmailAuth(user.id);
            if (result.success) {
                await checkLinkStatus();
                alert('Googleアカウントと連携しました。カレンダー同期が可能です。');
            } else {
                setError(result.error || '連携に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '連携プロセスの開始に失敗しました');
        }
    };

    if (loading) {
        return <CircularProgress size={24} />;
    }

    return (
        <Card variant="outlined">
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <CalendarIcon color="primary" />
                    <Typography variant="h6">Googleカレンダー同期</Typography>
                </Stack>

                <Typography variant="body2" color="text.secondary" paragraph>
                    アプリ内のイベントやES締切をGoogleカレンダーに同期します。
                    iPhone等のスマホカレンダーで予定を確認したい場合に便利です。
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mt: 2 }}>
                    {linkedAccount ? (
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Chip
                                icon={<CheckCircleIcon />}
                                label="連携済み"
                                color="success"
                                variant="outlined"
                            />
                            <Typography variant="body2">
                                {linkedAccount.email_address}
                            </Typography>
                        </Stack>
                    ) : (
                        <Alert severity="warning" icon={<ErrorIcon />}>
                            Googleアカウントと連携されていません
                        </Alert>
                    )}
                </Box>
            </CardContent>
            <CardActions sx={{ p: 2, pt: 0 }}>
                {linkedAccount ? (
                    <Button
                        variant="contained"
                        startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? '同期中...' : '今すぐ同期'}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        startIcon={<GoogleIcon />}
                        onClick={handleConnect}
                    >
                        連携する
                    </Button>
                )}
            </CardActions>
        </Card>
    );
};
