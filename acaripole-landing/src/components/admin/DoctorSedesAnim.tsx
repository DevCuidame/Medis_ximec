import React from 'react';
import { motion } from 'framer-motion';

export const DoctorSedesAnim = ({ size = 150, color = '#7A6452', textTop = 'Aquí están', textBottom = 'tus sedes' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        {/* Building Background */}
        <g stroke="#E6D9C7" strokeWidth="3" fill="#FFFBF5">
          <rect x="20" y="40" width="90" height="150" rx="2" />
          {/* Windows */}
          <rect x="35" y="55" width="20" height="25" />
          <rect x="75" y="55" width="20" height="25" />
          <rect x="35" y="95" width="20" height="25" />
          <rect x="75" y="95" width="20" height="25" />
          {/* Door */}
          <rect x="50" y="140" width="30" height="50" />
        </g>
        
        {/* Medical Cross on building */}
        <g transform="translate(45, 10)">
          <rect x="10" y="10" width="20" height="20" fill="#D32F2F" rx="2" />
          <rect x="17.5" y="12.5" width="5" height="15" fill="#FFFFFF" rx="1" />
          <rect x="12.5" y="17.5" width="15" height="5" fill="#FFFFFF" rx="1" />
        </g>
        
        {/* Ground */}
        <line x1="0" y1="190" x2="250" y2="190" stroke="#B0A08C" strokeWidth="4" strokeLinecap="round" />

        {/* Doctor */}
        <g stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Head */}
          <circle cx="160" cy="90" r="14" fill="#F5EDE1" />
          
          {/* Happy Face */}
          <path d="M 155 92 Q 160 97 165 92" strokeWidth="2.5" />
          <circle cx="155" cy="86" r="1.5" fill={color} stroke="none" />
          <circle cx="165" cy="86" r="1.5" fill={color} stroke="none" />

          {/* Doctor Coat / Body */}
          <path d="M 150 104 L 140 155 L 180 155 L 170 104 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 150 104 Q 160 120 170 104" stroke="#5C3A28" strokeWidth="2.5" />
          <line x1="160" y1="112" x2="160" y2="130" stroke="#5C3A28" strokeWidth="2.5" />
          <circle cx="160" cy="133" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="150" y1="155" x2="145" y2="190" />
          <line x1="170" y1="155" x2="175" y2="190" />
          
          {/* Right Arm (idle) */}
          <path d="M 170 110 L 185 130 L 175 145" />
          
          {/* Left Arm (Animated Pointing at building) */}
          <motion.g
            style={{ transformOrigin: '150px 110px' }}
            animate={{ rotate: [0, 15, -5, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 150 110 Q 130 110 115 110" />
          </motion.g>
        </g>
        
        {/* Speech Bubble */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <path d="M 140 40 Q 140 15 185 15 Q 230 15 230 40 Q 230 65 185 65 L 165 75 L 175 62 Q 140 60 140 40 Z" fill="#FFFFFF" stroke="#E6D9C7" strokeWidth="2" />
          <text x="185" y="40" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif" fill="#7A6452" textAnchor="middle" alignmentBaseline="middle">
            <tspan x="185" dy="-6">{textTop}</tspan>
            <tspan x="185" dy="16">{textBottom}</tspan>
          </text>
        </motion.g>
      </svg>
    </div>
  );
};
