import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { useCompanyStore } from '../stores/companyStore';
import { useAuthStore } from '../stores/authStore';

interface ESEntry {
  id?: number;
  user_id?: number;
  company_id: number;
  title: string;
  deadline?: string;
  status: string;
  questions?: string;
  answers?: string;
  memo?: string;
}

interface ESFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  esEntry?: ESEntry | null;
}

const ESFormDialog: React.FC<ESFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  esEntry,
}) => {
  const user = useAuthStore((state) => state.user);
  const { companies } = useCompanyStore();

  const [formData, setFormData] = useState<ESEntry>({
    company_id: 0,
    title: '',
    deadline: '',
    status: 'draft',
    questions: '',
    answers: '',
    memo: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const countChars = (text: string) => {
    // 改行や空白を除いた文字数をカウント
    return text.replace(/\s/g, '').length;
  };

  useEffect(() => {
    if (esEntry) {
      const entry = {
        ...esEntry,
        deadline: esEntry.deadline ? esEntry.deadline.split('T')[0] : '',
      };
      setFormData(entry);
      setCharCount(countChars(entry.answers || ''));
    } else {
      setFormData({
        company_id: companies.length > 0 ? companies[0].id : 0,
        title: '',
        deadline: '',
        status: 'draft',
        questions: '',
        answers: '',
        memo: '',
      });
      setCharCount(0);
    }
    setError('');
  }, [esEntry, open, companies]);

  const handleAnswerChange = (value: string) => {
    setFormData((prev) => ({ ...prev, answers: value }));
    setCharCount(countChars(value));
    setError('');
  };

  const handleChange = (field: keyof ESEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!formData.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    if (!formData.company_id) {
      setError('企業を選択してください');
      return;
    }

    if (!user) {
      setError('ユーザー情報が取得できません');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        user_id: user.id,
        deadline: formData.deadline || undefined,
      };

      const result = esEntry
        ? await window.api.updateESEntry(esEntry.id!, submitData)
        : await window.api.createESEntry(submitData);

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || '保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to save ES entry:', err);
      setError('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEnforceFocus>
      <DialogTitle>{esEntry ? 'ES編集' : '新規ES作成'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth required>
            <InputLabel>企業</InputLabel>
            <Select
              value={formData.company_id}
              label="企業"
              onChange={(e) => handleChange('company_id', e.target.value)}
              disabled={loading}
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="タイトル"
            required
            fullWidth
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            disabled={loading}
            placeholder="例: 2025年度新卒採用エントリーシート"
          />

          <TextField
            label="締切日"
            type="date"
            fullWidth
            value={formData.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            disabled={loading}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={formData.status}
              label="ステータス"
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={loading}
            >
              <MenuItem value="draft">下書き</MenuItem>
              <MenuItem value="in_progress">作成中</MenuItem>
              <MenuItem value="review">レビュー待ち</MenuItem>
              <MenuItem value="submitted">提出済み</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="設問"
            multiline
            rows={4}
            fullWidth
            value={formData.questions}
            onChange={(e) => handleChange('questions', e.target.value)}
            disabled={loading}
            placeholder="設問を入力してください"
          />

          <Box>
            <TextField
              label="回答"
              multiline
              rows={6}
              fullWidth
              value={formData.answers}
              onChange={(e) => handleAnswerChange(e.target.value)}
              disabled={loading}
              placeholder="回答を入力してください"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                文字数: {charCount}文字
              </Typography>
            </Box>
          </Box>

          <TextField
            label="メモ"
            multiline
            rows={3}
            fullWidth
            value={formData.memo}
            onChange={(e) => handleChange('memo', e.target.value)}
            disabled={loading}
            placeholder="メモや参考情報"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {esEntry ? '更新' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ESFormDialog;
