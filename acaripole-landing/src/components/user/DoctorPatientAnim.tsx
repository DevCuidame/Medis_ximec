import React from 'react';
import { motion } from 'framer-motion';

export const DoctorPatientAnim = ({ size = 160, color = '#7A6452' }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 250 200" width="100%" height="100%">
        
        {/* Patient */}
        <g stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
          <circle cx="170" cy="65" r="13" fill="#F5EDE1" />
          <path d="M 170 78 L 170 130" />
          <path d="M 170 130 L 160 175" />
          <path d="M 170 130 L 180 175" />
          {/* Patient Arms */}
          <path d="M 170 85 L 155 115" />
          <path d="M 170 85 L 185 115" />
        </g>

        {/* Doctor Animation Group */}
        <motion.g 
          stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Head */}
          <circle cx="80" cy="65" r="14" fill="#F5EDE1" />
          
          {/* Face */}
          <path d="M 85 63 Q 90 67 85 71" strokeWidth="2.5" />
          <circle cx="83" cy="60" r="1.5" fill={color} stroke="none" />
          <circle cx="90" cy="60" r="1.5" fill={color} stroke="none" />

          {/* Hair (Female indicator) */}
          <path d="M 66 65 Q 66 85 72 80" strokeWidth="4" />
          <path d="M 94 65 Q 94 85 88 80" strokeWidth="4" />

          {/* Doctor Coat / Body */}
          <path d="M 70 79 L 60 130 L 100 130 L 90 79 Z" fill="#FFFFFF" strokeWidth="4" />
          
          {/* Stethoscope Neck */}
          <path d="M 70 79 Q 80 95 90 79" stroke="#5C3A28" strokeWidth="2.5" />
          
          {/* Legs */}
          <path d="M 70 130 L 65 175" />
          <path d="M 90 130 L 95 175" />
          
          {/* Left Arm */}
          <path d="M 70 85 L 55 110" />

          {/* Right Arm (moving to examine patient) */}
          <motion.path 
            d="M 90 85 L 120 85 L 150 90"
            initial={{ d: "M 90 85 L 100 110 L 90 120" }}
            animate={{ d: [
              "M 90 85 L 100 110 L 90 120", 
              "M 90 85 L 120 85 L 150 90", 
              "M 90 85 L 120 85 L 150 90",
              "M 90 85 L 100 110 L 90 120"
            ] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          />

          {/* Stethoscope cord & chestpiece */}
          <motion.g
             initial={{ opacity: 0 }}
             animate={{ opacity: [0, 1, 1, 0] }}
             transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          >
            <path d="M 80 87 Q 110 120 150 90" stroke="#5C3A28" strokeWidth="2.5" />
            <circle cx="152" cy="89" r="3" fill="#5C3A28" stroke="none" />
            
            {/* Heartbeat pulse */}
            <motion.path 
              d="M 160 70 L 165 55 L 170 85 L 175 70" 
              stroke="#EF4444" strokeWidth="2" strokeLinejoin="miter" fill="none"
              animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.8, 1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.g>
        </motion.g>

      </svg>
    </div>
  );
};
