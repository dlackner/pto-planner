import { Recommendation } from './types';

// US Federal Holidays for a given year
export function getObservedHolidays(year: number): { date: string; name: string }[] {
  const holidays: { date: string; name: string }[] = [];

  // New Year's Day - Jan 1
  holidays.push({ date: observedDate(year, 0, 1), name: "New Year's Day" });

  // MLK Day - Third Monday of January
  holidays.push({ date: nthWeekday(year, 0, 1, 3), name: 'MLK Day' });

  // Presidents' Day - Third Monday of February
  holidays.push({ date: nthWeekday(year, 1, 1, 3), name: "Presidents' Day" });

  // Memorial Day - Last Monday of May
  holidays.push({ date: lastWeekday(year, 4, 1), name: 'Memorial Day' });

  // Juneteenth - June 19
  holidays.push({ date: observedDate(year, 5, 19), name: 'Juneteenth' });

  // Independence Day - July 4
  holidays.push({ date: observedDate(year, 6, 4), name: 'Independence Day' });

  // Labor Day - First Monday of September
  holidays.push({ date: nthWeekday(year, 8, 1, 1), name: 'Labor Day' });

  // Columbus Day - Second Monday of October
  holidays.push({ date: nthWeekday(year, 9, 1, 2), name: 'Columbus Day' });

  // Veterans Day - November 11
  holidays.push({ date: observedDate(year, 10, 11), name: 'Veterans Day' });

  // Thanksgiving - Fourth Thursday of November
  holidays.push({ date: nthWeekday(year, 10, 4, 4), name: 'Thanksgiving' });

  // Christmas Day - December 25
  holidays.push({ date: observedDate(year, 11, 25), name: 'Christmas Day' });

  return holidays;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function observedDate(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1); // Sunday -> Monday
  if (dow === 6) d.setDate(d.getDate() - 1); // Saturday -> Friday
  return formatDate(d);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(year, month, 1);
  let day = first.getDay();
  let diff = (weekday - day + 7) % 7;
  const date = 1 + diff + (n - 1) * 7;
  return formatDate(new Date(year, month, date));
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const last = new Date(year, month + 1, 0);
  let day = last.getDay();
  let diff = (day - weekday + 7) % 7;
  return formatDate(new Date(year, month, last.getDate() - diff));
}

// Generate smart recommendations for a given year
export function getRecommendations(year: number): Recommendation[] {
  const holidays = getObservedHolidays(year);
  const holidayDates = new Set(holidays.map(h => h.date));
  const recommendations: Recommendation[] = [];

  // Christmas to New Year's block
  {
    const dates: string[] = [];
    const christmasDate = holidays.find(h => h.name === 'Christmas Day')?.date;
    if (christmasDate) {
      // Find weekdays between Dec 26 and Dec 31 that aren't holidays
      for (let d = 26; d <= 31; d++) {
        const dt = new Date(year, 11, d);
        const ds = formatDate(dt);
        const dow = dt.getDay();
        if (dow > 0 && dow < 6 && !holidayDates.has(ds)) {
          dates.push(ds);
        }
      }
    }
    if (dates.length > 0) {
      recommendations.push({
        key: `christmas-newyears-${year}`,
        label: 'Christmas to New Years',
        description: `${dates.length} day${dates.length > 1 ? 's' : ''} off between Christmas and New Year's`,
        dates,
      });
    }
  }

  // Thanksgiving week (Mon-Wed before Thanksgiving)
  {
    const thanksgivingDate = holidays.find(h => h.name === 'Thanksgiving')?.date;
    if (thanksgivingDate) {
      const tg = new Date(thanksgivingDate);
      const dates: string[] = [];
      // Day after Thanksgiving (Friday)
      const fri = new Date(tg);
      fri.setDate(fri.getDate() + 1);
      const friStr = formatDate(fri);
      if (!holidayDates.has(friStr)) dates.push(friStr);
      // Mon, Tue, Wed before
      for (let i = 3; i >= 1; i--) {
        const d = new Date(tg);
        d.setDate(d.getDate() - i);
        const ds = formatDate(d);
        if (!holidayDates.has(ds)) dates.push(ds);
      }
      dates.sort();
      recommendations.push({
        key: `thanksgiving-week-${year}`,
        label: 'Thanksgiving Week',
        description: `${dates.length} days for a full week off at Thanksgiving`,
        dates,
      });
    }
  }

  // Bridge days: if a holiday falls on Tuesday, suggest Monday off; Thursday, suggest Friday off
  for (const holiday of holidays) {
    const hd = new Date(holiday.date);
    const dow = hd.getDay();

    if (dow === 2) {
      // Tuesday holiday -> take Monday off
      const monday = new Date(hd);
      monday.setDate(monday.getDate() - 1);
      const ms = formatDate(monday);
      if (!holidayDates.has(ms)) {
        recommendations.push({
          key: `bridge-${holiday.date}`,
          label: `Bridge: ${holiday.name}`,
          description: `Take Monday off for a 4-day weekend`,
          dates: [ms],
        });
      }
    }

    if (dow === 4) {
      // Thursday holiday -> take Friday off
      const friday = new Date(hd);
      friday.setDate(friday.getDate() + 1);
      const fs = formatDate(friday);
      if (!holidayDates.has(fs)) {
        recommendations.push({
          key: `bridge-${holiday.date}`,
          label: `Bridge: ${holiday.name}`,
          description: `Take Friday off for a 4-day weekend`,
          dates: [fs],
        });
      }
    }
  }

  // July 4th week - if it falls mid-week, suggest surrounding days
  {
    const july4 = holidays.find(h => h.name === 'Independence Day')?.date;
    if (july4) {
      const j4 = new Date(july4);
      const dow = j4.getDay();
      if (dow === 3) {
        // Wednesday - suggest Mon, Tue, Thu, Fri
        const dates: string[] = [];
        for (let offset = -2; offset <= 2; offset++) {
          if (offset === 0) continue;
          const d = new Date(j4);
          d.setDate(d.getDate() + offset);
          const ds = formatDate(d);
          if (d.getDay() > 0 && d.getDay() < 6 && !holidayDates.has(ds)) {
            dates.push(ds);
          }
        }
        if (dates.length > 0) {
          recommendations.push({
            key: `july4-week-${year}`,
            label: 'July 4th Week',
            description: `${dates.length} days for a full week around Independence Day`,
            dates,
          });
        }
      }
    }
  }

  return recommendations;
}
