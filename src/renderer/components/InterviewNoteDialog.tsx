import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  IconButton,
  MenuItem,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface QA {
  question: string;
  answer: string;
}

interface InterviewNote {
  id?: number;
  company_id: number;
  interview_date: string;
  round?: string;
  qa_list: QA[];
  score?: number;
  result?: string;
  next_action?: string;
}

interface InterviewNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: number;
  note?: InterviewNote;
}

const InterviewNoteDialog: React.FC<InterviewNoteDialogProps> = ({
  open,
  onClose,
  onSuccess,
  companyId,
  note,
}) => {
  const [formData, setFormData] = useState<{
    interview_date: Date;
    round: string;
    qa_list: QA[];
    score: string;
    result: string;
    next_action: string;
  }>({
    interview_date: new Date(),
    round: '',
    qa_list: [{ question: '', answer: '' }],
    score: '',
    result: '',
    next_action: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (note) {
      setFormData({
        interview_date: new Date(note.interview_date),
        round: note.round || '',
        qa_list: note.qa_list.length > 0 ? note.qa_list : [{ question: '', answer: '' }],
        score: note.score?.toString() || '',
        result: note.result || '',
        next_action: note.next_action || '',
      });
    } else {
      setFormData({
        interview_date: new Date(),
        round: '',
        qa_list: [{ question: '', answer: '' }],
        score: '',
        result: '',
        next_action: '',
      });
    }
    setError('');
  }, [note, open]);

  const handleAddQA = () => {
    setFormData({
      ...formData,
      qa_list: [...formData.qa_list, { question: '', answer: '' }],
    });
  };

  const handleRemoveQA = (index: number) => {
    const newQAList = formData.qa_list.filter((_, i) => i !== index);
    setFormData({ ...formData, qa_list: newQAList });
  };

  const handleQAChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newQAList = [...formData.qa_list];
    newQAList[index][field] = value;
    setFormData({ ...formData, qa_list: newQAList });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const noteData = {
        company_id: companyId,
        interview_date: formData.interview_date.toISOString().split('T')[0],
        round: formData.round,
        qa_list: JSON.stringify(formData.qa_list),
        score: formData.score ? parseInt(formData.score) : undefined,
        result: formData.result,
        next_action: formData.next_action,
      };

      if (note?.id) {
        // 更新
        const result = await window.api.updateInterviewNote(note.id, noteData);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error || '面接ノートの更新に失敗しました');
        }
      } else {
        // 新規作成
        const result = await window.api.createInterviewNote(noteData);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error || '面接ノートの作成に失敗しました');
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
        <DialogTitle>{note ? '面接ノートを編集' : '面接ノートを追加'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <DatePicker
              label="面接日"
              value={formData.interview_date}
              onChange={(value) =>
                setFormData({ ...formData, interview_date: value || new Date() })
              }
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />

            <TextField
              label="面接段階"
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: e.target.value })}
              fullWidth
              placeholder="例: 一次面接、最終面接"
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ fontWeight: 'bold' }}>質問と回答</Box>
                <Button startIcon={<Add />} onClick={handleAddQA} size="small">
                  質問を追加
                </Button>
              </Box>

              {formData.qa_list.map((qa, index) => (
                <Box
                  key={index}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ fontWeight: 'medium' }}>質問 {index + 1}</Box>
                    {formData.qa_list.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveQA(index)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <TextField
                    label="質問内容"
                    value={qa.question}
                    onChange={(e) => handleQAChange(index, 'question', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="回答内容"
                    value={qa.answer}
                    onChange={(e) => handleQAChange(index, 'answer', e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Box>
              ))}
            </Box>

            <TextField
              label="評価スコア（5段階）"
              type="number"
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
              fullWidth
              InputProps={{ inputProps: { min: 1, max: 5 } }}
              helperText="1（低い）〜 5（高い）"
            />

            <TextField
              label="結果"
              value={formData.result}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="">未定</MenuItem>
              <MenuItem value="合格">合格</MenuItem>
              <MenuItem value="不合格">不合格</MenuItem>
              <MenuItem value="待機中">待機中</MenuItem>
            </TextField>

            <TextField
              label="次のアクション"
              value={formData.next_action}
              onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="次回の面接に向けた準備、お礼メール送信など"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '保存中...' : note ? '更新' : '作成'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InterviewNoteDialog;
