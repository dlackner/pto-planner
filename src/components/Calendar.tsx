import React, { useState, useCallback, useRef } from 'react';

interface Props {
  year: number;
  selectedDays: Set<string>;
  holidayDates: Set<string>;
  holidayNames: Map<string, string>;
  recommendedDates: Set<string>;
  recommendedNames: Map<string, string>;
  overBudgetDates: Set<string>;
  disabledDates: Set<string>;
  onToggleDay: (date: string) => void;
  onToggleDays: (dates: string[]) => void;
  getBalanceAtDate: (date: string) => number;
  hoursPerDay: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Calendar({
  year,
  selectedDays,
  holidayDates,
  holidayNames,
  recommendedDates,
  recommendedNames,
  overBudgetDates,
  disabledDates,
  onToggleDay,
  onToggleDays,
  getBalanceAtDate,
  hoursPerDay,
}: Props) {
  const now = new Date();
  const today = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Inspected date (right-click or long-press to inspect balance)
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);

  // Drag-to-select state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [dragDates, setDragDates] = useState<Set<string>>(new Set());
  const dragRef = useRef(false);

  // Long-press state for mobile inspector
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const canSelect = useCallback((dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isPast = dateStr < today;
    return !isPast && !isWeekend && !holidayDates.has(dateStr) && !disabledDates.has(dateStr);
  }, [today, holidayDates, disabledDates]);

  const handleMouseDown = useCallback((dateStr: string) => {
    if (!canSelect(dateStr)) return;
    const isCurrentlySelected = selectedDays.has(dateStr) || recommendedDates.has(dateStr);
    const mode = isCurrentlySelected ? 'deselect' : 'select';
    setDragMode(mode);
    setIsDragging(true);
    dragRef.current = true;
    setDragDates(new Set([dateStr]));
  }, [canSelect, selectedDays, recommendedDates]);

  const handleMouseEnter = useCallback((dateStr: string) => {
    if (!dragRef.current) return;
    if (!canSelect(dateStr)) return;
    setDragDates(prev => {
      const next = new Set(prev);
      next.add(dateStr);
      return next;
    });
  }, [canSelect]);

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setIsDragging(false);

    const dates = Array.from(dragDates);
    if (dates.length === 1) {
      onToggleDay(dates[0]);
    } else if (dates.length > 1) {
      if (dragMode === 'select') {
        const toSelect = dates.filter(d => !selectedDays.has(d) && !recommendedDates.has(d));
        if (toSelect.length > 0) onToggleDays(toSelect);
      } else {
        const toDeselect = dates.filter(d => selectedDays.has(d));
        if (toDeselect.length > 0) onToggleDays(toDeselect);
      }
    }
    setDragDates(new Set());
  }, [dragDates, dragMode, selectedDays, recommendedDates, onToggleDay, onToggleDays]);

  // Global mouseup listener
  React.useEffect(() => {
    const onUp = () => {
      if (dragRef.current) handleMouseUp();
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [handleMouseUp]);

  // Filter to only show current month onward (for current year) or all months (future years)
  const visibleMonths = MONTHS
    .map((name, idx) => ({ name, idx }))
    .filter(({ idx }) => year > currentYear || idx >= currentMonth);

  return (
    <>
      {inspectedDate && inspectedDate >= today && (
        <div className="balance-inspector">
          <div className="balance-inspector-content">
            <span className="balance-inspector-date">{formatDisplayDate(inspectedDate)}</span>
            <span className="balance-inspector-balance">
              {(() => {
                const bal = getBalanceAtDate(inspectedDate);
                const days = hoursPerDay > 0 ? bal / hoursPerDay : 0;
                return `Balance: ${bal.toFixed(1)}h / ${days.toFixed(1)}d`;
              })()}
            </span>
          </div>
          <button className="balance-inspector-close" onClick={() => setInspectedDate(null)}>
            Dismiss
          </button>
        </div>
      )}
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
            const isDragTarget = isDragging && dragDates.has(dateStr);
            const isInspected = inspectedDate === dateStr;

            let className = 'day-cell';
            if (isPast) className += ' weekend';
            else if (isWeekend) className += ' weekend';
            else if (isHoliday) className += ' holiday';
            else if (isRecommended) {
              className += ' recommended';
              if (isOverBudget) className += ' over-budget';
            } else if (isSelected) {
              className += ' selected-pto';
              if (isOverBudget) className += ' over-budget';
            }
            if (isDisabled && !isSelected) className += ' disabled';
            if (isToday) className += ' today';
            if (isInspected) className += ' inspected';
            if (isDragTarget && !isPast && !isWeekend && !isHoliday) {
              className += dragMode === 'select' ? ' drag-select' : ' drag-deselect';
            }

            // Label for holiday or suggested day
            let label: string | undefined;
            if (isHoliday) {
              label = holidayNames.get(dateStr);
            } else if (isRecommended) {
              label = recommendedNames.get(dateStr);
            }

            const title = isHoliday
              ? holidayNames.get(dateStr) || 'Holiday'
              : isSelected && isOverBudget
              ? 'Over budget'
              : isRecommended
              ? recommendedNames.get(dateStr) || 'Suggested day off'
              : undefined;

            cells.push(
              <div
                key={day}
                className={className}
                title={title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (e.button === 0) handleMouseDown(dateStr);
                }}
                onMouseEnter={() => handleMouseEnter(dateStr)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isPast && !isWeekend) {
                    setInspectedDate(prev => prev === dateStr ? null : dateStr);
                  }
                }}
                onTouchStart={() => {
                  longPressTriggered.current = false;
                  longPressTimer.current = setTimeout(() => {
                    longPressTriggered.current = true;
                    if (!isPast && !isWeekend) {
                      setInspectedDate(prev => prev === dateStr ? null : dateStr);
                    }
                  }, 500);
                }}
                onTouchEnd={(e) => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                  if (longPressTriggered.current) {
                    e.preventDefault();
                  }
                }}
                onTouchMove={() => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
              >
                <span className="day-number">{day}</span>
                {label && <span className="day-label">{label}</span>}
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
    </>
  );
}
