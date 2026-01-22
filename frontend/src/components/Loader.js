import React, { useState, useEffect } from 'react';
import './Loader.css';

const Loader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // 2.5 seconds to reach 100%
    const interval = 30;
    const increment = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const radius = 60;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="global-loader">
      <div className="loader-content">
        {/* Progress Ring */}
        <div className="progress-ring-container">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="progress-ring"
          >
            {/* Background circle */}
            <circle
              stroke="rgba(255, 255, 255, 0.2)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {/* Progress circle */}
            <circle
              stroke="url(#gradient)"
              fill="transparent"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="progress-circle"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e0e7ff" />
              </linearGradient>
            </defs>
          </svg>
          {/* Percentage text */}
          <div className="progress-text">
            <span className="progress-number">{Math.round(progress)}</span>
            <span className="progress-percent">%</span>
          </div>
        </div>

        {/* Branding */}
        <h2 className="loader-title">VAG Training</h2>
        <p className="loader-subtitle">Loading your experience...</p>
      </div>
    </div>
  );
};

export default Loader;
