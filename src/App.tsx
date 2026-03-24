import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserSettings, PtoDay } from './types';
import { api } from './api';
import { getObservedHolidays, getRecommendations } from './holidays';
import { downloadICS } from './ics';
import Login from './components/Login';
import SettingsPanel from './components/SettingsPanel';
import PtoSummary from './components/PtoSummary';
import Recommendations from './components/Recommendations';
import Calendar from './components/Calendar';
import Instructions from './components/Instructions';

const PAY_PERIODS: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

// Compute how many pay periods occur between two dates
function payPeriodsBetween(fromDate: Date, toDate: Date, frequency: string): number {
  const total = PAY_PERIODS[frequency] || 26;
  const year = fromDate.getFullYear();
  const daysInYear = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  const startDay = Math.floor((fromDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
  const endDay = Math.floor((toDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000);
  const periodsAtStart = Math.floor(total * (startDay / daysInYear));
  const periodsAtEnd = Math.floor(total * (endDay / daysInYear));
  return Math.max(0, periodsAtEnd - periodsAtStart);
}

const DEFAULT_SETTINGS: UserSettings = {
  user_id: 0,
  accrual_rate: 0,
  current_hours: 0,
  sick_days: 0,
  buffer_days: 0,
  hours_per_day: 8,
  max_accrual: 0,
  pay_frequency: 'biweekly',
  birthday: '',
  anniversary: '',
};

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('pto-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS });
  const [ptoDays, setPtoDays] = useState<PtoDay[]>([]);
  const [enabledRecs, setEnabledRecs] = useState<Set<string>>(new Set());
  const [year, setYear] = useState(new Date().getFullYear());
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pto-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  const isLoggedIn = user !== null || guestMode;

  // Load user data (only when logged in with account)
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

      if (guestMode) return; // Don't save in guest mode

      if (saveTimeout) clearTimeout(saveTimeout);
      const t = setTimeout(() => {
        if (user) {
          api.updateSettings(user.id, updated);
        }
      }, 500);
      setSaveTimeout(t);
    },
    [settings, user, saveTimeout, guestMode]
  );

  // Holidays
  const holidays = useMemo(() => getObservedHolidays(year), [year]);
  const holidayDates = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayNames = useMemo(
    () => new Map(holidays.map((h) => [h.date, h.name])),
    [holidays]
  );

  // Recommendations
  const personalDates = useMemo(() => {
    const dates: { label: string; mmdd: string }[] = [];
    if (settings.birthday) dates.push({ label: 'Birthday', mmdd: settings.birthday });
    if (settings.anniversary) dates.push({ label: 'Anniversary', mmdd: settings.anniversary });
    return dates;
  }, [settings.birthday, settings.anniversary]);

  const recommendations = useMemo(() => getRecommendations(year, personalDates), [year, personalDates]);
  const recommendedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const rec of recommendations) {
      if (enabledRecs.has(rec.key)) {
        rec.dates.forEach((d) => dates.add(d));
      }
    }
    return dates;
  }, [recommendations, enabledRecs]);

  // Map of date -> recommendation label for calendar labels
  const recommendedNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const rec of recommendations) {
      if (enabledRecs.has(rec.key)) {
        for (const d of rec.dates) {
          if (!names.has(d)) names.set(d, rec.label);
        }
      }
    }
    return names;
  }, [recommendations, enabledRecs]);

  // Dates already covered by enabled recommendations (for hiding overlapping recs)
  const coveredDates = useMemo(() => {
    const covered = new Set<string>();
    for (const rec of recommendations) {
      if (enabledRecs.has(rec.key)) {
        rec.dates.forEach(d => covered.add(d));
      }
    }
    return covered;
  }, [recommendations, enabledRecs]);

  // Filter recommendations: hide ones whose dates are fully covered by already-enabled recs
  const visibleRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      if (enabledRecs.has(rec.key)) return true; // always show enabled ones
      // Hide if all dates are already covered
      return rec.dates.some(d => !coveredDates.has(d));
    });
  }, [recommendations, enabledRecs, coveredDates]);

  // Manually selected PTO days for current year (not including recommendations)
  const selectedDaysThisYear = useMemo(() => {
    const set = new Set<string>();
    for (const day of ptoDays) {
      if (day.date.startsWith(`${year}-`)) {
        set.add(day.date);
      }
    }
    return set;
  }, [ptoDays, year]);

  // All planned days (manual + recommended) for budget calculation
  const allPlannedDays = useMemo(() => {
    const set = new Set(selectedDaysThisYear);
    for (const d of recommendedDates) {
      set.add(d);
    }
    return set;
  }, [selectedDaysThisYear, recommendedDates]);

  // PTO accumulation logic in HOURS with max accrual cap
  // current_hours = user's balance RIGHT NOW. We accrue forward from today.
  const { overBudgetDates, disabledDates, projectedBalanceHrs, totalAccrualHrs, balanceAtDate } = useMemo(() => {
    const freq = settings.pay_frequency || 'biweekly';
    const rateHrs = settings.accrual_rate || 0; // hours per paycheck
    const totalPeriods = PAY_PERIODS[freq] || 26;
    const totalAccrual = rateHrs * totalPeriods;
    const hrsPerDay = settings.hours_per_day || 8;
    const maxCap = settings.max_accrual || 0; // 0 = no cap
    const bufferHrs = (settings.buffer_days || 0) * hrsPerDay;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Only process future PTO days (current_hours already reflects past usage)
    const futureDates = Array.from(allPlannedDays).filter(d => d >= todayStr).sort();
    const overBudget = new Set<string>();
    const balances = new Map<string, number>(); // date -> balance AFTER using that day

    let balanceHrs = (settings.current_hours || 0) - bufferHrs;
    let lastDate = today;

    for (const date of futureDates) {
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);

      // Accrue hours from last checkpoint to this date
      const newPeriods = payPeriodsBetween(lastDate, dateObj, freq);
      balanceHrs += newPeriods * rateHrs;

      // Apply max accrual cap
      if (maxCap > 0 && balanceHrs > maxCap) {
        balanceHrs = maxCap;
      }

      lastDate = dateObj;

      // Use a day (deduct hours)
      balanceHrs -= hrsPerDay;

      balances.set(date, balanceHrs);

      if (balanceHrs < 0) {
        overBudget.add(date);
      }
    }

    // Projected end-of-year balance: accrue from last PTO day (or today) to Dec 31
    const eoy = new Date(year, 11, 31);
    const remainingPeriods = payPeriodsBetween(lastDate, eoy, freq);
    let projected = balanceHrs + remainingPeriods * rateHrs;
    if (maxCap > 0 && projected > maxCap) {
      projected = maxCap;
    }

    const disabled = new Set<string>();

    return {
      overBudgetDates: overBudget,
      disabledDates: disabled,
      projectedBalanceHrs: projected,
      totalAccrualHrs: totalAccrual,
      balanceAtDate: balances,
    };
  }, [allPlannedDays, settings, year]);

  // Compute balance at any given date (accrual up to that date, minus PTO taken before it)
  const getBalanceAtDate = useCallback((targetDate: string): number => {
    const freq = settings.pay_frequency || 'biweekly';
    const rateHrs = settings.accrual_rate || 0;
    const hrsPerDay = settings.hours_per_day || 8;
    const maxCap = settings.max_accrual || 0;
    const bufferHrs = (settings.buffer_days || 0) * hrsPerDay;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (targetDate < todayStr) return 0; // past dates not meaningful

    const [ty, tm, td] = targetDate.split('-').map(Number);
    const targetObj = new Date(ty, tm - 1, td);

    // Get all PTO days before or on the target date (future only)
    const ptoBefore = Array.from(allPlannedDays).filter(d => d >= todayStr && d <= targetDate).sort();

    let balanceHrs = (settings.current_hours || 0) - bufferHrs;
    let lastDate = today;

    for (const date of ptoBefore) {
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const newPeriods = payPeriodsBetween(lastDate, dateObj, freq);
      balanceHrs += newPeriods * rateHrs;
      if (maxCap > 0 && balanceHrs > maxCap) balanceHrs = maxCap;
      lastDate = dateObj;
      balanceHrs -= hrsPerDay;
    }

    // Accrue remaining periods from last PTO day to target date
    if (lastDate < targetObj) {
      const remainingPeriods = payPeriodsBetween(lastDate, targetObj, freq);
      balanceHrs += remainingPeriods * rateHrs;
      if (maxCap > 0 && balanceHrs > maxCap) balanceHrs = maxCap;
    }

    return balanceHrs;
  }, [settings, allPlannedDays]);

  // Toggle a day
  const handleToggleDay = async (date: string) => {
    const isManuallySelected = ptoDays.some((d) => d.date === date);

    if (isManuallySelected) {
      setPtoDays((prev) => prev.filter((d) => d.date !== date));
      if (user) await api.toggleDay(user.id, date);
    } else {
      const userId = user?.id || 0;
      setPtoDays((prev) => [...prev, { id: 0, user_id: userId, date, type: 'pto' }]);
      if (user) await api.toggleDay(user.id, date);
    }
  };

  // Toggle multiple days at once (for drag-to-select)
  const handleToggleDays = async (dates: string[]) => {
    const userId = user?.id || 0;
    for (const date of dates) {
      const isManuallySelected = ptoDays.some((d) => d.date === date);
      if (isManuallySelected) {
        setPtoDays((prev) => prev.filter((d) => d.date !== date));
      } else {
        setPtoDays((prev) => [...prev, { id: 0, user_id: userId, date, type: 'pto' }]);
      }
      if (user) await api.toggleDay(user.id, date);
    }
  };

  // Toggle recommendation
  const handleToggleRec = async (key: string, enabled: boolean) => {
    setEnabledRecs((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });

    const rec = recommendations.find((r) => r.key === key);
    if (rec) {
      for (const date of rec.dates) {
        const exists = ptoDays.some((d) => d.date === date);
        if (enabled && !exists) {
          const userId = user?.id || 0;
          setPtoDays((prev) => [...prev, { id: 0, user_id: userId, date, type: 'pto' }]);
          if (user) await api.toggleDay(user.id, date, 'pto');
        } else if (!enabled && exists) {
          setPtoDays((prev) => prev.filter((d) => d.date !== date));
          if (user) await api.toggleDay(user.id, date, 'pto');
        }
      }
    }

    if (user) await api.toggleRecommendation(user.id, key, enabled);
  };

  const handleLogout = () => {
    setUser(null);
    setGuestMode(false);
    setSettings({ ...DEFAULT_SETTINGS });
    setPtoDays([]);
    setEnabledRecs(new Set());
  };

  const shouldShowInstructions = () => {
    return localStorage.getItem('pto-skip-instructions') !== '1';
  };

  const handleLogin = (u: User) => {
    setUser(u);
    if (shouldShowInstructions()) {
      setShowInstructions(true);
    }
  };

  const handleSkip = () => {
    setGuestMode(true);
    if (shouldShowInstructions()) {
      setShowInstructions(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="app">
        <Login onLogin={handleLogin} onSkip={handleSkip} theme={theme} onToggleTheme={toggleTheme} />
      </div>
    );
  }

  if (showInstructions) {
    return (
      <div className="app">
        <Instructions onContinue={() => setShowInstructions(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>PTO Planner</h1>
        <div className="header-right">
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <span>{guestMode ? 'Guest' : user!.name}</span>
          <button className="secondary" onClick={handleLogout}>
            {guestMode ? 'Back' : 'Switch User'}
          </button>
        </div>
      </div>

      <SettingsPanel settings={settings} onChange={updateSettings} />

      <PtoSummary
        currentBalanceHrs={settings.current_hours || 0}
        totalSelected={allPlannedDays.size}
        totalAccrualHrs={totalAccrualHrs}
        projectedBalanceHrs={projectedBalanceHrs}
        hoursPerDay={settings.hours_per_day || 8}
        maxAccrual={settings.max_accrual || 0}
      />

      <Recommendations
        recommendations={visibleRecommendations}
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
        <button
          className="secondary"
          disabled={year <= new Date().getFullYear()}
          onClick={() => setYear((y) => y - 1)}
        >
          Prev
        </button>
        <span>{year}</span>
        <button className="secondary" onClick={() => setYear((y) => y + 1)}>
          Next
        </button>
        {allPlannedDays.size > 0 && (
          <button
            className="secondary export-btn"
            onClick={() =>
              downloadICS(
                Array.from(allPlannedDays),
                `pto-${year}.ics`
              )
            }
          >
            Export to Calendar
          </button>
        )}
      </div>

      <Calendar
        year={year}
        selectedDays={selectedDaysThisYear}
        holidayDates={holidayDates}
        holidayNames={holidayNames}
        recommendedDates={recommendedDates}
        recommendedNames={recommendedNames}
        overBudgetDates={overBudgetDates}
        disabledDates={disabledDates}
        onToggleDay={handleToggleDay}
        onToggleDays={handleToggleDays}
        getBalanceAtDate={getBalanceAtDate}
        hoursPerDay={settings.hours_per_day || 8}
      />
    </div>
  );
}
