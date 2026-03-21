import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserSettings, PtoDay } from './types';
import { api } from './api';
import { getObservedHolidays, getRecommendations } from './holidays';
import Login from './components/Login';
import SettingsPanel from './components/SettingsPanel';
import PtoSummary from './components/PtoSummary';
import Recommendations from './components/Recommendations';
import Calendar from './components/Calendar';

const PAY_PERIODS: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

function getPayPeriodsRemainingInYear(frequency: string): number {
  const now = new Date();
  const year = now.getFullYear();
  const total = PAY_PERIODS[frequency] || 26;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 0).getTime()) / 86400000
  );
  const fraction = dayOfYear / 365;
  return Math.max(0, Math.round(total * (1 - fraction)));
}

// Compute how many pay periods occur between start of year and a given date
function payPeriodsUpToDate(date: string, frequency: string): number {
  const total = PAY_PERIODS[frequency] || 26;
  const d = new Date(date);
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return Math.floor(total * (dayOfYear / 365));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    user_id: 0,
    accrual_rate: 0,
    current_days: 0,
    sick_days: 0,
    pay_frequency: 'biweekly',
  });
  const [ptoDays, setPtoDays] = useState<PtoDay[]>([]);
  const [enabledRecs, setEnabledRecs] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(new Date().getFullYear());
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load user data
  useEffect(() => {
    if (!user) return;

    Promise.all([
      api.getSettings(user.id),
      api.getDays(user.id),
      api.getRecommendations(user.id),
    ]).then(([settingsRes, daysRes, recsRes]) => {
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      setPtoDays(daysRes.days || []);
      setEnabledRecs(new Set(recsRes.enabled || []));
    });
  }, [user]);

  // Debounced settings save
  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      const updated = { ...settings, ...partial };
      setSettings(updated);

      if (saveTimeout) clearTimeout(saveTimeout);
      const t = setTimeout(() => {
        if (user) {
          api.updateSettings(user.id, updated);
        }
      }, 500);
      setSaveTimeout(t);
    },
    [settings, user, saveTimeout]
  );

  // Holidays
  const holidays = useMemo(() => getObservedHolidays(year), [year]);
  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayNames = useMemo(
    () => new Map(holidays.map((h) => [h.date, h.name])),
    [holidays]
  );

  // Recommendations
  const recommendations = useMemo(() => getRecommendations(year), [year]);
  const recommendedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const rec of recommendations) {
      if (enabledRecs.has(rec.key)) {
        rec.dates.forEach((d) => dates.add(d));
      }
    }
    return dates;
  }, [recommendations, enabledRecs]);

  // Selected PTO days for current year
  const selectedDaysThisYear = useMemo(() => {
    const set = new Set<string>();
    for (const day of ptoDays) {
      if (day.date.startsWith(`${year}-`)) {
        set.add(day.date);
      }
    }
    // Add recommended dates that are enabled
    for (const d of recommendedDates) {
      set.add(d);
    }
    return set;
  }, [ptoDays, year, recommendedDates]);

  // PTO accumulation logic: compute which dates are over-budget
  // Sort selected dates chronologically, track running balance
  const { overBudgetDates, disabledDates, projectedBalance, totalAccrualThisYear } = useMemo(() => {
    const freq = settings.pay_frequency || 'biweekly';
    const rate = settings.accrual_rate || 0;
    const totalPeriods = PAY_PERIODS[freq] || 26;
    const totalAccrual = rate * totalPeriods;

    const sortedDates = Array.from(selectedDaysThisYear).sort();
    const overBudget = new Set<string>();
    let balance = settings.current_days || 0;
    let lastPeriodCount = 0;

    for (const date of sortedDates) {
      // Accrue PTO up to this date
      const periodsNow = payPeriodsUpToDate(date, freq);
      const newPeriods = periodsNow - lastPeriodCount;
      balance += newPeriods * rate;
      lastPeriodCount = periodsNow;

      // Use a day
      balance -= 1;

      if (balance < 0) {
        overBudget.add(date);
      }
    }

    // Projected end-of-year balance
    const periodsRemaining = totalPeriods - lastPeriodCount;
    const projected = balance + periodsRemaining * rate;

    // Disabled dates: if selecting another day would put you negative
    // Simple heuristic: disable if current running balance (at end of year) would go negative
    const disabled = new Set<string>();
    if (projected < 0) {
      // Mark all future unselected weekdays as disabled
      const today = new Date().toISOString().split('T')[0];
      // We won't precompute all dates - the calendar handles this via over-budget coloring
    }

    return {
      overBudgetDates: overBudget,
      disabledDates: disabled,
      projectedBalance: projected,
      totalAccrualThisYear: totalAccrual,
    };
  }, [selectedDaysThisYear, settings]);

  // Toggle a day
  const handleToggleDay = async (date: string) => {
    if (!user) return;

    // If it's a recommended-only day (not manually selected), add it manually
    const isManuallySelected = ptoDays.some((d) => d.date === date);
    const isRecommended = recommendedDates.has(date);

    if (isManuallySelected) {
      // Remove it
      setPtoDays((prev) => prev.filter((d) => d.date !== date));
      await api.toggleDay(user.id, date);
    } else if (!isRecommended || isManuallySelected) {
      // Check if adding would put this date over budget
      // We allow it but it will show red
      setPtoDays((prev) => [...prev, { id: 0, user_id: user.id, date, type: 'pto' }]);
      await api.toggleDay(user.id, date);
    } else {
      // It's a recommended date - toggle it on manually so it persists
      setPtoDays((prev) => [...prev, { id: 0, user_id: user.id, date, type: 'pto' }]);
      await api.toggleDay(user.id, date);
    }
  };

  // Toggle recommendation
  const handleToggleRec = async (key: string, enabled: boolean) => {
    if (!user) return;
    setEnabledRecs((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });

    // Add/remove the recommendation's dates from pto_days
    const rec = recommendations.find((r) => r.key === key);
    if (rec) {
      for (const date of rec.dates) {
        const exists = ptoDays.some((d) => d.date === date);
        if (enabled && !exists) {
          setPtoDays((prev) => [...prev, { id: 0, user_id: user.id, date, type: 'pto' }]);
          await api.toggleDay(user.id, date, 'pto');
        } else if (!enabled && exists) {
          setPtoDays((prev) => prev.filter((d) => d.date !== date));
          await api.toggleDay(user.id, date, 'pto');
        }
      }
    }

    await api.toggleRecommendation(user.id, key, enabled);
  };

  const handleLogout = () => {
    setUser(null);
    setSettings({
      user_id: 0,
      accrual_rate: 0,
      current_days: 0,
      sick_days: 0,
      pay_frequency: 'biweekly',
    });
    setPtoDays([]);
    setEnabledRecs(new Set());
  };

  if (!user) {
    return (
      <div className="app">
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>PTO Planner</h1>
        <div className="header-right">
          <span>{user.name}</span>
          <button className="secondary" onClick={handleLogout}>
            Switch User
          </button>
        </div>
      </div>

      <SettingsPanel settings={settings} onChange={updateSettings} />

      <PtoSummary
        currentBalance={settings.current_days || 0}
        totalSelected={selectedDaysThisYear.size}
        totalAccrualThisYear={totalAccrualThisYear}
        projectedBalance={projectedBalance}
        sickDays={settings.sick_days || 0}
      />

      <Recommendations
        recommendations={recommendations}
        enabled={enabledRecs}
        onToggle={handleToggleRec}
      />

      <div className="legend">
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: 'var(--green-light)', border: '1px solid var(--green)' }} />
          <span>PTO day</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: 'var(--red-light)', border: '1px solid var(--red)' }} />
          <span>Over budget</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: 'var(--blue-light)', border: '1px solid var(--blue)' }} />
          <span>Suggested</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: 'var(--holiday-light)', border: '1px solid var(--holiday)' }} />
          <span>Holiday</span>
        </div>
      </div>

      <div className="year-nav">
        <button className="secondary" onClick={() => setYear((y) => y - 1)}>
          Prev
        </button>
        <span>{year}</span>
        <button className="secondary" onClick={() => setYear((y) => y + 1)}>
          Next
        </button>
      </div>

      <Calendar
        year={year}
        selectedDays={selectedDaysThisYear}
        holidayDates={holidayDates}
        holidayNames={holidayNames}
        recommendedDates={recommendedDates}
        overBudgetDates={overBudgetDates}
        disabledDates={disabledDates}
        onToggleDay={handleToggleDay}
      />
    </div>
  );
}
