import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  Business,
  Event,
  Description,
  Psychology,
  RecordVoiceOver,
  Notifications,
  Settings,
  Work,
  BarChart,
  Email,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/' },
  { text: '企業管理', icon: <Business />, path: '/companies' },
  { text: 'イベント', icon: <Event />, path: '/events' },
  { text: 'メール管理', icon: <Email />, path: '/emails' },
  { text: '通知履歴', icon: <Notifications />, path: '/notifications' },
  { text: 'ES管理', icon: <Description />, path: '/es' },
  { text: '自己分析', icon: <Psychology />, path: '/self-analysis' },
  { text: '面接ノート', icon: <RecordVoiceOver />, path: '/interview-notes' },
  { text: '統計・分析', icon: <BarChart />, path: '/analytics' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {/* ロゴ・タイトル */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Work color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" component="div" fontWeight="bold">
          就活管理
        </Typography>
      </Box>

      <Divider />

      {/* メニュー */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* 設定 */}
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={location.pathname === '/settings'}
            onClick={() => navigate('/settings')}
          >
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="設定" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
