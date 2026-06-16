import React from 'react';
import { motion } from 'framer-motion';

export const StickmanForm = ({ size = 120, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Clipboard back */}
        <rect x="110" y="80" width="60" height="80" rx="4" fill="#E6D9C7" />
        {/* Paper */}
        <rect x="115" y="85" width="50" height="70" rx="2" fill="#FFFFFF" />
        {/* Clip */}
        <rect x="130" y="75" width="20" height="10" rx="3" fill="#A09990" />
        
        {/* Lines on paper */}
        <line x1="125" y1="100" x2="155" y2="100" stroke="#B0A08C" strokeWidth="3" strokeLinecap="round" />
        <line x1="125" y1="115" x2="155" y2="115" stroke="#B0A08C" strokeWidth="3" strokeLinecap="round" />
        <line x1="125" y1="130" x2="145" y2="130" stroke="#B0A08C" strokeWidth="3" strokeLinecap="round" />
        
        {/* Stickman Doctora */}
        <g stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          
          {/* Hair Bun */}
          <circle cx="53" cy="53" r="8" fill={color} stroke="none" />
          
          {/* Head */}
          <circle cx="70" cy="60" r="16" fill="#F5EDE1" />
          
          {/* Happy Face */}
          <g stroke={color} strokeWidth="2.5" fill="none">
            {/* Eyes */}
            <path d="M 64 56 Q 66 54 68 56" />
            <path d="M 76 56 Q 78 54 80 56" />
            {/* Smile */}
            <path d="M 66 63 Q 72 68 78 63" />
          </g>

          {/* Doctor Coat / Body */}
          <path d="M 60 78 L 50 135 L 90 135 L 80 78 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 60 78 Q 70 95 80 78" stroke="#5C3A28" strokeWidth="3" />
          <line x1="70" y1="88" x2="70" y2="105" stroke="#5C3A28" strokeWidth="3" />
          <circle cx="70" cy="108" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="60" y1="135" x2="55" y2="180" />
          <line x1="80" y1="135" x2="85" y2="180" />
          
          {/* Left Arm (on hip) */}
          <path d="M 60 85 L 45 100 L 55 120" />
          
          {/* Right Arm (Writing) */}
          <motion.g
            style={{ transformOrigin: '80px 85px' }}
            animate={{ 
              rotate: [0, -8, 2, -5, 0],
              y: [0, -2, 1, -1, 0]
            }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 80 85 Q 100 95 120 120" />
            {/* Pen */}
            <line x1="115" y1="115" x2="128" y2="128" stroke="#D32F2F" strokeWidth="4" />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};
