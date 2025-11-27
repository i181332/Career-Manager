import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Paper,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsData {
  companyStatusDistribution: { name: string; value: number }[];
  monthlyApplications: { month: string; applications: number }[];
  eventTypeDistribution: { type: string; count: number }[];
  esSubmissionProgress: { month: string; submitted: number; draft: number }[];
  conversionRate: {
    applied: number;
    interview: number;
    offered: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    companyStatusDistribution: [],
    monthlyApplications: [],
    eventTypeDistribution: [],
    esSubmissionProgress: [],
    conversionRate: {
      applied: 0,
      interview: 0,
      offered: 0,
    },
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
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
      const events = eventsResult.success ? eventsResult.events : [];
      const esEntries = esResult.success ? esResult.esEntries : [];

      // 企業ステータスの分布
      const statusCount: Record<string, number> = {};
      companies.forEach((company: any) => {
        statusCount[company.status] = (statusCount[company.status] || 0) + 1;
      });

      const companyStatusDistribution = Object.entries(statusCount).map(([name, value]) => ({
        name:
          name === 'interested'
            ? '興味あり'
            : name === 'applied'
            ? '応募済み'
            : name === 'interview'
            ? '面接中'
            : name === 'offered'
            ? '内定'
            : name === 'rejected'
            ? '不合格'
            : name,
        value,
      }));

      // 月別応募数（過去6ヶ月）
      const now = new Date();
      const monthlyApps: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyApps[key] = 0;
      }

      companies.forEach((company: any) => {
        const date = new Date(company.created_at);
        const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (Object.prototype.hasOwnProperty.call(monthlyApps, key)) {
          monthlyApps[key]++;
        }
      });

      const monthlyApplications = Object.entries(monthlyApps).map(([month, applications]) => ({
        month,
        applications,
      }));

      // イベントタイプ別分布
      const eventTypeCount: Record<string, number> = {};
      events.forEach((event: any) => {
        const type = event.type || 'その他';
        eventTypeCount[type] = (eventTypeCount[type] || 0) + 1;
      });

      const eventTypeDistribution = Object.entries(eventTypeCount).map(([type, count]) => ({
        type,
        count,
      }));

      // ES提出進捗（過去6ヶ月）
      const esProgress: Record<string, { submitted: number; draft: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        esProgress[key] = { submitted: 0, draft: 0 };
      }

      esEntries.forEach((es: any) => {
        const date = new Date(es.created_at);
        const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (Object.prototype.hasOwnProperty.call(esProgress, key)) {
          if (es.status === 'submitted' || es.status === 'passed') {
            esProgress[key].submitted++;
          } else {
            esProgress[key].draft++;
          }
        }
      });

      const esSubmissionProgress = Object.entries(esProgress).map(
        ([month, { submitted, draft }]) => ({
          month,
          submitted,
          draft,
        })
      );

      // 選考通過率
      const appliedCount = companies.filter((c: any) => c.status !== 'interested').length;
      const interviewCount = companies.filter(
        (c: any) => c.status === 'interview' || c.status === 'offered'
      ).length;
      const offeredCount = companies.filter((c: any) => c.status === 'offered').length;

      const conversionRate = {
        applied: appliedCount,
        interview: appliedCount > 0 ? Math.round((interviewCount / appliedCount) * 100) : 0,
        offered: appliedCount > 0 ? Math.round((offeredCount / appliedCount) * 100) : 0,
      };

      setAnalyticsData({
        companyStatusDistribution,
        monthlyApplications,
        eventTypeDistribution,
        esSubmissionProgress,
        conversionRate,
      });
    } catch (error) {
      console.error('統計データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        統計・分析
      </Typography>

      <Grid container spacing={3}>
        {/* 選考通過率 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              選考通過率
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      応募数
                    </Typography>
                    <Typography variant="h3" color="primary">
                      {analyticsData.conversionRate.applied}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      面接通過率
                    </Typography>
                    <Typography variant="h3" color="secondary">
                      {analyticsData.conversionRate.interview}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      内定獲得率
                    </Typography>
                    <Typography variant="h3" color="success.main">
                      {analyticsData.conversionRate.offered}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* 企業ステータス分布 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              企業ステータス別分布
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.companyStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.companyStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* イベントタイプ別分布 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              イベントタイプ別分布
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.eventTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* 月別応募数 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              月別応募数（過去6ヶ月）
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyApplications}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#8884d8"
                  name="応募数"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* ES提出進捗 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ES提出進捗（過去6ヶ月）
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.esSubmissionProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="submitted" stackId="a" fill="#82ca9d" name="提出済み" />
                <Bar dataKey="draft" stackId="a" fill="#8884d8" name="下書き" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;
