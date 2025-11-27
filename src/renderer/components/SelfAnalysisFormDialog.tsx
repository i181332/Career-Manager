import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Autocomplete,
  MenuItem,
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface SelfAnalysisFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
  companies: Array<{ id: number; name: string }>;
}

const categories = [
  '強み・弱み',
  '価値観',
  '経験・エピソード',
  '志望動機',
  'キャリアビジョン',
  'その他',
];

const SelfAnalysisFormDialog: React.FC<SelfAnalysisFormDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  companies,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('その他');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<number[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      setCategory(initialData.category || 'その他');
      setTags(initialData.tags ? JSON.parse(initialData.tags) : []);
      setLinkedCompanies(
        initialData.linked_companies ? JSON.parse(initialData.linked_companies) : []
      );
    } else {
      resetForm();
    }
  }, [initialData, open]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('その他');
    setTags([]);
    setLinkedCompanies([]);
    setCurrentTag('');
  };

  const handleSave = () => {
    const data = {
      title,
      content,
      category,
      tags: JSON.stringify(tags),
      linked_companies: JSON.stringify(linkedCompanies),
    };
    onSave(data);
    resetForm();
  };

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag]);
      setCurrentTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? '自己分析を編集' : '新規自己分析'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <TextField
            select
            label="カテゴリー"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="タグを追加"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                size="small"
                fullWidth
              />
              <Button onClick={handleAddTag} variant="outlined">
                追加
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <Chip key={tag} label={tag} onDelete={() => handleDeleteTag(tag)} size="small" />
              ))}
            </Box>
          </Box>

          <Autocomplete
            multiple
            options={companies}
            getOptionLabel={(option) => option.name}
            value={companies.filter((c) => linkedCompanies.includes(c.id))}
            onChange={(_, newValue) => {
              setLinkedCompanies(newValue.map((v) => v.id));
            }}
            renderInput={(params) => (
              <TextField {...params} label="関連企業" placeholder="企業を選択" />
            )}
          />

          <Box>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              style={{ height: '300px', marginBottom: '50px' }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" disabled={!title}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelfAnalysisFormDialog;
