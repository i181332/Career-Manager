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
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Business,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useSelfAnalysisStore } from '../stores/selfAnalysisStore';
import { useCompanyStore } from '../stores/companyStore';
import SelfAnalysisFormDialog from '../components/SelfAnalysisFormDialog';

const SelfAnalysisPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { selfAnalyses, setSelfAnalyses, removeSelfAnalysis, setLoading, loading } =
    useSelfAnalysisStore();
  const { companies, setCompanies } = useCompanyStore();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('すべて');
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<any>(null);

  const categories = [
    'すべて',
    '強み・弱み',
    '価値観',
    '経験・エピソード',
    '志望動機',
    'キャリアビジョン',
    'その他',
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [analysisResult, companiesResult] = await Promise.all([
        window.api.getSelfAnalyses(user.id),
        window.api.getCompanies(user.id),
      ]);

      if (analysisResult.success && analysisResult.selfAnalyses) {
        setSelfAnalyses(analysisResult.selfAnalyses);
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
    setSelectedAnalysis(null);
    setOpenDialog(true);
  };

  const handleEdit = (analysis: any) => {
    setSelectedAnalysis(analysis);
    setOpenDialog(true);
  };

  const handleView = (analysis: any) => {
    setViewingAnalysis(analysis);
    setViewDialog(true);
  };

  const handleSave = async (data: any) => {
    if (!user) return;

    try {
      if (selectedAnalysis) {
        const result = await window.api.updateSelfAnalysis(selectedAnalysis.id, data);
        if (result.success) {
          await loadData();
        }
      } else {
        const result = await window.api.createSelfAnalysis({
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
    if (!window.confirm('この自己分析を削除しますか？')) return;

    try {
      const result = await window.api.deleteSelfAnalysis(id);
      if (result.success) {
        removeSelfAnalysis(id);
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
    }
  };

  const getCompanyNames = (linkedCompaniesJson: string): string[] => {
    try {
      const ids = JSON.parse(linkedCompaniesJson || '[]');
      return ids
        .map((id: number) => {
          const company = companies.find((c) => c.id === id);
          return company ? company.name : null;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const getTags = (tagsJson: string): string[] => {
    try {
      return JSON.parse(tagsJson || '[]');
    } catch {
      return [];
    }
  };

  const filteredAnalyses = selfAnalyses.filter((analysis) => {
    const matchesSearch =
      analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'すべて' || analysis.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          自己分析
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          新規作成
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterList />
              </InputAdornment>
            ),
          }}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={3}>
        {filteredAnalyses.map((analysis) => (
          <Grid item xs={12} md={6} lg={4} key={analysis.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {analysis.title}
                </Typography>
                <Chip
                  label={analysis.category}
                  size="small"
                  color="primary"
                  sx={{ mb: 1 }}
                />
                <Box
                  sx={{ mb: 2 }}
                  dangerouslySetInnerHTML={{
                    __html:
                      analysis.content.substring(0, 150) +
                      (analysis.content.length > 150 ? '...' : ''),
                  }}
                />
                {getTags(analysis.tags).length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {getTags(analysis.tags).map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
                {getCompanyNames(analysis.linked_companies).length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Business fontSize="small" color="action" />
                    {getCompanyNames(analysis.linked_companies).map((name) => (
                      <Chip key={name} label={name} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleView(analysis)}>
                  詳細
                </Button>
                <Button size="small" startIcon={<Edit />} onClick={() => handleEdit(analysis)}>
                  編集
                </Button>
                <IconButton size="small" color="error" onClick={() => handleDelete(analysis.id)}>
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredAnalyses.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            自己分析が見つかりませんでした
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleCreate} sx={{ mt: 2 }}>
            最初の自己分析を作成
          </Button>
        </Box>
      )}

      <SelfAnalysisFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSave}
        initialData={selectedAnalysis}
        companies={companies}
      />

      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        {viewingAnalysis && (
          <>
            <DialogTitle>{viewingAnalysis.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Chip label={viewingAnalysis.category} color="primary" sx={{ mr: 1 }} />
                {getTags(viewingAnalysis.tags).map((tag) => (
                  <Chip key={tag} label={tag} variant="outlined" sx={{ mr: 0.5 }} />
                ))}
              </Box>
              {getCompanyNames(viewingAnalysis.linked_companies).length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Business color="action" />
                  <Typography variant="body2" color="text.secondary">
                    関連企業:
                  </Typography>
                  {getCompanyNames(viewingAnalysis.linked_companies).map((name) => (
                    <Chip key={name} label={name} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              <Box dangerouslySetInnerHTML={{ __html: viewingAnalysis.content }} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialog(false)}>閉じる</Button>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => {
                  setViewDialog(false);
                  handleEdit(viewingAnalysis);
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

export default SelfAnalysisPage;
