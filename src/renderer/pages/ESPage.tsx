import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import ESFormDialog from '../components/ESFormDialog';

interface ESEntry {
  id: number;
  user_id: number;
  company_id: number;
  title: string;
  deadline: string | null;
  status: string;
  questions: string | null;
  answers: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  in_progress: '作成中',
  submitted: '提出済み',
  passed: '通過',
  rejected: '不合格',
};

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  in_progress: 'primary',
  submitted: 'warning',
  passed: 'success',
  rejected: 'error',
};

const ESPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { companies, setCompanies } = useCompanyStore();
  const [esEntries, setEsEntries] = useState<ESEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ESEntry | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // ES一覧と企業一覧を並列で取得
      const [esResult, companiesResult] = await Promise.all([
        window.api.getESEntries(user.id),
        window.api.getCompanies(user.id),
      ]);

      if (esResult.success && esResult.esEntries) {
        setEsEntries(esResult.esEntries);
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

  const getCompanyName = (companyId: number): string => {
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : '不明な企業';
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('このESエントリーを削除しますか？')) return;

    try {
      const result = await window.api.deleteESEntry(id);

      if (result.success) {
        loadData();
      } else {
        alert(result.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const filteredEntries = esEntries.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCompanyName(entry.company_id).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">ES管理</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedEntry(null);
            setFormDialogOpen(true);
          }}
        >
          新規ES
        </Button>
      </Box>

      {/* 検索とフィルター */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="タイトルまたは企業名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="ステータス"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">すべて</MenuItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      {/* ESリスト */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>企業名</TableCell>
              <TableCell>タイトル</TableCell>
              <TableCell>締切</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>更新日時</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  ESエントリーがありません
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>{getCompanyName(entry.company_id)}</TableCell>
                  <TableCell>{entry.title}</TableCell>
                  <TableCell>
                    {entry.deadline
                      ? new Date(entry.deadline).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[entry.status] || entry.status}
                      color={statusColors[entry.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(entry.updated_at).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setFormDialogOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ES作成・編集ダイアログ */}
      <ESFormDialog
        open={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          setSelectedEntry(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        esEntry={selectedEntry}
      />
    </Box>
  );
};

export default ESPage;
