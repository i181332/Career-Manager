import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, CircularProgress, Paper, Divider } from '@mui/material';
import { EmailMessage } from '../../../database/types';
import { useMailStore } from '../../stores/useMailStore';
import { MailListItem } from '../Mail/MailListItem';
import { MailDetail } from '../Mail/MailDetail';

interface CompanyMailListProps {
    companyId: number;
    onCreateEvent: (eventData: any) => void;
    onCreateES: (esData: any) => void;
}

export const CompanyMailList: React.FC<CompanyMailListProps> = ({
    companyId,
    onCreateEvent,
    onCreateES,
}) => {
    const { mails, loading, fetchMails, markAsRead } = useMailStore();
    const [selectedMailId, setSelectedMailId] = useState<number | null>(null);

    useEffect(() => {
        fetchMails(companyId);
    }, [companyId]);

    const handleMailClick = (mail: EmailMessage) => {
        setSelectedMailId(mail.id);
        if (!mail.is_read) {
            markAsRead(mail.id);
        }
    };

    const selectedMail = mails.find((m) => m.id === selectedMailId);

    if (loading && mails.length === 0) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (mails.length === 0) {
        return (
            <Box p={4} textAlign="center">
                <Typography color="text.secondary">メールはありません</Typography>
            </Box>
        );
    }

    return (
        <Grid container spacing={2} sx={{ height: 'calc(100vh - 250px)' }}>
            {/* Mail List */}
            <Grid item xs={4} sx={{ height: '100%', overflowY: 'auto' }}>
                <Paper variant="outlined">
                    {mails.map((mail) => (
                        <React.Fragment key={mail.id}>
                            <MailListItem
                                mail={mail}
                                selected={mail.id === selectedMailId}
                                onClick={() => handleMailClick(mail)}
                            />
                            <Divider />
                        </React.Fragment>
                    ))}
                </Paper>
            </Grid>

            {/* Mail Detail */}
            <Grid item xs={8} sx={{ height: '100%' }}>
                {selectedMail ? (
                    <MailDetail
                        mail={selectedMail}
                        onCreateEvent={onCreateEvent}
                        onCreateES={onCreateES}
                    />
                ) : (
                    <Paper
                        variant="outlined"
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography color="text.secondary">メールを選択してください</Typography>
                    </Paper>
                )}
            </Grid>
        </Grid>
    );
};
