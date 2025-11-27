import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useCompanyStore } from '../stores/companyStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface EmailDetailDialogProps {
  open: boolean;
  onClose: () => void;
  message: any;
  onUpdate?: () => void;
}

const EmailDetailDialog: React.FC<EmailDetailDialogProps> = ({
  open,
  onClose,
  message,
  onUpdate,
}) => {
  const companies = useCompanyStore((state) => state.companies);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    message.company_id || null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCompanyId(message.company_id || null);
  }, [message]);

  const handleAllocate = async () => {
    if (!selectedCompanyId) return;

    setSaving(true);
    setError(null);
    try {
      const result = await window.api.allocateEmail(
        message.id,
        selectedCompanyId
      );
      if (result.success) {
        // 既読にする
        await window.api.markEmailAsRead(message.id);
        if (onUpdate) onUpdate();
        onClose();
      } else {
        setError(result.error || '割り振りに失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnallocate = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await window.api.unallocateEmail(message.id);
      if (result.success) {
        if (onUpdate) onUpdate();
        onClose();
      } else {
        setError(result.error || '割り振り解除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await window.api.markEmailAsRead(message.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm', { locale: ja });
    } catch {
      return dateStr;
    }
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return null;
    const company = companies.find((c) => c.id === companyId);
    return company?.name;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="span">
            メール詳細
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 件名 */}
        <Typography variant="h6" gutterBottom>
          {message.subject || '(件名なし)'}
        </Typography>

        {/* メタ情報 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              From:
            </Typography>
            <Typography variant="body2">
              {message.from_name
                ? `${message.from_name} <${message.from_address}>`
                : message.from_address}
            </Typography>
          </Box>

          {message.to_address && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mr: 1 }}
              >
                To:
              </Typography>
              <Typography variant="body2">{message.to_address}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ScheduleIcon
              sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }}
            />
            <Typography variant="body2" color="text.secondary">
              {formatDate(message.received_at)}
            </Typography>
          </Box>

          {message.has_attachments === 1 && (
            <Chip
              icon={<AttachFileIcon />}
              label="添付ファイルあり"
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 企業割り振り */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>企業に割り振る</InputLabel>
            <Select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
              label="企業に割り振る"
            >
              <MenuItem value="">
                <em>未割り振り</em>
              </MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {message.company_id && (
            <Box sx={{ mt: 1 }}>
              <Chip
                icon={<BusinessIcon />}
                label={`現在: ${getCompanyName(message.company_id)}`}
                color="primary"
                variant="outlined"
                size="small"
              />
              {message.allocation_method === 'auto' && (
                <Chip
                  label="自動割り振り"
                  size="small"
                  sx={{ ml: 1 }}
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* 本文 */}
        <Typography variant="subtitle2" gutterBottom>
          本文
        </Typography>
        <Box
          sx={{
            bgcolor: 'grey.50',
            p: 2,
            borderRadius: 1,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {message.body_html ? (
            <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
          ) : message.body_text ? (
            <Typography
              variant="body2"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
            >
              {message.body_text}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              本文がありません
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {message.company_id && (
          <Button onClick={handleUnallocate} disabled={saving} color="error">
            割り振り解除
          </Button>
        )}
        {!message.is_read && (
          <Button onClick={handleMarkAsRead} color="inherit">
            既読にする
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>閉じる</Button>
        {selectedCompanyId && selectedCompanyId !== message.company_id && (
          <Button
            onClick={handleAllocate}
            variant="contained"
            disabled={saving}
          >
            {saving ? '保存中...' : '割り振る'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EmailDetailDialog;
