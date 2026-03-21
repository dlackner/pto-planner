import React from 'react';

interface Props {
  currentBalance: number;
  totalSelected: number;
  totalAccrualThisYear: number;
  projectedBalance: number;
  sickDays: number;
}

export default function PtoSummary({
  currentBalance,
  totalSelected,
  totalAccrualThisYear,
  projectedBalance,
  sickDays,
}: Props) {
  return (
    <div className="pto-summary">
      <div className="stat">
        <span className="stat-label">Current Balance</span>
        <span className="stat-value">{currentBalance.toFixed(1)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Year Accrual</span>
        <span className="stat-value">{totalAccrualThisYear.toFixed(1)}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Days Planned</span>
        <span className="stat-value">{totalSelected}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Projected Balance</span>
        <span className={`stat-value ${projectedBalance >= 0 ? 'positive' : 'negative'}`}>
          {projectedBalance.toFixed(1)}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Sick Days</span>
        <span className="stat-value">{sickDays.toFixed(1)}</span>
      </div>
    </div>
  );
}
