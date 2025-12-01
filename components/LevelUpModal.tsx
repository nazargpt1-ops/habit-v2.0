import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import { hapticSuccess } from '../lib/telegram';

interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ isOpen, newLevel, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Haptic Feedback
      hapticSuccess();

      // Trigger Fireworks Confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        // Left side
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#60A5FA', '#F472B6', '#FBBF24'],
          zIndex: 200
        });
        // Right side
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#60A5FA', '#F472B6', '#FBBF24'],
          zIndex: 200
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="relative bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[40px] shadow-2xl border-4 border-white/20 w-full max-w-sm text-center overflow-hidden"
          >
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full bg-gradient-to-b from-white/10 to-transparent blur-[60px] rounded-full pointer-events-none" />
            
            {/* Icon Animation */}
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
              className="w-28 h-28 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6 relative z-10 rotate-6"
            >
                <Trophy size={56} className="text-yellow-500 fill-yellow-500 drop-shadow-sm" />
            </motion.div>

            {/* Text Content */}
            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-black text-white italic tracking-tighter mb-2 drop-shadow-lg relative z-10"
            >
                LEVEL UP!
            </motion.h2>
            
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-indigo-100 font-medium text-lg mb-8 relative z-10"
            >
                You are now <span className="text-yellow-300 font-bold text-xl">Level {newLevel}</span>
            </motion.p>

            {/* Action Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-4 bg-white text-indigo-600 font-bold text-xl rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.2)] relative z-10"
            >
                Awesome!
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
