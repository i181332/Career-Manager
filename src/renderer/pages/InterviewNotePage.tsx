import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { Add, Edit, Delete, Search, Business, CalendarMonth } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useInterviewNoteStore } from '../stores/interviewNoteStore';
import { useCompanyStore } from '../stores/companyStore';
import InterviewNoteFormDialog from '../components/InterviewNoteFormDialog';

interface QA {
  question: string;
  answer: string;
}

const InterviewNotePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { interviewNotes, setInterviewNotes, removeInterviewNote, setLoading, loading } =
    useInterviewNoteStore();
  const { companies, setCompanies } = useCompanyStore();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingNote, setViewingNote] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [notesResult, companiesResult] = await Promise.all([
        window.api.getInterviewNotes(user.id),
        window.api.getCompanies(user.id),
      ]);

      if (notesResult.success && notesResult.interviewNotes) {
        setInterviewNotes(notesResult.interviewNotes);
      }

      if (companiesResult.success && companiesResult.companies) {
        setCompanies(companiesResult.companies);
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedNote(null);
    setOpenDialog(true);
  };

  const handleEdit = (note: any) => {
    setSelectedNote(note);
    setOpenDialog(true);
  };

  const handleView = (note: any) => {
    setViewingNote(note);
    setViewDialog(true);
  };

  const handleSave = async (data: any) => {
    if (!user) return;

    try {
      if (selectedNote) {
        const result = await window.api.updateInterviewNote(selectedNote.id, data);
        if (result.success) {
          await loadData();
        }
      } else {
        const result = await window.api.createInterviewNote({
          ...data,
          user_id: user.id,
        });
        if (result.success) {
          await loadData();
        }
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('保存に失敗しました:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この面接ノートを削除しますか？')) return;

    try {
      const result = await window.api.deleteInterviewNote(id);
      if (result.success) {
        removeInterviewNote(id);
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
    }
  };

  const getCompanyName = (companyId: number): string => {
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : '不明な企業';
  };

  const getQAList = (qaListJson: string): QA[] => {
    try {
      return JSON.parse(qaListJson || '[]');
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotes = interviewNotes.filter((note) => {
    const companyName = getCompanyName(note.company_id);
    const qaList = getQAList(note.qa_list);
    const searchContent = [
      companyName,
      ...qaList.map((qa) => qa.question + qa.answer),
      note.next_action || '',
    ].join(' ');
    return searchContent.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 日付順にソート（新しい順）
  const sortedNotes = [...filteredNotes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          面接ノート
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          新規作成
        </Button>
      </Box>

      <TextField
        placeholder="企業名や質問内容で検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3}>
        {sortedNotes.map((note) => {
          const qaList = getQAList(note.qa_list);
          return (
            <Grid item xs={12} md={6} lg={4} key={note.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Business sx={{ mr: 1 }} color="primary" />
                    <Typography variant="h6">{getCompanyName(note.company_id)}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarMonth fontSize="small" sx={{ mr: 0.5 }} color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(note.date)}
                    </Typography>
                  </Box>

                  {note.score !== null && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        手応え:
                      </Typography>
                      <Rating value={note.score} readOnly size="small" />
                    </Box>
                  )}

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    質問数: {qaList.length}件
                  </Typography>

                  {qaList.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        最初の質問:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {qaList[0].question}
                      </Typography>
                    </Box>
                  )}

                  {note.next_action && (
                    <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        次のアクション:
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {note.next_action}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleView(note)}>
                    詳細
                  </Button>
                  <Button size="small" startIcon={<Edit />} onClick={() => handleEdit(note)}>
                    編集
                  </Button>
                  <IconButton size="small" color="error" onClick={() => handleDelete(note.id)}>
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {sortedNotes.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            面接ノートが見つかりませんでした
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleCreate} sx={{ mt: 2 }}>
            最初の面接ノートを作成
          </Button>
        </Box>
      )}

      <InterviewNoteFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSave}
        initialData={selectedNote}
        companies={companies}
      />

      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth disableEnforceFocus>
        {viewingNote && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business color="primary" />
                {getCompanyName(viewingNote.company_id)}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarMonth fontSize="small" sx={{ mr: 0.5 }} color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(viewingNote.date)}
                  </Typography>
                </Box>
                {viewingNote.score !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      手応え:
                    </Typography>
                    <Rating value={viewingNote.score} readOnly />
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                質問と回答
              </Typography>

              {getQAList(viewingNote.qa_list).map((qa, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Q{index + 1}: {qa.question}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {qa.answer}
                  </Typography>
                </Box>
              ))}

              {viewingNote.next_action && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    次のアクション
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {viewingNote.next_action}
                  </Typography>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialog(false)}>閉じる</Button>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => {
                  setViewDialog(false);
                  handleEdit(viewingNote);
                }}
              >
                編集
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default InterviewNotePage;
