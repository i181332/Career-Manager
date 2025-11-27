import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, Edit, Delete, OpenInNew, CalendarToday, Assignment, School, Add } from '@mui/icons-material';
import { useCompanyStore, Company } from '../stores/companyStore';
import CompanyFormDialog from '../components/CompanyFormDialog';
import EventFormDialog from '../components/EventFormDialog';
import InterviewNoteDialog from '../components/InterviewNoteDialog';
import { Event as EventType } from '../stores/eventStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CompanyMailList } from '../components/Company/CompanyMailList';

const statusColors: Record<string, string> = {
  interested: '#2196f3',
  applied: '#ff9800',
  interview: '#9c27b0',
  offered: '#4caf50',
  rejected: '#f44336',
};

const statusLabels: Record<string, string> = {
  interested: '興味あり',
  applied: '応募済み',
  interview: '面接中',
  offered: '内定',
  rejected: '不合格',
};

interface Event {
  id: number;
  title: string;
  start_at: string;
  type: string;
  location?: string;
}

interface ESEntry {
  id: number;
  title: string;
  status: string;
  deadline?: string;
  created_at: string;
}

interface InterviewNote {
  id: number;
  interview_date: string;
  round?: string;
  result?: string;
  created_at: string;
}

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompany, setSelectedCompany, removeCompany } = useCompanyStore();

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | undefined>(undefined);
  const [interviewNoteDialogOpen, setInterviewNoteDialogOpen] = useState(false);
  const [selectedInterviewNote, setSelectedInterviewNote] = useState<InterviewNote | undefined>(undefined);

  // タブごとのデータ
  const [events, setEvents] = useState<Event[]>([]);
  const [esEntries, setESEntries] = useState<ESEntry[]>([]);
  const [interviewNotes, setInterviewNotes] = useState<InterviewNote[]>([]);
  const [loadingTabData, setLoadingTabData] = useState(false);

  useEffect(() => {
    if (id) {
      loadCompany(parseInt(id));
    }
  }, [id]);

  const loadCompany = async (companyId: number) => {
    setLoading(true);
    try {
      const result = await window.api.getCompany(companyId);
      if (result.success && result.company) {
        setSelectedCompany(result.company);
        loadTabData(companyId, tabValue);
      } else {
        alert('企業が見つかりません');
        navigate('/companies');
      }
    } catch (error) {
      console.error('Failed to load company:', error);
      alert('企業の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (companyId: number, tab: number) => {
    setLoadingTabData(true);
    try {
      // 並列で全てのデータを取得（概要タブでも表示するため）
      const [eventsResult, esResult, notesResult] = await Promise.all([
        window.api.getEventsByCompany(companyId),
        window.api.getESByCompany(companyId),
        window.api.getInterviewNotesByCompany(companyId),
      ]);

      if (eventsResult.success && eventsResult.events) {
        setEvents(eventsResult.events);
      }
      if (esResult.success && esResult.entries) {
        setESEntries(esResult.entries);
      }
      if (notesResult.success && notesResult.notes) {
        setInterviewNotes(notesResult.notes);
      }
    } catch (error) {
      console.error('Failed to load tab data:', error);
    } finally {
      setLoadingTabData(false);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      loadTabData(selectedCompany.id, tabValue);
    }
  }, [tabValue]);

  const handleDelete = async () => {
    if (!selectedCompany) return;

    if (confirm(`「${selectedCompany.name}」を削除してもよろしいですか？`)) {
      try {
        const result = await window.api.deleteCompany(selectedCompany.id);
        if (result.success) {
          removeCompany(selectedCompany.id);
          navigate('/companies');
        } else {
          alert(result.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (confirm('このイベントを削除してもよろしいですか？')) {
      try {
        const result = await window.api.deleteEvent(eventId);
        if (result.success) {
          // イベント一覧を再読み込み
          if (selectedCompany) {
            loadTabData(selectedCompany.id, tabValue);
          }
        } else {
          alert(result.error || 'イベントの削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete event failed:', error);
        alert('イベントの削除に失敗しました');
      }
    }
  };

  const handleAddEvent = () => {
    setSelectedEvent(undefined);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event as any);
    setEventDialogOpen(true);
  };

  const handleAddInterviewNote = () => {
    setSelectedInterviewNote(undefined);
    setInterviewNoteDialogOpen(true);
  };

  const handleEditInterviewNote = (note: InterviewNote) => {
    setSelectedInterviewNote(note);
    setInterviewNoteDialogOpen(true);
  };

  const handleDeleteInterviewNote = async (noteId: number) => {
    if (confirm('この面接ノートを削除してもよろしいですか？')) {
      try {
        const result = await window.api.deleteInterviewNote(noteId);
        if (result.success) {
          if (selectedCompany) {
            loadTabData(selectedCompany.id, tabValue);
          }
        } else {
          alert(result.error || '面接ノートの削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete interview note failed:', error);
        alert('面接ノートの削除に失敗しました');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedCompany) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>企業が見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/companies')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {selectedCompany.name}
          </Typography>
          <Chip
            label={statusLabels[selectedCompany.status] || selectedCompany.status}
            size="small"
            sx={{
              backgroundColor: statusColors[selectedCompany.status] || '#757575',
              color: 'white',
              mt: 1,
            }}
          />
        </Box>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
          sx={{ mr: 1 }}
        >
          編集
        </Button>
        <Button variant="outlined" color="error" startIcon={<Delete />} onClick={handleDelete}>
          削除
        </Button>
      </Box>

      {/* 企業情報 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              業界
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCompany.industry || '未設定'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              企業規模
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {selectedCompany.size || '未設定'}
            </Typography>
          </Grid>
          {selectedCompany.url && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                URL
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 1 }}>
                  {selectedCompany.url}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => window.open(selectedCompany.url, '_blank')}
                >
                  <OpenInNew fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          )}
          {selectedCompany.memo && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                メモ
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedCompany.memo}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* タブ */}
      <Paper>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="概要" />
          <Tab label="イベント" />
          <Tab label="ES" />
          <Tab label="面接ノート" />
          <Tab label="メール" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          {/* 概要タブ */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">イベント</Typography>
                    </Box>
                    <Typography variant="h3" color="primary">
                      {events.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      件
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Assignment sx={{ mr: 1, color: 'secondary.main' }} />
                      <Typography variant="h6">ES</Typography>
                    </Box>
                    <Typography variant="h3" color="secondary">
                      {esEntries.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      件
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <School sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h6">面接ノート</Typography>
                    </Box>
                    <Typography variant="h3" color="success.main">
                      {interviewNotes.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      件
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  最近の活動
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  直近のイベント、ESの状況、面接の記録がここに表示されます
                </Typography>
              </Grid>
            </Grid>
          )}

          {/* イベントタブ */}
          {tabValue === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">イベント一覧</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddEvent}
                >
                  イベント追加
                </Button>
              </Box>
              {loadingTabData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : events.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    イベントはまだ登録されていません
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddEvent}
                    sx={{ mt: 2 }}
                  >
                    最初のイベントを追加
                  </Button>
                </Box>
              ) : (
                <List>
                  {events.map((event) => (
                    <ListItem
                      key={event.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditEvent(event)}
                            sx={{ mr: 1 }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteEvent(event.id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              {new Date(event.start_at).toLocaleString('ja-JP')}
                            </Typography>
                            {event.type && (
                              <Chip
                                label={event.type}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                            {event.location && (
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ ml: 1 }}
                              >
                                @ {event.location}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}

          {/* ESタブ */}
          {tabValue === 2 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">ES一覧</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(`/es/new?companyId=${selectedCompany?.id}`)}
                >
                  ES追加
                </Button>
              </Box>
              {loadingTabData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : esEntries.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ESエントリーはまだ登録されていません
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => navigate(`/es/new?companyId=${selectedCompany?.id}`)}
                    sx={{ mt: 2 }}
                  >
                    最初のESを追加
                  </Button>
                </Box>
              ) : (
                <List>
                  {esEntries.map((entry) => (
                    <ListItem
                      key={entry.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/es/${entry.id}`)}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('このESを削除してもよろしいですか？')) {
                              window.api.deleteESEntry(entry.id).then((result) => {
                                if (result.success && selectedCompany) {
                                  loadTabData(selectedCompany.id, 2);
                                }
                              });
                            }
                          }}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={entry.title}
                        secondary={
                          <>
                            <Chip
                              label={entry.status}
                              size="small"
                              color={
                                entry.status === 'submitted' ? 'success' : 'default'
                              }
                            />
                            {entry.deadline && (
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ ml: 1 }}
                              >
                                締切: {new Date(entry.deadline).toLocaleDateString('ja-JP')}
                              </Typography>
                            )}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              最終更新: {new Date(entry.created_at).toLocaleDateString('ja-JP')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}

          {/* 面接ノートタブ */}
          {tabValue === 3 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">面接ノート一覧</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddInterviewNote}
                >
                  面接ノート追加
                </Button>
              </Box>
              {loadingTabData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : interviewNotes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    面接ノートはまだ登録されていません
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddInterviewNote}
                    sx={{ mt: 2 }}
                  >
                    最初の面接ノートを追加
                  </Button>
                </Box>
              ) : (
                <List>
                  {interviewNotes.map((note) => (
                    <ListItem
                      key={note.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => handleEditInterviewNote(note)}
                            sx={{ mr: 1 }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteInterviewNote(note.id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={`${note.round || '面接'} - ${new Date(note.interview_date).toLocaleDateString('ja-JP')}`}
                        secondary={
                          <>
                            {note.result && (
                              <Chip
                                label={note.result}
                                size="small"
                                color={
                                  note.result === '合格' ? 'success' :
                                    note.result === '不合格' ? 'error' : 'default'
                                }
                              />
                            )}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              作成日: {new Date(note.created_at).toLocaleDateString('ja-JP')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}

          {/* メールタブ */}
          {tabValue === 4 && (
            <CompanyMailList
              companyId={selectedCompany.id}
              onCreateEvent={(eventData) => {
                setSelectedEvent({
                  ...eventData,
                  company_id: selectedCompany.id,
                });
                setEventDialogOpen(true);
              }}
              onCreateES={(esData) => {
                // ES作成ページへ遷移（データを受け渡す方法は要検討だが、今回はstateで渡す）
                navigate(`/es/new?companyId=${selectedCompany.id}`, { state: { initialData: esData } });
              }}
            />
          )}
        </Box>
      </Paper>

      {/* 編集ダイアログ */}
      <CompanyFormDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSuccess={() => {
          if (id) loadCompany(parseInt(id));
        }}
        company={selectedCompany}
      />

      {/* イベントダイアログ */}
      <EventFormDialog
        open={eventDialogOpen}
        onClose={() => {
          setEventDialogOpen(false);
          setSelectedEvent(undefined);
        }}
        onSuccess={() => {
          if (selectedCompany) {
            loadTabData(selectedCompany.id, tabValue);
          }
        }}
        event={selectedEvent}
        defaultCompanyId={selectedCompany?.id}
      />

      {/* 面接ノートダイアログ */}
      {selectedCompany && (
        <InterviewNoteDialog
          open={interviewNoteDialogOpen}
          onClose={() => {
            setInterviewNoteDialogOpen(false);
            setSelectedInterviewNote(undefined);
          }}
          onSuccess={() => {
            if (selectedCompany) {
              loadTabData(selectedCompany.id, tabValue);
            }
          }}
          companyId={selectedCompany.id}
          note={selectedInterviewNote}
        />
      )}

    </Box>
  );
};

export default CompanyDetailPage;
