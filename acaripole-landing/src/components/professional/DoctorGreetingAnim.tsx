import React from 'react';
import { motion } from 'framer-motion';

export const DoctorGreetingAnim = ({ size = 150, color = '#7A6452', textTop = 'Estas son tus', textBottom = 'consultas' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        
        {/* Background elements: Sparkles/Stars */}
        {[
          { cx: 50, cy: 50, delay: 0 },
          { cx: 90, cy: 30, delay: 0.5 },
          { cx: 190, cy: 60, delay: 1 },
        ].map((star, i) => (
          <motion.g 
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2.5, delay: star.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d={`M ${star.cx} ${star.cy - 10} Q ${star.cx} ${star.cy} ${star.cx + 10} ${star.cy} Q ${star.cx} ${star.cy} ${star.cx} ${star.cy + 10} Q ${star.cx} ${star.cy} ${star.cx - 10} ${star.cy} Q ${star.cx} ${star.cy} ${star.cx} ${star.cy - 10} Z`} fill="#F59E0B" />
          </motion.g>
        ))}

        {/* Ground */}
        <line x1="20" y1="190" x2="230" y2="190" stroke="#B0A08C" strokeWidth="4" strokeLinecap="round" />

        {/* Doctor */}
        <g stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Head */}
          <circle cx="125" cy="90" r="14" fill="#F5EDE1" />
          
          {/* Happy Face */}
          <path d="M 120 92 Q 125 97 130 92" strokeWidth="2.5" />
          <circle cx="120" cy="86" r="1.5" fill={color} stroke="none" />
          <circle cx="130" cy="86" r="1.5" fill={color} stroke="none" />

          {/* Hair (Female indicator) */}
          <path d="M 111 90 Q 111 110 117 105" strokeWidth="4" />
          <path d="M 139 90 Q 139 110 133 105" strokeWidth="4" />

          {/* Doctor Coat / Body */}
          <path d="M 115 104 L 105 155 L 145 155 L 135 104 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 115 104 Q 125 120 135 104" stroke="#5C3A28" strokeWidth="2.5" />
          <line x1="125" y1="112" x2="125" y2="130" stroke="#5C3A28" strokeWidth="2.5" />
          <circle cx="125" cy="133" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="115" y1="155" x2="110" y2="190" />
          <line x1="135" y1="155" x2="140" y2="190" />
          
          {/* Left Arm (idle) */}
          <path d="M 115 110 L 100 130 L 110 145" />

          {/* Right Arm (Waving) */}
          <motion.g
            style={{ transformOrigin: '135px 110px' }}
            animate={{ rotate: [0, 45, 0, 45, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M 135 110 L 155 85 L 165 75" />
            {/* Hand wave marks */}
            <path d="M 158 65 Q 165 60 172 65" stroke="#B0A08C" strokeWidth="1.5" />
            <path d="M 163 60 Q 170 55 177 60" stroke="#B0A08C" strokeWidth="1.5" />
          </motion.g>

        </g>
        
        {/* Speech Bubble */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <path d="M 40 40 Q 40 15 90 15 Q 140 15 140 40 Q 140 65 90 65 L 110 75 L 100 62 Q 40 60 40 40 Z" fill="#FFFFFF" stroke="#E6D9C7" strokeWidth="2" />
          <text x="90" y="40" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif" fill="#7A6452" textAnchor="middle" alignmentBaseline="middle">
            <tspan x="90" dy="-6">{textTop}</tspan>
            <tspan x="90" dy="16">{textBottom}</tspan>
          </text>
        </motion.g>

      </svg>
    </div>
  );
};
