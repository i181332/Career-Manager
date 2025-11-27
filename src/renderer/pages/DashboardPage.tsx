import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress, Button } from '@mui/material';
import {
  Business,
  Event,
  Description,
  Schedule,
  Add,
  CalendarMonth,
  Assignment,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/CalendarView';
import { Event as EventType } from '../stores/eventStore';

interface Stats {
  totalCompanies: number;
  monthlyEvents: number;
  submittedES: number;
  interviewInProgress: number;
}

const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCompanies: 0,
    monthlyEvents: 0,
    submittedES: 0,
    interviewInProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventType[]>([]);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 並列でデータを取得
      const [companiesResult, eventsResult, esResult] = await Promise.all([
        window.api.getCompanies(user.id),
        window.api.getEvents(user.id),
        window.api.getESEntries(user.id),
      ]);

      const companies = companiesResult.success ? companiesResult.companies : [];
      const eventsData = eventsResult.success ? eventsResult.events : [];
      const esEntries = esResult.success ? esResult.esEntries : [];

      // イベントデータを保存
      setEvents(eventsData);

      // 統計を計算
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyEvents = eventsData.filter((event: any) => {
        const eventDate = new Date(event.start_at);
        return (
          eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear
        );
      }).length;

      const submittedES = esEntries.filter(
        (es: any) => es.status === 'submitted' || es.status === 'passed'
      ).length;

      const interviewInProgress = companies.filter(
        (company: any) => company.status === 'interview'
      ).length;

      setStats({
        totalCompanies: companies.length,
        monthlyEvents,
        submittedES,
        interviewInProgress,
      });
    } catch (error) {
      console.error('統計の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: '登録企業数', value: stats.totalCompanies, icon: <Business />, color: '#1976d2' },
    { title: '今月のイベント', value: stats.monthlyEvents, icon: <Event />, color: '#2e7d32' },
    { title: 'ES提出済み', value: stats.submittedES, icon: <Description />, color: '#ed6c02' },
    { title: '選考中', value: stats.interviewInProgress, icon: <Schedule />, color: '#9c27b0' },
  ];

  return (
    <Box>
      {/* ウェルカムメッセージ */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ようこそ、{user?.name}さん
        </Typography>
        <Typography variant="body1" color="text.secondary">
          今日も就職活動を頑張りましょう！
        </Typography>
      </Box>

      {/* 統計カード */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statsCards.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: stat.color,
                        borderRadius: '8px',
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      {React.cloneElement(stat.icon, {
                        sx: { color: 'white', fontSize: 28 },
                      })}
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* クイックアクション */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          クイックアクション
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Add />}
              onClick={() => navigate('/companies')}
              sx={{ py: 2, justifyContent: 'flex-start' }}
            >
              <Box sx={{ textAlign: 'left', ml: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  企業を追加
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  新しい企業を登録
                </Typography>
              </Box>
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<CalendarMonth />}
              onClick={() => navigate('/calendar')}
              sx={{ py: 2, justifyContent: 'flex-start' }}
            >
              <Box sx={{ textAlign: 'left', ml: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  イベントを追加
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  面接や説明会を登録
                </Typography>
              </Box>
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Assignment />}
              onClick={() => navigate('/es')}
              sx={{ py: 2, justifyContent: 'flex-start' }}
            >
              <Box sx={{ textAlign: 'left', ml: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  ESを作成
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  エントリーシートを書く
                </Typography>
              </Box>
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Description />}
              onClick={() => navigate('/self-analysis')}
              sx={{ py: 2, justifyContent: 'flex-start' }}
            >
              <Box sx={{ textAlign: 'left', ml: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  自己分析
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  自己分析を記録
                </Typography>
              </Box>
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* カレンダーウィジェット */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  カレンダー
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/calendar')}
                >
                  詳細を見る
                </Button>
              </Box>
              <Box sx={{ height: '500px' }}>
                <CalendarView
                  events={events}
                  onEventClick={(event) => {
                    // TODO: イベント詳細モーダルを開く
                    console.log('Event clicked:', event);
                  }}
                  onDateSelect={(start, end) => {
                    // カレンダーページに遷移
                    navigate('/calendar');
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  今後のイベント
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate('/calendar')}
                >
                  すべて見る
                </Button>
              </Box>
              <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                {(() => {
                  const now = new Date();
                  const upcomingEvents = events
                    .filter((event) => new Date(event.start_at) >= now)
                    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                    .slice(0, 7);

                  if (upcomingEvents.length === 0) {
                    return (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                        今後7日間のイベントはありません
                      </Typography>
                    );
                  }

                  return upcomingEvents.map((event) => (
                    <Card
                      key={event.id}
                      sx={{
                        mb: 1.5,
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 2 },
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                      onClick={() => {
                        // TODO: イベント詳細モーダルを開く
                        console.log('Event clicked:', event);
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          {event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(event.start_at).toLocaleString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                        {event.type && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: 'primary.light',
                              color: 'primary.contrastText',
                              mt: 0.5,
                            }}
                          >
                            {event.type}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ));
                })()}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;

