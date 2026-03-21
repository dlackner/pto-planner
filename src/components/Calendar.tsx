import React from 'react';

interface Props {
  year: number;
  selectedDays: Set<string>;
  holidayDates: Set<string>;
  holidayNames: Map<string, string>;
  recommendedDates: Set<string>;
  overBudgetDates: Set<string>;
  disabledDates: Set<string>;
  onToggleDay: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function Calendar({
  year,
  selectedDays,
  holidayDates,
  holidayNames,
  recommendedDates,
  overBudgetDates,
  disabledDates,
  onToggleDay,
}: Props) {
  const now = new Date();
  const today = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter to only show current month onward (for current year) or all months (future years)
  const visibleMonths = MONTHS
    .map((name, idx) => ({ name, idx }))
    .filter(({ idx }) => year > currentYear || idx >= currentMonth);

  return (
    <div className="calendar-grid">
      {visibleMonths.map(({ name: monthName, idx: monthIdx }) => {
        const firstDay = new Date(year, monthIdx, 1).getDay();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const cells: React.ReactNode[] = [];

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
          cells.push(<div key={`empty-${i}`} className="day-cell empty" />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = formatDate(year, monthIdx, day);
          const dow = new Date(year, monthIdx, day).getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isHoliday = holidayDates.has(dateStr);
          const isSelected = selectedDays.has(dateStr);
          const isRecommended = recommendedDates.has(dateStr);
          const isOverBudget = overBudgetDates.has(dateStr);
          const isDisabled = disabledDates.has(dateStr);
          const isToday = dateStr === today;
          const isPast = dateStr < today;

          let className = 'day-cell';
          if (isPast) className += ' weekend'; // reuse weekend styling for past dates
          else if (isWeekend) className += ' weekend';
          else if (isHoliday) className += ' holiday';
          else if (isSelected) {
            className += ' selected-pto';
            if (isOverBudget) className += ' over-budget';
          } else if (isRecommended) {
            // Only blue if recommended but NOT selected/toggled on
            className += ' recommended';
          }
          if (isDisabled && !isSelected) className += ' disabled';
          if (isToday) className += ' today';

          const title = isHoliday
            ? holidayNames.get(dateStr) || 'Holiday'
            : isSelected && isOverBudget
            ? 'Over budget'
            : isRecommended
            ? 'Suggested day off'
            : undefined;

          cells.push(
            <div
              key={day}
              className={className}
              title={title}
              onClick={() => {
                if (isPast || isWeekend || isHoliday) return;
                if (isSelected) {
                  // Always allow deselecting
                  onToggleDay(dateStr);
                } else if (!isDisabled) {
                  onToggleDay(dateStr);
                }
              }}
            >
              {day}
            </div>
          );
        }

        return (
          <div key={monthName} className="month-card">
            <h3>{monthName}</h3>
            <div className="weekday-headers">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="days-grid">{cells}</div>
          </div>
        );
      })}
    </div>
  );
}
