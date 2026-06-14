import React from 'react';
import { motion } from 'framer-motion';

export const DoctorCalendarAnim = ({ size = 120, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* Calendar Back */}
        <rect x="110" y="50" width="70" height="80" rx="6" fill="#FFFFFF" stroke="#E6D9C7" strokeWidth="4" />
        {/* Calendar Top Header */}
        <rect x="110" y="50" width="70" height="20" rx="6" fill="#D32F2F" stroke="#D32F2F" />
        
        {/* Calendar Rings */}
        <line x1="125" y1="40" x2="125" y2="55" stroke="#A09990" strokeWidth="4" strokeLinecap="round" />
        <line x1="165" y1="40" x2="165" y2="55" stroke="#A09990" strokeWidth="4" strokeLinecap="round" />
        
        {/* Calendar Grid Lines */}
        <line x1="120" y1="80" x2="170" y2="80" stroke="#E6D9C7" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="95" x2="170" y2="95" stroke="#E6D9C7" strokeWidth="3" strokeLinecap="round" />
        <line x1="120" y1="110" x2="170" y2="110" stroke="#E6D9C7" strokeWidth="3" strokeLinecap="round" />
        
        {/* Highlighted Day (Red Circle) */}
        <motion.circle 
          cx="155" cy="95" r="5" fill="#D32F2F"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        {/* Doctor Stickman */}
        <g stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Head */}
          <circle cx="60" cy="80" r="16" fill="#F5EDE1" />
          
          {/* Doctor Coat / Body */}
          <path d="M 50 100 L 40 145 L 80 145 L 70 100 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 50 100 Q 60 115 70 100" stroke="#5C3A28" strokeWidth="3" />
          <line x1="60" y1="108" x2="60" y2="125" stroke="#5C3A28" strokeWidth="3" />
          <circle cx="60" cy="128" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="50" y1="145" x2="45" y2="180" />
          <line x1="70" y1="145" x2="75" y2="180" />
          
          {/* Left Arm (idle on hip) */}
          <path d="M 50 105 L 35 120 L 45 135" />
          
          {/* Right Arm (Pointing) */}
          <motion.g
            style={{ transformOrigin: '70px 105px' }}
            animate={{ 
              rotate: [0, -12, 0, 8, 0],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 70 105 Q 90 95 140 95" />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};
