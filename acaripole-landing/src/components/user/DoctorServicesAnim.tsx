import React from 'react';
import { motion } from 'framer-motion';

export const DoctorServicesAnim = ({ size = 150, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        
        {/* Ground */}
        <line x1="20" y1="190" x2="230" y2="190" stroke="#B0A08C" strokeWidth="4" strokeLinecap="round" />

        {/* Board / Screen showing list of services */}
        <g stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="130" y="40" width="80" height="110" rx="8" fill="#F5EDE1" stroke="#E6D9C7" />
          <line x1="140" y1="60" x2="190" y2="60" stroke="#B0A08C" />
          <line x1="140" y1="85" x2="200" y2="85" stroke="#B0A08C" />
          <line x1="140" y1="110" x2="180" y2="110" stroke="#B0A08C" />
          <line x1="140" y1="135" x2="195" y2="135" stroke="#B0A08C" />
        </g>

        {/* Doctor */}
        <motion.g 
          stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Head */}
          <circle cx="80" cy="90" r="14" fill="#F5EDE1" />
          
          {/* Face looking at board */}
          <path d="M 85 88 Q 90 92 85 96" strokeWidth="2.5" />
          <circle cx="83" cy="85" r="1.5" fill={color} stroke="none" />
          <circle cx="90" cy="85" r="1.5" fill={color} stroke="none" />

          {/* Hair (Female indicator) */}
          <path d="M 66 90 Q 66 110 72 105" strokeWidth="4" />
          <path d="M 94 90 Q 94 110 88 105" strokeWidth="4" />

          {/* Doctor Coat / Body */}
          <path d="M 70 104 L 60 155 L 100 155 L 90 104 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope */}
          <path d="M 70 104 Q 80 120 90 104" stroke="#5C3A28" strokeWidth="2.5" />
          <line x1="80" y1="112" x2="80" y2="130" stroke="#5C3A28" strokeWidth="2.5" />
          <circle cx="80" cy="133" r="3" fill="#5C3A28" stroke="none" />
          
          {/* Legs */}
          <line x1="70" y1="155" x2="65" y2="190" />
          <line x1="90" y1="155" x2="95" y2="190" />
          
          {/* Left Arm (idle) */}
          <path d="M 70 110 L 55 130 L 65 145" />

          {/* Right Arm (Pointing at the board) */}
          <motion.path 
            d="M 90 110 L 110 90 L 125 85"
            initial={{ d: "M 90 110 L 100 130 L 110 145" }}
            animate={{ d: "M 90 110 L 110 90 L 125 85" }}
            transition={{ delay: 1.5, duration: 0.5, ease: "easeInOut" }}
          />
        </motion.g>

        {/* Checkmark appears after pointing */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, duration: 0.4, type: "spring", stiffness: 200 }}
        >
          <path d="M 195 75 L 205 85 L 220 60" stroke="#10B981" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sparkles around checkmark */}
          <motion.path d="M 210 50 L 210 45" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 2.2, duration: 1 }} />
          <motion.path d="M 225 65 L 230 65" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 2.3, duration: 1 }} />
          <motion.path d="M 190 65 L 185 65" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0, 1, 0] }} transition={{ delay: 2.4, duration: 1 }} />
        </motion.g>

      </svg>
    </div>
  );
};
