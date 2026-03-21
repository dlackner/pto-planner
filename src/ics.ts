// Generate an ICS file for a set of PTO dates
export function generateICS(dates: string[], title: string = 'PTO'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PTO Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const date of dates.sort()) {
    const dateClean = date.replace(/-/g, '');
    // All-day event: DTSTART is the day, DTEND is the next day
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const nextDay = d.toISOString().split('T')[0].replace(/-/g, '');

    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART;VALUE=DATE:${dateClean}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay}`);
    lines.push(`SUMMARY:${title}`);
    lines.push(`UID:pto-${dateClean}@pto-planner`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    lines.push('TRANSP:OPAQUE');
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(dates: string[], filename: string = 'pto-days.ics') {
  const content = generateICS(dates);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Google Calendar URL for adding events one at a time (batch not supported)
// For bulk, ICS download is the way to go
export function googleCalendarUrl(date: string, title: string = 'PTO'): string {
  const dateClean = date.replace(/-/g, '');
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  const nextDay = d.toISOString().split('T')[0].replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateClean}/${nextDay}&details=&sf=true&output=xml`;
}
