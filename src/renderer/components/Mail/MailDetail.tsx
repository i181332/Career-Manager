import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Divider,
    Button,
    Chip,
    Alert,
    Avatar,
} from '@mui/material';
import {
    Event as EventIcon,
    AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { EmailMessage } from '../../../database/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMailStore } from '../../stores/useMailStore';

interface MailDetailProps {
    mail: EmailMessage;
    onCreateEvent: (eventData: any) => void;
    onCreateES: (esData: any) => void;
}

export const MailDetail: React.FC<MailDetailProps> = ({
    mail,
    onCreateEvent,
    onCreateES,
}) => {
    const { downloadAttachment, analyzeEmail } = useMailStore();
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ events: any[]; es: any[] } | null>(null);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        const result = await analyzeEmail(mail.id);
        setAnalysisResult(result);
        setAnalyzing(false);
    };

    const attachments = mail.attachments_metadata
        ? JSON.parse(mail.attachments_metadata)
        : [];

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
            {/* Header */}
            <Box mb={2}>
                <Typography variant="h5" gutterBottom>
                    {mail.subject || '(件名なし)'}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Avatar>{(mail.from_name || mail.from_address)[0]}</Avatar>
                        <Box>
                            <Typography variant="subtitle1">
                                {mail.from_name} &lt;{mail.from_address}&gt;
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                To: {mail.to_address}
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {format(new Date(mail.received_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Actions */}
            <Box display="flex" gap={1} mb={2}>
                <Button
                    variant="outlined"
                    startIcon={<EventIcon />}
                    onClick={handleAnalyze}
                    disabled={analyzing}
                >
                    解析・連携
                </Button>
            </Box>

            {/* Analysis Result */}
            {analysisResult && (
                <Box mb={2}>
                    {analysisResult.events.length > 0 && (
                        <Alert severity="info" sx={{ mb: 1 }}>
                            イベント候補が見つかりました:
                            {analysisResult.events.map((e, i) => (
                                <Box key={i} mt={1}>
                                    <Typography variant="body2">
                                        {format(new Date(e.start_at), 'MM/dd HH:mm')} - {e.title}
                                        <Button
                                            size="small"
                                            onClick={() => onCreateEvent(e)}
                                            sx={{ ml: 1 }}
                                        >
                                            作成
                                        </Button>
                                    </Typography>
                                </Box>
                            ))}
                        </Alert>
                    )}
                    {analysisResult.es.length > 0 && (
                        <Alert severity="info">
                            ES締切候補が見つかりました:
                            {analysisResult.es.map((e, i) => (
                                <Box key={i} mt={1}>
                                    <Typography variant="body2">
                                        {format(new Date(e.deadline), 'MM/dd HH:mm')} - {e.title}
                                        <Button
                                            size="small"
                                            onClick={() => onCreateES(e)}
                                            sx={{ ml: 1 }}
                                        >
                                            作成
                                        </Button>
                                    </Typography>
                                </Box>
                            ))}
                        </Alert>
                    )}
                    {analysisResult.events.length === 0 && analysisResult.es.length === 0 && (
                        <Alert severity="warning">候補は見つかりませんでした。</Alert>
                    )}
                </Box>
            )}

            {/* Body */}
            <Box
                flex={1}
                sx={{
                    overflowY: 'auto',
                    bgcolor: 'grey.50',
                    p: 2,
                    borderRadius: 1,
                    mb: 2,
                }}
            >
                {mail.body_html ? (
                    <div dangerouslySetInnerHTML={{ __html: mail.body_html }} />
                ) : (
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>{mail.body_text}</Typography>
                )}
            </Box>

            {/* Attachments */}
            {attachments.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        添付ファイル ({attachments.length})
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {attachments.map((att: any) => (
                            <Chip
                                key={att.id}
                                icon={<AttachFileIcon />}
                                label={att.filename}
                                onClick={() => downloadAttachment(mail.id, att.id)}
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </Box>
            )}
        </Paper>
    );
};
