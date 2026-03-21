import React from 'react';

interface Props {
  currentBalanceHrs: number;
  totalSelected: number;
  totalAccrualHrs: number;
  projectedBalanceHrs: number;
  hoursPerDay: number;
  maxAccrual: number;
}

export default function PtoSummary({
  currentBalanceHrs,
  totalSelected,
  totalAccrualHrs,
  projectedBalanceHrs,
  hoursPerDay,
  maxAccrual,
}: Props) {
  const currentDays = hoursPerDay > 0 ? currentBalanceHrs / hoursPerDay : 0;
  const projectedDays = hoursPerDay > 0 ? projectedBalanceHrs / hoursPerDay : 0;
  const accrualDays = hoursPerDay > 0 ? totalAccrualHrs / hoursPerDay : 0;

  return (
    <div className="pto-summary">
      <div className="stat">
        <span className="stat-label">Current Balance</span>
        <span className="stat-value">
          {currentBalanceHrs.toFixed(1)}h
          <span className="stat-sub"> / {currentDays.toFixed(1)}d</span>
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Year Accrual</span>
        <span className="stat-value">
          {totalAccrualHrs.toFixed(1)}h
          <span className="stat-sub"> / {accrualDays.toFixed(1)}d</span>
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Days Planned</span>
        <span className="stat-value">{totalSelected}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Projected Balance</span>
        <span className={`stat-value ${projectedBalanceHrs >= 0 ? 'positive' : 'negative'}`}>
          {projectedBalanceHrs.toFixed(1)}h
          <span className="stat-sub"> / {projectedDays.toFixed(1)}d</span>
        </span>
      </div>
      {maxAccrual > 0 && (
        <div className="stat">
          <span className="stat-label">Max Accrual</span>
          <span className="stat-value">{maxAccrual.toFixed(0)}h</span>
        </div>
      )}
    </div>
  );
}
