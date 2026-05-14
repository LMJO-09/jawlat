import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Plus, 
  ArrowRight, 
  Clock, 
  Coffee, 
  Users,
  Search,
  ChevronLeft,
  Target
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Round } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Props {
  onNavigate: (page: any, params?: any) => void;
}

export default function RoundsPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(25);
  const [breakAfter, setBreakAfter] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  useEffect(() => {
    const q = query(collection(db, 'rounds'), orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Round));
      setRounds(data.filter(r => r.status === 'active'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rounds');
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const newRound = {
        name,
        duration: Number(duration),
        breakAfter: Number(breakAfter),
        breakDuration: Number(breakDuration),
        startTime: serverTimestamp(),
        status: 'active',
        creatorId: user.uid,
        participants: [user.uid]
      };
      const docRef = await addDoc(collection(db, 'rounds'), newRound);
      onNavigate('round-room', { roundId: docRef.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rounds');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm font-bold text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
          
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            جولة جديدة
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="md:col-span-3">
             <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">الجولات النشطة</h1>
                <p className="text-slate-500 text-sm">تصفح الجولات المتاحة حالياً وانضم إلى زملائك</p>
             </div>

             {loading ? (
               <div className="flex justify-center p-12">
                 <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
               </div>
             ) : rounds.length > 0 ? (
               <div className="grid sm:grid-cols-2 gap-6">
                 {rounds.map(round => (
                   <motion.div
                     key={round.id}
                     whileHover={{ scale: 1.02 }}
                     className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group"
                   >
                     <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                           <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-400">
                           <Users className="w-4 h-4" />
                           {round.participants?.length || 1}
                        </div>
                     </div>
                     <h3 className="text-xl font-bold dark:text-white mb-2">{round.name}</h3>
                     <div className="flex gap-4 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                           <Coffee className="w-4 h-4" />
                           {round.breakDuration}د بريك
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                           <Target className="w-4 h-4" />
                           {round.duration}د جولة
                        </div>
                     </div>
                     <button 
                       onClick={() => onNavigate('round-room', { roundId: round.id })}
                       className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-50 transition-all"
                     >
                        انضمام للجولة
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                     </button>
                   </motion.div>
                 ))}
               </div>
             ) : (
               <div className="bg-white dark:bg-gray-800 p-12 rounded-[2.5rem] text-center border border-dashed border-gray-200 dark:border-gray-700">
                   <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-10 h-10 text-gray-300" />
                   </div>
                   <h3 className="text-xl font-bold dark:text-white mb-2">لا يوجد جولات نشطة حالياً</h3>
                   <p className="text-gray-500 mb-6">كُن أول من يبدأ جولة الآن!</p>
                   <button 
                     onClick={() => setShowCreate(true)}
                     className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg"
                   >
                     إنشاء جولة
                   </button>
               </div>
             )}
          </div>

          {/* Create Modal - Inline overlay for simplicity */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold dark:text-white">إعداد جولة جديدة</h2>
                  <button onClick={() => setShowCreate(false)} className="p-2 text-gray-400 hover:text-gray-900">&times;</button>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                  <div className="bento-card bg-slate-50 border-slate-100 p-4">
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">اسم الجولة</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="مثال: جلسة برمجة مسائية"
                      className="w-full bg-transparent border-none focus:ring-0 font-bold dark:text-white text-lg p-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bento-card bg-slate-50 border-slate-100 p-4 text-center">
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">مدة الجولة</label>
                      <input 
                        type="number" 
                        required
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className="w-full bg-transparent border-none text-center focus:ring-0 font-bold dark:text-white text-2xl p-0"
                      />
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">دقيقة</span>
                    </div>
                    <div className="bento-card bg-slate-50 border-slate-100 p-4 text-center">
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">البريك كل</label>
                      <input 
                        type="number" 
                        required
                        value={breakAfter}
                        onChange={e => setBreakAfter(Number(e.target.value))}
                        className="w-full bg-transparent border-none text-center focus:ring-0 font-bold dark:text-white text-2xl p-0"
                      />
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">دقيقة</span>
                    </div>
                  </div>

                  <div className="bento-card bg-slate-50 border-slate-100 p-4 text-center">
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">مدة البريك</label>
                    <input 
                      type="number" 
                      required
                      value={breakDuration}
                      onChange={e => setBreakDuration(Number(e.target.value))}
                      className="w-full bg-transparent border-none text-center focus:ring-0 font-bold dark:text-white text-2xl p-0"
                    />
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">دقيقة</span>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    تفعيل الجولة الآن
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
