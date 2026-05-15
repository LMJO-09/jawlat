import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Coffee, Play } from 'lucide-react';
import { collection, query, where, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Round } from '../types';

interface Props {
  onNavigate: (page: any, params?: any) => void;
}

export default function ActiveRoundTimer({ onNavigate }: Props) {
  const { user } = useAuth();
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rounds'),
      where('participants', 'array-contains', user.uid),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Round;
        setActiveRound(data);
      } else {
        setActiveRound(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeRound || !activeRound.startTime) return;

    const interval = setInterval(() => {
      const startTime = activeRound.startTime.toDate().getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = activeRound.duration * 60;
      
      if (elapsedSeconds >= totalSeconds) {
        clearInterval(interval);
        setTimeLeft(0);
        
        // Auto-complete if finished
        if (activeRound.status === 'active') {
          updateDoc(doc(db, 'rounds', activeRound.id), { status: 'completed' })
            .catch(err => console.error("Auto-complete error:", err));
        }
        return;
      }

      const cycleSeconds = (activeRound.breakAfter + activeRound.breakDuration) * 60;
      const currentCycleSeconds = elapsedSeconds % cycleSeconds;
      const workSeconds = activeRound.breakAfter * 60;
      
      if (currentCycleSeconds < workSeconds) {
        setIsBreak(false);
        setTimeLeft(Math.max(0, workSeconds - currentCycleSeconds));
      } else {
        setIsBreak(true);
        setTimeLeft(Math.max(0, cycleSeconds - currentCycleSeconds));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {activeRound && (
        <motion.button
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          onClick={() => onNavigate('round-room', { roundId: activeRound.id })}
          className={`fixed top-6 left-6 z-[9999] flex items-center gap-3 p-1.5 pr-4 rounded-2xl shadow-2xl border-2 transition-all hover:scale-105 active:scale-95 ${
            isBreak 
            ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/20' 
            : 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/20'
          }`}
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
             {isBreak ? <Coffee className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
          </div>
          <div className="text-right">
             <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">
                {isBreak ? 'استراحة' : 'جولة نشطة'}
             </div>
             <div className="text-lg font-mono font-bold leading-none">{formatTime(timeLeft)}</div>
          </div>
          <div className="w-8 h-8 flex items-center justify-center border-l border-white/20 mr-2">
             <Play className="w-4 h-4 rtl:rotate-180" />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
