import React from 'react';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  onChange: (settings: Partial<UserSettings>) => void;
}

export default function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      <div className="settings-grid">
        <div className="field">
          <label>Accrual per paycheck</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={settings.accrual_rate || ''}
            placeholder="0 hrs"
            onChange={(e) => onChange({ accrual_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Current PTO balance</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={settings.current_hours || ''}
            placeholder="0 hrs"
            onChange={(e) => onChange({ current_hours: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Max accrual cap</label>
          <input
            type="number"
            step="1"
            min="0"
            value={settings.max_accrual || ''}
            placeholder="No limit (hrs)"
            onChange={(e) => onChange({ max_accrual: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Hours per workday</label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={settings.hours_per_day || ''}
            placeholder="8 hrs"
            onChange={(e) => onChange({ hours_per_day: parseFloat(e.target.value) || 8 })}
          />
        </div>
        <div className="field">
          <label>Buffer days</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={settings.buffer_days || ''}
            placeholder="0 days"
            onChange={(e) => onChange({ buffer_days: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Pay frequency</label>
          <select
            value={settings.pay_frequency || 'biweekly'}
            onChange={(e) => onChange({ pay_frequency: e.target.value as UserSettings['pay_frequency'] })}
          >
            <option value="weekly">Weekly (52/yr)</option>
            <option value="biweekly">Biweekly (26/yr)</option>
            <option value="semimonthly">Semi-monthly (24/yr)</option>
            <option value="monthly">Monthly (12/yr)</option>
          </select>
        </div>
        <div className="field">
          <label>Birthday</label>
          <input
            type="text"
            placeholder="MM-DD"
            maxLength={5}
            value={settings.birthday || ''}
            onChange={(e) => onChange({ birthday: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Anniversary</label>
          <input
            type="text"
            placeholder="MM-DD"
            maxLength={5}
            value={settings.anniversary || ''}
            onChange={(e) => onChange({ anniversary: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
