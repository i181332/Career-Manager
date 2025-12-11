import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuthStore } from '../stores/authStore';
import { useEventStore, Event } from '../stores/eventStore';
import { useCompanyStore } from '../stores/companyStore';

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event?: Event;
  defaultCompanyId?: number;
}

const EventFormDialog: React.FC<EventFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  event,
  defaultCompanyId,
}) => {
  const user = useAuthStore((state) => state.user);
  const { addEvent, updateEvent } = useEventStore();
  const companies = useCompanyStore((state) => state.companies);

  const getDefaultReminderMinutes = () => {
    const saved = localStorage.getItem('defaultReminderMinutes');
    return saved ? parseInt(saved) : 60;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_id: '',
    start_at: new Date(),
    end_at: new Date(Date.now() + 3600000), // 1時間後
    all_day: false,
    location: '',
    type: 'other',
    remind_before_minutes: getDefaultReminderMinutes(),
    slack_notify: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        company_id: event.company_id?.toString() || '',
        start_at: new Date(event.start_at),
        end_at: event.end_at ? new Date(event.end_at) : new Date(),
        all_day: event.all_day === 1,
        location: event.location || '',
        type: event.type || 'other',
        remind_before_minutes: event.remind_before_minutes,
        slack_notify: event.slack_notify === 1,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        company_id: defaultCompanyId?.toString() || '',
        start_at: new Date(),
        end_at: new Date(Date.now() + 3600000),
        all_day: false,
        location: '',
        type: 'other',
        remind_before_minutes: getDefaultReminderMinutes(),
        slack_notify: true,
      });
    }
    setError('');
  }, [event, open, defaultCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      const eventData = {
        ...formData,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
        start_at: formData.start_at.toISOString(),
        end_at: formData.end_at.toISOString(),
      };

      if (event) {
        // 更新
        const result = await window.api.updateEvent(event.id, eventData);
        if (result.success && result.event) {
          updateEvent(result.event);
          onSuccess();
          onClose();
        } else {
          setError(result.error || 'イベントの更新に失敗しました');
        }
      } else {
        // 新規作成
        const result = await window.api.createEvent({
          ...eventData,
          user_id: user.id,
        });
        if (result.success && result.event) {
          addEvent(result.event);
          onSuccess();
          onClose();
        } else {
          setError(result.error || 'イベントの作成に失敗しました');
        }
      }
    } catch (err) {
      console.error('Form submit error:', err);
      setError('処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{event ? 'イベントを編集' : 'イベントを追加'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="イベント名"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              fullWidth
              autoFocus
            />

            <TextField
              label="イベントタイプ"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              select
              required
              fullWidth
            >
              <MenuItem value="briefing">説明会</MenuItem>
              <MenuItem value="es_deadline">ES締切</MenuItem>
              <MenuItem value="interview">面接</MenuItem>
              <MenuItem value="test">筆記試験</MenuItem>
              <MenuItem value="other">その他</MenuItem>
            </TextField>

            <TextField
              label="企業"
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="">なし</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="開始日時"
                  value={formData.start_at}
                  onChange={(value) =>
                    setFormData({ ...formData, start_at: value || new Date() })
                  }
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="終了日時"
                  value={formData.end_at}
                  onChange={(value) =>
                    setFormData({ ...formData, end_at: value || new Date() })
                  }
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                />
              }
              label="終日"
            />

            <TextField
              label="場所"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
            />

            <TextField
              label="詳細"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />

            <TextField
              label="リマインダー（分前）"
              type="number"
              value={formData.remind_before_minutes}
              onChange={(e) =>
                setFormData({ ...formData, remind_before_minutes: parseInt(e.target.value) })
              }
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.slack_notify}
                  onChange={(e) =>
                    setFormData({ ...formData, slack_notify: e.target.checked })
                  }
                />
              }
              label="Slack通知を送信"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '保存中...' : event ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventFormDialog;
