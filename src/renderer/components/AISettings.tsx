import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Alert,
    Stack,
    Typography,
} from '@mui/material';
import { Save as SaveIcon, Terminal as TerminalIcon } from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';

import { AIDebugLog } from './AIDebugLog';

export const AISettings: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const updateUser = useAuthStore((state) => state.setUser);

    const [enabled, setEnabled] = useState(false);
    const [commandTemplate, setCommandTemplate] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    const DEFAULT_COMMAND_TEMPLATE = 'claude "{{prompt}}"';

    useEffect(() => {
        if (user?.ai_config) {
            try {
                const config = JSON.parse(user.ai_config);
                setEnabled(!!config.enabled);
                setCommandTemplate(config.commandTemplate || DEFAULT_COMMAND_TEMPLATE);
            } catch (e) {
                console.error('Failed to parse ai_config', e);
                setCommandTemplate(DEFAULT_COMMAND_TEMPLATE);
            }
        } else {
            // No config yet, set default
            setCommandTemplate(DEFAULT_COMMAND_TEMPLATE);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;

        try {
            setError('');
            setSaveSuccess(false);

            const config = {
                enabled: enabled ? 1 : 0,
                commandTemplate,
            };

            const result = await window.api.updateUser(user.id, {
                ai_config: JSON.stringify(config),
            });

            if (result.success && result.user) {
                updateUser(result.user);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setError(result.error || '設定の保存に失敗しました');
            }
        } catch (err) {
            console.error('設定の保存に失敗しました:', err);
            setError('設定の保存に失敗しました');
        }
    };

    return (
        <Stack spacing={2}>
            {saveSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    AI設定を保存しました
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <FormControlLabel
                control={
                    <Switch
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                    />
                }
                label="AI機能を有効にする"
            />

            <TextField
                label="コマンドテンプレート"
                value={commandTemplate}
                onChange={(e) => setCommandTemplate(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder='gemini_CLI "{{prompt}}"'
                helperText="ローカルのCLIツールを実行するコマンドを入力してください。{{prompt}} は自動的に置換されます。"
                disabled={!enabled}
            />

            <Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!enabled && !commandTemplate}
                >
                    保存
                </Button>
            </Box>

            {enabled && <AIDebugLog />}
        </Stack>
    );
};
