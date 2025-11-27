import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Replay as ReplayIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';

interface Notification {
  id: number;
  user_id: number;
  event_id: number;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  channel: string;
  payload: string;
  created_at: string;
  updated_at: string;
}

const NotificationsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await window.api.getNotifications(user.id);

      if (result.success && result.notifications) {
        setNotifications(result.notifications);
        filterNotifications(result.notifications, currentTab);
      }
    } catch (error) {
      console.error('通知の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const filterNotifications = (allNotifications: Notification[], tabIndex: number) => {
    let filtered = allNotifications;

    switch (tabIndex) {
      case 0: // すべて
        filtered = allNotifications;
        break;
      case 1: // 保留中
        filtered = allNotifications.filter((n) => n.status === 'pending');
        break;
      case 2: // 送信済み
        filtered = allNotifications.filter((n) => n.status === 'sent');
        break;
      case 3: // 失敗
        filtered = allNotifications.filter((n) => n.status === 'failed');
        break;
    }

    setFilteredNotifications(filtered);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    filterNotifications(notifications, newValue);
  };

  const handleRetry = async (notificationId: number) => {
    try {
      const result = await window.api.retryNotification(notificationId);

      if (result.success) {
        alert('通知を再試行キューに追加しました');
        loadNotifications();
      } else {
        alert(result.error || '再試行に失敗しました');
      }
    } catch (error) {
      console.error('再試行に失敗しました:', error);
      alert('再試行に失敗しました');
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip icon={<ScheduleIcon />} label="保留中" color="default" size="small" />;
      case 'sent':
        return <Chip icon={<CheckCircleIcon />} label="送信済み" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="失敗" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const getEventTitle = (payload: string) => {
    try {
      const data = JSON.parse(payload);
      return data.event_title || '不明なイベント';
    } catch {
      return '不明なイベント';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">通知履歴</Typography>
        <Button startIcon={<RefreshIcon />} onClick={loadNotifications} disabled={loading}>
          更新
        </Button>
      </Box>

      <Paper>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`すべて (${notifications.length})`} />
          <Tab label={`保留中 (${notifications.filter((n) => n.status === 'pending').length})`} />
          <Tab label={`送信済み (${notifications.filter((n) => n.status === 'sent').length})`} />
          <Tab label={`失敗 (${notifications.filter((n) => n.status === 'failed').length})`} />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>イベント</TableCell>
                <TableCell>予定送信時刻</TableCell>
                <TableCell>送信時刻</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>チャンネル</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    通知がありません
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>{notification.id}</TableCell>
                    <TableCell>{getEventTitle(notification.payload)}</TableCell>
                    <TableCell>
                      {new Date(notification.scheduled_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {notification.sent_at
                        ? new Date(notification.sent_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusChip(notification.status)}</TableCell>
                    <TableCell>{notification.channel}</TableCell>
                    <TableCell align="center">
                      {notification.status === 'failed' && (
                        <Tooltip title="再試行">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleRetry(notification.id)}
                          >
                            <ReplayIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default NotificationsPage;
