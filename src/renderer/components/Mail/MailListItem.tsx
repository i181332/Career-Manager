import React from 'react';
import {
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    Chip,
    IconButton,
} from '@mui/material';
import {
    Mail as MailIcon,
    Drafts as DraftsIcon,
    AttachFile as AttachFileIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { EmailMessage } from '../../../database/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MailListItemProps {
    mail: EmailMessage;
    selected: boolean;
    onClick: () => void;
}

export const MailListItem: React.FC<MailListItemProps> = ({
    mail,
    selected,
    onClick,
}) => {
    const isRead = mail.is_read === 1;
    const hasAttachments = mail.has_attachments === 1;

    return (
        <ListItem
            button
            selected={selected}
            onClick={onClick}
            alignItems="flex-start"
            sx={{
                borderLeft: selected ? '4px solid #1976d2' : '4px solid transparent',
                bgcolor: selected ? 'action.selected' : 'background.paper',
                '&:hover': {
                    bgcolor: 'action.hover',
                },
            }}
        >
            <ListItemAvatar>
                <Avatar sx={{ bgcolor: isRead ? 'grey.400' : 'primary.main' }}>
                    {isRead ? <DraftsIcon /> : <MailIcon />}
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography
                            variant="subtitle1"
                            component="span"
                            sx={{ fontWeight: isRead ? 'normal' : 'bold' }}
                        >
                            {mail.from_name || mail.from_address}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {format(new Date(mail.received_at), 'MM/dd HH:mm', { locale: ja })}
                        </Typography>
                    </Box>
                }
                secondary={
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                                variant="body2"
                                color="text.primary"
                                sx={{
                                    fontWeight: isRead ? 'normal' : 'bold',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '80%',
                                }}
                            >
                                {mail.subject || '(件名なし)'}
                            </Typography>
                            {hasAttachments && <AttachFileIcon fontSize="small" color="action" />}
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {mail.body_text?.substring(0, 100)}
                        </Typography>
                    </Box>
                }
            />
        </ListItem>
    );
};
