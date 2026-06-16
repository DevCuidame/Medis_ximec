import React from 'react';
import { motion } from 'framer-motion';

export const DoctorFinanceAnim = ({ size = 150, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        {/* Background elements: Chart/Graph */}
        <g stroke="#E6D9C7" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Chart Axes */}
          <line x1="20" y1="150" x2="140" y2="150" />
          <line x1="20" y1="150" x2="20" y2="40" />
          
          {/* Bar Charts */}
          <rect x="35" y="100" width="20" height="50" fill="#F5EDE1" stroke="none" />
          <rect x="65" y="70" width="20" height="80" fill="#F5EDE1" stroke="none" />
          <rect x="95" y="40" width="20" height="110" fill="#F5EDE1" stroke="none" />
          
          {/* Trend Line (Upward) */}
          <motion.path 
            d="M 20 120 L 45 90 L 75 60 L 105 30 L 135 15" 
            stroke="#16A34A" 
            strokeWidth="4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        {/* Floating Coins */}
        {[
          { cx: 120, cy: 30, delay: 0 },
          { cx: 90, cy: 50, delay: 0.5 },
          { cx: 60, cy: 80, delay: 1 }
        ].map((coin, i) => (
          <motion.g 
            key={i}
            initial={{ y: 0, opacity: 0.8 }}
            animate={{ y: [-5, 5, -5], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, delay: coin.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx={coin.cx} cy={coin.cy} r="8" fill="#F59E0B" />
            <circle cx={coin.cx} cy={coin.cy} r="5" fill="none" stroke="#FEF3C7" strokeWidth="1.5" />
            <text x={coin.cx} y={coin.cy + 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FEF3C7">$</text>
          </motion.g>
        ))}

        {/* Ground */}
        <line x1="0" y1="190" x2="250" y2="190" stroke="#B0A08C" strokeWidth="4" strokeLinecap="round" />

        {/* Doctor */}
        <g stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Head */}
          <circle cx="180" cy="90" r="14" fill="#F5EDE1" />
          
          {/* Happy Face */}
          <path d="M 175 92 Q 180 97 185 92" strokeWidth="2.5" />
          <circle cx="175" cy="86" r="1.5" fill={color} stroke="none" />
          <circle cx="185" cy="86" r="1.5" fill={color} stroke="none" />

          {/* Hair (Female indicator) */}
          <path d="M 166 90 Q 166 110 172 105" strokeWidth="4" />
          <path d="M 194 90 Q 194 110 188 105" strokeWidth="4" />

          {/* Doctor Coat / Body */}
          <path d="M 170 104 L 160 155 L 200 155 L 190 104 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 170 104 Q 180 120 190 104" stroke="#5C3A28" strokeWidth="2.5" />
          <line x1="180" y1="112" x2="180" y2="130" stroke="#5C3A28" strokeWidth="2.5" />
          <circle cx="180" cy="133" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="170" y1="155" x2="165" y2="190" />
          <line x1="190" y1="155" x2="195" y2="190" />
          
          {/* Right Arm (pointing up at chart) */}
          <motion.g
            style={{ transformOrigin: '170px 110px' }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 170 110 Q 150 110 140 80" />
          </motion.g>

          {/* Left Arm (holding cash) */}
          <path d="M 190 110 L 205 130 L 195 145" />
        </g>
        
        {/* Cash in hand */}
        <g transform="translate(185, 135)">
          <rect x="0" y="0" width="20" height="12" fill="#10B981" stroke="#047857" strokeWidth="1.5" rx="2" transform="rotate(-15)" />
          <circle cx="10" cy="4" r="3" fill="#047857" transform="rotate(-15)" />
        </g>
        
      </svg>
    </div>
  );
};
