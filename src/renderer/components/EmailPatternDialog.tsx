import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

import { useCompanyStore } from '../stores/companyStore';

interface EmailPatternDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: number;
  companyName?: string;
}

const EmailPatternDialog: React.FC<EmailPatternDialogProps> = ({
  open,
  onClose,
  companyId: initialCompanyId,
  companyName: initialCompanyName,
}) => {
  const companies = useCompanyStore((state) => state.companies);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(initialCompanyId);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 新規パターン追加用の状態
  const [newPatternType, setNewPatternType] = useState<string>('domain');
  const [newPatternValue, setNewPatternValue] = useState<string>('');
  const [newPatternPriority, setNewPatternPriority] = useState<number>(0);

  useEffect(() => {
    if (open) {
      if (initialCompanyId > 0) {
        setSelectedCompanyId(initialCompanyId);
        loadPatterns(initialCompanyId);
      } else if (companies.length > 0) {
        // デフォルトで最初の企業を選択、または選択なし状態にする
        // ここでは選択なし(0)のままにして、ユーザーに選ばせる
        setSelectedCompanyId(0);
        setPatterns([]);
      }
    }
  }, [open, initialCompanyId, companies]);

  const loadPatterns = async (id: number) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.getEmailPatterns(id);
      if (result.success && result.data) {
        setPatterns(result.data);
      } else {
        setError(result.error || 'パターンの取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 企業変更時のハンドラ
  const handleCompanyChange = (event: any) => {
    const newId = Number(event.target.value);
    setSelectedCompanyId(newId);
    if (newId > 0) {
      loadPatterns(newId);
    } else {
      setPatterns([]);
    }
  };

  const handleAddPattern = async () => {
    if (!selectedCompanyId) {
      setError('企業を選択してください');
      return;
    }
    if (!newPatternValue.trim()) {
      setError('パターン値を入力してください');
      return;
    }

    setError(null);
    try {
      const result = await window.api.addEmailPattern(selectedCompanyId, {
        pattern_type: newPatternType,
        pattern_value: newPatternValue.trim(),
        priority: newPatternPriority,
      });

      if (result.success && result.data) {
        setPatterns([...patterns, result.data]);
        setNewPatternValue('');
        setNewPatternPriority(0);
        setSuccessMessage('パターンを追加しました');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'パターンの追加に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePattern = async (patternId: number) => {
    setError(null);
    try {
      const result = await window.api.removeEmailPattern(patternId);
      if (result.success) {
        setPatterns(patterns.filter((p) => p.id !== patternId));
        setSuccessMessage('パターンを削除しました');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'パターンの削除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReallocate = async () => {
    setError(null);
    setLoading(true);
    try {
      // ここでは最初のメールアカウントIDを使用（本来はユーザーが選択すべき）
      const accountsResult = await window.api.getEmailAccounts(1); // TODO: user IDを動的に取得
      if (accountsResult.success && accountsResult.data && accountsResult.data.length > 0) {
        const result = await window.api.reallocateAllEmails(accountsResult.data[0].id);
        if (result.success && result.data) {
          setSuccessMessage(
            `${result.data.reallocated}件のメールを再割り振りしました`
          );
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setError(result.error || '再割り振りに失敗しました');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPatternTypeLabel = (type: string) => {
    switch (type) {
      case 'domain':
        return 'ドメイン';
      case 'address':
        return 'アドレス';
      case 'subject_keyword':
        return '件名キーワード';
      default:
        return type;
    }
  };

  const getPatternTypeHelp = (type: string) => {
    switch (type) {
      case 'domain':
        return '例: @example.com';
      case 'address':
        return '例: noreply@company.com';
      case 'subject_keyword':
        return '例: 選考、面接';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="span">
            メール自動割り振りルール {initialCompanyName ? `- ${initialCompanyName}` : ''}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* 説明 */}
        <Alert severity="info" sx={{ mb: 3 }}>
          メールの送信元アドレスやドメイン、件名のキーワードに基づいて、自動的にこの企業に割り振るルールを設定できます。
        </Alert>

        {/* 企業選択 (グローバルモードの場合) */}
        {initialCompanyId === 0 && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>対象企業</InputLabel>
            <Select
              value={selectedCompanyId || ''}
              label="対象企業"
              onChange={handleCompanyChange}
            >
              <MenuItem value={0}>
                <em>企業を選択してください</em>
              </MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {selectedCompanyId > 0 && (
          <>

            {/* 既存のパターン一覧 */}
            <Typography variant="subtitle1" gutterBottom>
              現在のルール
            </Typography>

            {patterns.length === 0 ? (
              <Paper sx={{ p: 2, textAlign: 'center', mb: 3 }}>
                <Typography color="text.secondary">
                  ルールが設定されていません
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ mb: 3 }}>
                <List>
                  {patterns.map((pattern, index) => (
                    <React.Fragment key={pattern.id}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Chip
                                label={getPatternTypeLabel(pattern.pattern_type)}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Typography variant="body1">
                                {pattern.pattern_value}
                              </Typography>
                              <Chip
                                label={`優先度: ${pattern.priority}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            pattern.enabled ? (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  mt: 0.5,
                                }}
                              >
                                <CheckCircleIcon
                                  sx={{ fontSize: 14, mr: 0.5, color: 'success.main' }}
                                />
                                <Typography variant="caption" color="success.main">
                                  有効
                                </Typography>
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  mt: 0.5,
                                }}
                              >
                                <CancelIcon
                                  sx={{ fontSize: 14, mr: 0.5, color: 'error.main' }}
                                />
                                <Typography variant="caption" color="error.main">
                                  無効
                                </Typography>
                              </Box>
                            )
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeletePattern(pattern.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}

            {/* 新しいルールを追加 */}
            <Typography variant="subtitle1" gutterBottom>
              新しいルールを追加
            </Typography>

            <Paper sx={{ p: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>パターン種類</InputLabel>
                <Select
                  value={newPatternType}
                  onChange={(e) => setNewPatternType(e.target.value)}
                  label="パターン種類"
                >
                  <MenuItem value="domain">ドメイン</MenuItem>
                  <MenuItem value="address">メールアドレス</MenuItem>
                  <MenuItem value="subject_keyword">件名キーワード</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="パターン値"
                value={newPatternValue}
                onChange={(e) => setNewPatternValue(e.target.value)}
                helperText={getPatternTypeHelp(newPatternType)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type="number"
                label="優先度"
                value={newPatternPriority}
                onChange={(e) => setNewPatternPriority(Number(e.target.value))}
                helperText="数値が大きいほど優先度が高くなります"
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPattern}
                fullWidth
              >
                ルールを追加
              </Button>
            </Paper>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleReallocate}
          disabled={loading || patterns.length === 0}
          color="primary"
        >
          一括再割り振り実行
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog >
  );
};

export default EmailPatternDialog;
