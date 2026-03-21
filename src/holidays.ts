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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse YYYY-MM-DD as local time (not UTC)
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
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
// personalDates: array of { label, mmdd } like { label: 'Birthday', mmdd: '03-15' }
export function getRecommendations(
  year: number,
  personalDates: { label: string; mmdd: string }[] = []
): Recommendation[] {
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
      const tg = parseDate(thanksgivingDate);
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

  // Bridge days: suggest extending any holiday into a long weekend
  for (const holiday of holidays) {
    const hd = parseDate(holiday.date);
    const dow = hd.getDay();

    if (dow === 1) {
      // Monday holiday -> take Friday before for a 4-day weekend
      const friday = new Date(hd);
      friday.setDate(friday.getDate() - 3);
      const fs = formatDate(friday);
      if (!holidayDates.has(fs)) {
        recommendations.push({
          key: `bridge-${holiday.date}`,
          label: `Extend: ${holiday.name}`,
          description: `Take Friday off for a 4-day weekend`,
          dates: [fs],
        });
      }
    }

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

    if (dow === 3) {
      // Wednesday holiday -> suggest Mon+Tue or Thu+Fri for a 5-day break
      const dates: string[] = [];
      for (const offset of [-2, -1, 1, 2]) {
        const d = new Date(hd);
        d.setDate(d.getDate() + offset);
        const ds = formatDate(d);
        if (d.getDay() > 0 && d.getDay() < 6 && !holidayDates.has(ds)) {
          dates.push(ds);
        }
      }
      if (dates.length > 0) {
        recommendations.push({
          key: `bridge-${holiday.date}`,
          label: `Extend: ${holiday.name}`,
          description: `${dates.length} days to build a week around ${holiday.name}`,
          dates,
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

    if (dow === 5) {
      // Friday holiday -> take Monday after for a 4-day weekend
      const monday = new Date(hd);
      monday.setDate(monday.getDate() + 3);
      const ms = formatDate(monday);
      if (!holidayDates.has(ms)) {
        recommendations.push({
          key: `bridge-${holiday.date}`,
          label: `Extend: ${holiday.name}`,
          description: `Take Monday off for a 4-day weekend`,
          dates: [ms],
        });
      }
    }
  }

  // July 4th week - suggest surrounding weekdays for a full week off
  {
    const july4 = holidays.find(h => h.name === 'Independence Day')?.date;
    if (july4) {
      const j4 = parseDate(july4);
      const dates: string[] = [];
      // Check Mon-Fri of the same week
      const dayOfWeek = j4.getDay();
      // Find Monday of that week
      const monday = new Date(j4);
      monday.setDate(monday.getDate() - (dayOfWeek - 1));
      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const ds = formatDate(d);
        if (!holidayDates.has(ds) && d.getDay() > 0 && d.getDay() < 6) {
          dates.push(ds);
        }
      }
      if (dates.length > 0) {
        recommendations.push({
          key: `july4-week-${year}`,
          label: 'July 4th Week',
          description: `${dates.length} day${dates.length > 1 ? 's' : ''} for a full week around Independence Day`,
          dates,
        });
      }
    }
  }

  // Personal dates (birthday, anniversary, etc.)
  for (const { label, mmdd } of personalDates) {
    if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) continue;
    const [mm, dd] = mmdd.split('-').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;

    const d = new Date(year, mm - 1, dd);
    const ds = formatDate(d);
    const dow = d.getDay();

    // If it falls on a weekend, suggest the nearest weekday
    let targetDate = ds;
    if (dow === 0) {
      const fri = new Date(d);
      fri.setDate(fri.getDate() - 2);
      targetDate = formatDate(fri);
    } else if (dow === 6) {
      const fri = new Date(d);
      fri.setDate(fri.getDate() - 1);
      targetDate = formatDate(fri);
    }

    if (!holidayDates.has(targetDate)) {
      recommendations.push({
        key: `personal-${label.toLowerCase()}-${year}`,
        label: label,
        description: `Take ${mmdd} off for your ${label.toLowerCase()}`,
        dates: [targetDate],
      });
    }
  }

  // Filter out past dates from recommendations
  const now = new Date();
  const todayStr = formatDate(now);
  return recommendations
    .map(rec => ({
      ...rec,
      dates: rec.dates.filter(d => d >= todayStr),
    }))
    .filter(rec => rec.dates.length > 0);
}
