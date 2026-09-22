import React, { useState } from 'react';

export function NeonLoading({ text = '' }) {
  const [boost, setBoost] = useState(false);

  const handleClick = () => {
    setBoost(true);
    setTimeout(() => setBoost(false), 400);
  };

  return (
    <div className="neon-loading-backdrop">
      <div 
        className={`neon-logo ${boost ? 'neon-boost' : ''}`} 
        onClick={handleClick} 
        role="button" 
        aria-label="Loading Logo"
      >
        <svg className="neon-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* 135-degree gradient matching the teal-to-orange palette */}
            <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="35%" stopColor="#059669" />
              <stop offset="68%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Calendar Outline */}
          <g className="neon-path">
            <line x1="68" y1="36" x2="68" y2="52"/>
            <line x1="132" y1="36" x2="132" y2="52"/>
            <path d="M 44 80 
                     V 54 
                     A 14 14 0 0 1 58 40 
                     H 142 
                     A 14 14 0 0 1 156 54 
                     V 80 
                     M 44 80 
                     H 156 
                     M 156 80 
                     V 102 
                     M 44 80 
                     V 146 
                     A 14 14 0 0 0 58 160 
                     H 104"/>
          </g>

          {/* Faint guide track */}
          <path className="neon-path" 
                d="M 134 116
                   C 134 116, 126 104, 114 104
                   C 102 104, 94 114, 94 126
                   C 94 144, 114 160, 134 172
                   C 154 160, 174 144, 174 126
                   C 174 114, 166 104, 154 104
                   C 142 104, 134 116, 134 116 Z" 
                opacity="0.15" />

          {/* Running Line Heart */}
          <path className="neon-path heart-running-line" 
                d="M 134 116
                   C 134 116, 126 104, 114 104
                   C 102 104, 94 114, 94 126
                   C 94 144, 114 160, 134 172
                   C 154 160, 174 144, 174 126
                   C 174 114, 166 104, 154 104
                   C 142 104, 134 116, 134 116 Z" />
        </svg>
      </div>
      {text && <div className="neon-loading-text">{text}</div>}
    </div>
  );
}

export default NeonLoading;
