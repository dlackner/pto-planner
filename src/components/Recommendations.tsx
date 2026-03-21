import React from 'react';
import { Recommendation } from '../types';

interface Props {
  recommendations: Recommendation[];
  enabled: Set<string>;
  onToggle: (key: string, enabled: boolean) => void;
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}/${String(y).slice(2)}`;
}

function dateRange(dates: string[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort();
  return `[${formatShortDate(sorted[0])} - ${formatShortDate(sorted[sorted.length - 1])}]`;
}

export default function Recommendations({ recommendations, enabled, onToggle }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="recommendations">
      <h2>Suggested Time Off</h2>
      {recommendations.map((rec) => (
        <div key={rec.key} className="rec-item">
          <div className="rec-info">
            <div className="rec-label">{rec.label} <span className="rec-dates">{dateRange(rec.dates)}</span></div>
            <div className="rec-desc">{rec.description}</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={enabled.has(rec.key)}
              onChange={(e) => onToggle(rec.key, e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      ))}
    </div>
  );
}
