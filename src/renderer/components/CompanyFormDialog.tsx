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
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore, Company } from '../stores/companyStore';

interface CompanyFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company?: Company;
}

const CompanyFormDialog: React.FC<CompanyFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  company,
}) => {
  const user = useAuthStore((state) => state.user);
  const { addCompany, updateCompany } = useCompanyStore();

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '',
    url: '',
    status: 'interested',
    memo: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        industry: company.industry || '',
        size: company.size || '',
        url: company.url || '',
        status: company.status,
        memo: company.memo || '',
      });
    } else {
      setFormData({
        name: '',
        industry: '',
        size: '',
        url: '',
        status: 'interested',
        memo: '',
      });
    }
    setError('');
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      if (company) {
        // 更新
        const result = await window.api.updateCompany(company.id, formData);
        if (result.success && result.company) {
          updateCompany(result.company);
          onSuccess();
          onClose();
        } else {
          setError(result.error || '企業の更新に失敗しました');
        }
      } else {
        // 新規作成
        const result = await window.api.createCompany({
          ...formData,
          user_id: user.id,
        });
        if (result.success && result.company) {
          addCompany(result.company);
          onSuccess();
          onClose();
        } else {
          setError(result.error || '企業の作成に失敗しました');
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{company ? '企業を編集' : '企業を追加'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="企業名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              autoFocus
            />

            <TextField
              label="業界"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              fullWidth
            />

            <TextField
              label="企業規模"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              fullWidth
              placeholder="例: 従業員数1000名"
            />

            <TextField
              label="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              fullWidth
              type="url"
              placeholder="https://example.com"
            />

            <TextField
              label="ステータス"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              select
              required
              fullWidth
            >
              <MenuItem value="interested">興味あり</MenuItem>
              <MenuItem value="applied">応募済み</MenuItem>
              <MenuItem value="interview">面接中</MenuItem>
              <MenuItem value="offered">内定</MenuItem>
              <MenuItem value="rejected">不合格</MenuItem>
            </TextField>

            <TextField
              label="メモ"
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="企業に関するメモを入力..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '保存中...' : company ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CompanyFormDialog;
