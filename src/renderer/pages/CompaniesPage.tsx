import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Business,
  Edit,
  Delete,
  OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import CompanyFormDialog from '../components/CompanyFormDialog';

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

const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { companies, setCompanies, removeCompany, setLoading, loading } = useCompanyStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await window.api.getCompanies(user.id);
      if (result.success && result.companies) {
        setCompanies(result.companies);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) {
      loadCompanies();
      return;
    }

    setLoading(true);
    try {
      const result = await window.api.getCompanies(user.id);
      if (result.success && result.companies) {
        const filtered = result.companies.filter((c: any) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setCompanies(filtered);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, companyId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedCompanyId(companyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCompanyId(null);
  };

  const handleDelete = async () => {
    if (!selectedCompanyId) return;

    if (confirm('この企業を削除してもよろしいですか？')) {
      try {
        const result = await window.api.deleteCompany(selectedCompanyId);
        if (result.success) {
          removeCompany(selectedCompanyId);
        } else {
          alert(result.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('削除に失敗しました');
      }
    }
    handleMenuClose();
  };

  const handleCardClick = (companyId: number) => {
    navigate(`/companies/${companyId}`);
  };

  const filteredCompanies = companies;

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          企業管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          企業を追加
        </Button>
      </Box>

      {/* 検索バー */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="企業名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* 企業リスト */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredCompanies.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            企業が登録されていません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            「企業を追加」ボタンから企業を登録しましょう
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            企業を追加
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredCompanies.map((company) => (
            <Grid item xs={12} sm={6} md={4} key={company.id}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      label={statusLabels[company.status] || company.status}
                      size="small"
                      sx={{
                        backgroundColor: statusColors[company.status] || '#757575',
                        color: 'white',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, company.id);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Box onClick={() => handleCardClick(company.id)}>
                    <Typography variant="h6" gutterBottom noWrap>
                      {company.name}
                    </Typography>
                    {company.industry && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {company.industry}
                      </Typography>
                    )}
                    {company.size && (
                      <Typography variant="body2" color="text.secondary">
                        {company.size}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* コンテキストメニュー */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedCompanyId) navigate(`/companies/${selectedCompanyId}`);
            handleMenuClose();
          }}
        >
          <OpenInNew fontSize="small" sx={{ mr: 1 }} />
          詳細を見る
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 企業作成ダイアログ */}
      <CompanyFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSuccess={loadCompanies}
      />
    </Box>
  );
};

export default CompaniesPage;
