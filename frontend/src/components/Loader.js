import React from 'react';
import './Loader.css';

const Loader = () => {
  return (
    <div className="global-loader">
      <div className="loader-content">
        <div className="loader-animation">
          <div className="loader-circle"></div>
          <div className="loader-circle"></div>
          <div className="loader-circle"></div>
        </div>
        <h2 className="loader-title">Student Feedback System</h2>
        <p className="loader-subtitle">Loading your experience...</p>
        <div className="loader-bar">
          <div className="loader-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
