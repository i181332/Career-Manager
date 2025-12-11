import React, { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import TerminalIcon from '@mui/icons-material/Terminal';

interface LogEntry {
    timestamp: string;
    type: 'info' | 'error' | 'prompt' | 'response';
    message: string;
    data?: any;
}

export const AIDebugLog: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cleanup = window.api.onAILog((data: LogEntry) => {
            setLogs((prev) => [...prev, data]);
        });
        return () => { cleanup(); };
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const clearLogs = () => {
        setLogs([]);
    };

    const getLogColor = (type: string) => {
        switch (type) {
            case 'error': return '#ff5252';
            case 'prompt': return '#69f0ae';
            case 'response': return '#40c4ff';
            default: return '#e0e0e0';
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: 2,
                mt: 2,
                bgcolor: '#1e1e1e',
                color: '#e0e0e0',
                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '300px'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, borderBottom: '1px solid #333', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TerminalIcon sx={{ color: '#4caf50' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        AI Real-time Debug Log
                    </Typography>
                </Box>
                <Tooltip title="Clear Logs">
                    <IconButton size="small" onClick={clearLogs} sx={{ color: '#9e9e9e', '&:hover': { color: '#fff' } }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                {logs.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#757575', fontStyle: 'italic', mt: 2, textAlign: 'center' }}>
                        Waiting for AI activity...
                    </Typography>
                ) : (
                    logs.map((log, index) => (
                        <Box key={index} sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                                <Typography component="span" sx={{ color: '#757575', fontSize: '0.75rem' }}>
                                    [{new Date(log.timestamp).toLocaleTimeString()}]
                                </Typography>
                                <Typography component="span" sx={{ color: getLogColor(log.type), fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                    {log.type}
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', ml: 2 }}>
                                {log.message}
                            </Typography>
                            {log.data && (
                                <Box
                                    component="pre"
                                    sx={{
                                        mt: 0.5,
                                        ml: 2,
                                        p: 1,
                                        bgcolor: '#2d2d2d',
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        overflowX: 'auto',
                                        color: '#bdbdbd'
                                    }}
                                >
                                    {JSON.stringify(log.data, null, 2)}
                                </Box>
                            )}
                        </Box>
                    ))
                )}
                <div ref={bottomRef} />
            </Box>
        </Paper>
    );
};
