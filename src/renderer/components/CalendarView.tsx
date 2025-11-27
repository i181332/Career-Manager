import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ja';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box } from '@mui/material';
import { Event } from '../stores/eventStore';

moment.locale('ja');
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateSelect: (start: Date, end: Date) => void;
}

const eventTypeColors: Record<string, string> = {
  briefing: '#2196f3',
  es_deadline: '#f44336',
  interview: '#9c27b0',
  test: '#ff9800',
  other: '#757575',
};

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick, onDateSelect }) => {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_at),
        end: event.end_at ? new Date(event.end_at) : new Date(event.start_at),
        allDay: event.all_day === 1,
        resource: event,
      })),
    [events]
  );

  const eventStyleGetter = (event: any) => {
    const backgroundColor = eventTypeColors[event.resource.type || 'other'] || '#757575';
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    onDateSelect(start, end);
  };

  const handleSelectEvent = (event: any) => {
    onEventClick(event.resource);
  };

  const messages = {
    allDay: '終日',
    previous: '前',
    next: '次',
    today: '今日',
    month: '月',
    week: '週',
    day: '日',
    agenda: '予定',
    date: '日付',
    time: '時間',
    event: 'イベント',
    noEventsInRange: 'この期間にイベントはありません',
    showMore: (total: number) => `+${total} 件`,
  };

  return (
    <Box sx={{ height: '100%', minHeight: '500px', backgroundColor: 'white', p: 2, borderRadius: 1 }}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        messages={messages}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        defaultView={Views.MONTH}
      />
    </Box>
  );
};

export default CalendarView;
