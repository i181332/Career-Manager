import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, CalendarMonth, List as ListIcon, Delete, Edit, FileDownload } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useEventStore } from '../stores/eventStore';
import { useCompanyStore } from '../stores/companyStore';
import EventFormDialog from '../components/EventFormDialog';
import CalendarView from '../components/CalendarView';

const eventTypeLabels: Record<string, string> = {
  briefing: '説明会',
  es_deadline: 'ES締切',
  interview: '面接',
  test: '筆記試験',
  other: 'その他',
};

const eventTypeColors: Record<string, string> = {
  briefing: '#2196f3',
  es_deadline: '#f44336',
  interview: '#9c27b0',
  test: '#ff9800',
  other: '#757575',
};

const EventsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { events, setEvents, removeEvent, setLoading, loading } = useEventStore();
  const { companies, setCompanies } = useCompanyStore();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadEvents();
    loadCompanies();
  }, []);

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await window.api.getEvents(user.id);
      if (result.success && result.events) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!user) return;

    try {
      const result = await window.api.getCompanies(user.id);
      if (result.success && result.companies) {
        setCompanies(result.companies);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleEdit = (event: any) => {
    setSelectedEvent(event);
    setOpenDialog(true);
  };

  const handleDelete = async (eventId: number) => {
    if (confirm('このイベントを削除してもよろしいですか？')) {
      try {
        const result = await window.api.deleteEvent(eventId);
        if (result.success) {
          removeEvent(eventId);
        } else {
          alert(result.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return '企業未設定';
    const company = companies.find((c) => c.id === companyId);
    return company?.name || '不明な企業';
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const handleExportCalendar = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const result = await window.api.exportCalendarToICal(user.id);

      if (result.success) {
        alert(`カレンダーをエクスポートしました:\n${result.filePath}`);
      } else {
        alert(result.error || 'エクスポートに失敗しました');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          イベント
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)}>
            <Tab icon={<ListIcon />} value="list" label="リスト" />
            <Tab icon={<CalendarMonth />} value="calendar" label="カレンダー" />
          </Tabs>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportCalendar}
            disabled={exporting || events.length === 0}
          >
            {exporting ? 'エクスポート中...' : 'iCalエクスポート'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedEvent(null);
              setOpenDialog(true);
            }}
          >
            イベントを追加
          </Button>
        </Box>
      </Box>

      {/* コンテンツ */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'list' ? (
        // リスト表示
        sortedEvents.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CalendarMonth sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              イベントが登録されていません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              「イベントを追加」ボタンからイベントを登録しましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setSelectedEvent(null);
                setOpenDialog(true);
              }}
            >
              イベントを追加
            </Button>
          </Box>
        ) : (
          <Paper>
            <List>
              {sortedEvents.map((event, index) => (
                <React.Fragment key={event.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton edge="end" onClick={() => handleEdit(event)}>
                          <Edit />
                        </IconButton>
                        <IconButton edge="end" onClick={() => handleDelete(event.id)}>
                          <Delete />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemButton>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h6">{event.title}</Typography>
                            <Chip
                              label={eventTypeLabels[event.type || 'other']}
                              size="small"
                              sx={{
                                backgroundColor: eventTypeColors[event.type || 'other'],
                                color: 'white',
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(event.start_at).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {event.end_at &&
                                ` - ${new Date(event.end_at).toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getCompanyName(event.company_id)}
                            </Typography>
                            {event.location && (
                              <Typography variant="body2" color="text.secondary">
                                場所: {event.location}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < sortedEvents.length - 1 && <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )
      ) : (
        // カレンダー表示
        <CalendarView events={events} onEventClick={handleEdit} onDateSelect={() => setOpenDialog(true)} />
      )}

      {/* イベント作成・編集ダイアログ */}
      <EventFormDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedEvent(null);
        }}
        onSuccess={loadEvents}
        event={selectedEvent}
      />
    </Box>
  );
};

export default EventsPage;
