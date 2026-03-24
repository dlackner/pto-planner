import React, { useState } from 'react';

interface Props {
  onContinue: () => void;
}

export default function Instructions({ onContinue }: Props) {
  const [dontShow, setDontShow] = useState(false);

  const handleContinue = () => {
    if (dontShow) {
      localStorage.setItem('pto-skip-instructions', '1');
    }
    onContinue();
  };

  return (
    <div className="instructions-page">
      <h1>How it works</h1>

      <div className="instructions-steps">
        <div className="instruction">
          <span className="instruction-num">1</span>
          <div>
            <strong>Set Up</strong>
            <span className="instruction-sep"> -- </span>
            enter your accrual rate, current balance, and pay frequency
          </div>
        </div>

        <div className="instruction">
          <span className="instruction-num">2</span>
          <div>
            <strong>Pick Days</strong>
            <span className="instruction-sep"> -- </span>
            click or drag on the calendar. green means affordable, red means over budget
          </div>
        </div>

        <div className="instruction">
          <span className="instruction-num">3</span>
          <div>
            <strong>Use Suggestions</strong>
            <span className="instruction-sep"> -- </span>
            toggle recommended days around holidays
            <ul className="instruction-sub">
              <li><strong>Bridge</strong> -- fills a gap between a holiday and the weekend</li>
              <li><strong>Extend</strong> -- adds days to build a longer break</li>
            </ul>
          </div>
        </div>

        <div className="instruction">
          <span className="instruction-num">4</span>
          <div>
            <strong>Check Balance</strong>
            <span className="instruction-sep"> -- </span>
            right-click any day (long-press on mobile) to see your projected balance
          </div>
        </div>

        <div className="instruction">
          <span className="instruction-num">5</span>
          <div>
            <strong>Export</strong>
            <span className="instruction-sep"> -- </span>
            download an .ics file to add your days to any calendar app
          </div>
        </div>
      </div>

      <div className="instructions-bottom">
        <button onClick={handleContinue}>Continue</button>
        <label className="instructions-dont-show">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          <span>Don't show this again</span>
        </label>
      </div>
    </div>
  );
}
