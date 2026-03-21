import React from 'react';
import { Recommendation } from '../types';

interface Props {
  recommendations: Recommendation[];
  enabled: Set<string>;
  onToggle: (key: string, enabled: boolean) => void;
}

export default function Recommendations({ recommendations, enabled, onToggle }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="recommendations">
      <h2>Suggested Time Off</h2>
      {recommendations.map((rec) => (
        <div key={rec.key} className="rec-item">
          <div className="rec-info">
            <div className="rec-label">{rec.label}</div>
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
