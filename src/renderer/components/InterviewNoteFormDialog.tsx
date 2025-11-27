import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Autocomplete,
  Rating,
  Divider,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

interface QA {
  question: string;
  answer: string;
}

interface InterviewNoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  companies: Array<{ id: number; name: string }>;
}

const InterviewNoteFormDialog: React.FC<InterviewNoteFormDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  companies,
}) => {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [qaList, setQaList] = useState<QA[]>([{ question: '', answer: '' }]);
  const [score, setScore] = useState<number | null>(3);
  const [nextAction, setNextAction] = useState('');

  useEffect(() => {
    if (initialData) {
      setCompanyId(initialData.company_id);
      setDate(new Date(initialData.date));
      setQaList(initialData.qa_list ? JSON.parse(initialData.qa_list) : [{ question: '', answer: '' }]);
      setScore(initialData.score);
      setNextAction(initialData.next_action || '');
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setCompanyId(null);
    setDate(new Date());
    setQaList([{ question: '', answer: '' }]);
    setScore(3);
    setNextAction('');
  };

  const handleAddQA = () => {
    setQaList([...qaList, { question: '', answer: '' }]);
  };

  const handleRemoveQA = (index: number) => {
    if (qaList.length > 1) {
      setQaList(qaList.filter((_, i) => i !== index));
    }
  };

  const handleQAChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newQaList = [...qaList];
    newQaList[index][field] = value;
    setQaList(newQaList);
  };

  const handleSave = () => {
    if (!companyId || !date) return;

    const data = {
      company_id: companyId,
      date: date.toISOString(),
      qa_list: JSON.stringify(qaList),
      score,
      next_action: nextAction,
    };
    onSave(data);
    resetForm();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? '面接ノートを編集' : '新規面接ノート'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Autocomplete
            options={companies}
            getOptionLabel={(option) => option.name}
            value={companies.find((c) => c.id === companyId) || null}
            onChange={(_, newValue) => {
              setCompanyId(newValue ? newValue.id : null);
            }}
            renderInput={(params) => (
              <TextField {...params} label="企業" required />
            )}
          />

          <DateTimePicker
            label="面接日時"
            value={date}
            onChange={(newValue) => setDate(newValue)}
            slotProps={{
              textField: { fullWidth: true },
            }}
          />

          <Divider sx={{ my: 1 }} />

          <Typography variant="h6">質問と回答</Typography>

          {qaList.map((qa, index) => (
            <Box key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Q{index + 1}</Typography>
                {qaList.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => handleRemoveQA(index)}>
                    <Delete />
                  </IconButton>
                )}
              </Box>
              <TextField
                label="質問"
                value={qa.question}
                onChange={(e) => handleQAChange(index, 'question', e.target.value)}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
              <TextField
                label="回答"
                value={qa.answer}
                onChange={(e) => handleQAChange(index, 'answer', e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          ))}

          <Button
            startIcon={<Add />}
            onClick={handleAddQA}
            variant="outlined"
            fullWidth
          >
            質問を追加
          </Button>

          <Divider sx={{ my: 1 }} />

          <Box>
            <Typography component="legend" gutterBottom>
              手応え・評価
            </Typography>
            <Rating
              value={score}
              onChange={(_, newValue) => setScore(newValue)}
              size="large"
            />
          </Box>

          <TextField
            label="次のアクション"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="例：お礼メール送信、追加資料準備など"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" disabled={!companyId || !date}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterviewNoteFormDialog;
