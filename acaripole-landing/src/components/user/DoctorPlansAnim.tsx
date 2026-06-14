import React from 'react';
import { motion } from 'framer-motion';

export const DoctorPlansAnim = ({ size = 160, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        <g transform="translate(12.5, 30) scale(0.9)">
          {/* Stairs (3 steps) */}
          <g stroke="#B0A08C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <line x1="20" y1="180" x2="80" y2="180" />
            <line x1="80" y1="180" x2="80" y2="140" />
            <line x1="80" y1="140" x2="140" y2="140" />
            <line x1="140" y1="140" x2="140" y2="100" />
            <line x1="140" y1="100" x2="200" y2="100" />
            <line x1="200" y1="100" x2="200" y2="200" />
          </g>

          {/* Doctor Animation Group */}
          <motion.g 
            stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            initial={{ x: -20, y: 30, opacity: 0 }}
            animate={{ x: [ -20, -20, 40, 40, 100, 100 ], y: [ 30, 30, -10, -10, -50, -50 ], opacity: 1 }}
            transition={{ duration: 4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut", repeatDelay: 5 }}
          >
            {/* Head */}
            <circle cx="50" cy="70" r="14" fill="#F5EDE1" />
            
            {/* Face looking forward */}
            <path d="M 55 68 Q 60 72 55 76" strokeWidth="2.5" />
            <circle cx="53" cy="65" r="1.5" fill={color} stroke="none" />
            <circle cx="60" cy="65" r="1.5" fill={color} stroke="none" />

            {/* Hair (Female indicator) */}
            <path d="M 36 70 Q 36 90 42 85" strokeWidth="4" />
            <path d="M 64 70 Q 64 90 58 85" strokeWidth="4" />

            {/* Doctor Coat / Body */}
            <path d="M 40 84 L 30 135 L 70 135 L 60 84 Z" fill="#FFFFFF" strokeWidth="4" />
            
            {/* Stethoscope */}
            <path d="M 40 84 Q 50 100 60 84" stroke="#5C3A28" strokeWidth="2.5" />
            <line x1="50" y1="92" x2="50" y2="110" stroke="#5C3A28" strokeWidth="2.5" />
            <circle cx="50" cy="113" r="3" fill="#5C3A28" stroke="none" />
            
            {/* Legs (walking motion) */}
            <motion.line x1="40" y1="135" x2="35" y2="170" 
              animate={{ x2: [35, 45, 35, 45, 35, 45], y2: [170, 150, 170, 150, 170, 150] }}
              transition={{ duration: 4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
            />
            <motion.line x1="60" y1="135" x2="65" y2="170" 
              animate={{ x2: [65, 55, 65, 55, 65, 55], y2: [170, 170, 170, 170, 170, 170] }}
              transition={{ duration: 4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeInOut" }}
            />
            
            {/* Arms */}
            <path d="M 40 90 L 25 110 L 35 125" />
            <path d="M 60 90 L 75 110 L 65 125" />
          </motion.g>

          {/* Star appears at the top */}
          <motion.g
            initial={{ opacity: 0, scale: 0, rotate: -45 }}
            animate={{ opacity: [0, 0, 0, 0, 0, 1], scale: [0, 0, 0, 0, 0, 1], rotate: [0, 0, 0, 0, 0, 0] }}
            transition={{ duration: 4, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "easeOut", type: "spring" }}
          >
            <path d="M 170 -30 L 173 -15 L 188 -15 L 176 -5 L 180 10 L 170 0 L 160 10 L 164 -5 L 152 -15 L 167 -15 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />
            
            {/* Sparkles around star */}
            <motion.path d="M 170 -40 L 170 -45" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 4.2, duration: 1, repeat: Infinity, repeatDelay: 1 }} />
            <motion.path d="M 190 -20 L 195 -25" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 4.3, duration: 1, repeat: Infinity, repeatDelay: 1 }} />
            <motion.path d="M 150 -20 L 145 -25" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 4.4, duration: 1, repeat: Infinity, repeatDelay: 1 }} />
          </motion.g>
        </g>

      </svg>
    </div>
  );
};
