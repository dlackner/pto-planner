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
          <label>Days per paycheck</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={settings.accrual_rate || ''}
            placeholder="0.00"
            onChange={(e) => onChange({ accrual_rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Current PTO balance</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={settings.current_days || ''}
            placeholder="0"
            onChange={(e) => onChange({ current_days: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="field">
          <label>Sick days</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={settings.sick_days || ''}
            placeholder="0"
            onChange={(e) => onChange({ sick_days: parseFloat(e.target.value) || 0 })}
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
      </div>
    </div>
  );
}
