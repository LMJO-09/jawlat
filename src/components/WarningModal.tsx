import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';

export default function WarningModal() {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<Notification[]>([]);
  const [activeWarning, setActiveWarning] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'warning'),
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setWarnings(fetched);
      if (fetched.length > 0) {
        setActiveWarning(fetched[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  const dismissWarning = async () => {
    if (!activeWarning) return;
    try {
      await updateDoc(doc(db, 'notifications', activeWarning.id), {
        read: true
      });
      setActiveWarning(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notifications');
    }
  };

  return (
    <AnimatePresence>
      {activeWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-4 border-amber-500/20 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
            
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">تحذير من الإدارة</h2>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-800/50 mb-8">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                {activeWarning.message}
              </p>
            </div>

            <button
              onClick={dismissWarning}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              فهمت ذلك، سألتزم بالقوانين
            </button>

            <button 
              onClick={() => setActiveWarning(null)}
              className="mt-4 text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              إغلاق مؤقتاً
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
