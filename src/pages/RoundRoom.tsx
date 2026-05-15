import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Coffee, 
  Send, 
  Users, 
  ArrowLeft,
  CircleAlert,
  Flame,
  User as UserIcon,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Round, Message } from '../types';
import GenerationBadge from '../components/GenerationBadge';

interface Props {
  roundId: string;
  onNavigate: (page: any, params?: any) => void;
}

export default function RoundRoom({ roundId, onNavigate }: Props) {
  const { profile, user, isAdmin, isTimedOut, restrictedSections } = useAuth();
  const [round, setRound] = useState<Round | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  const isSectionRestricted = isTimedOut && restrictedSections.includes('Chat') && !isAdmin;
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [loading, setLoading] = useState(true);
  const prevIsBreak = useRef(isBreak);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTimedOut && restrictedSections.includes('Rounds') && !isAdmin) {
      alert('تم تقييد وصولك لقسم الجولات، سيتم توجيهك للرئيسية');
      onNavigate('dashboard');
    }
  }, [isTimedOut, restrictedSections, isAdmin, onNavigate]);

  useEffect(() => {
    if (!round || round.status !== 'active' || !user) return;
    
    if (prevIsBreak.current !== isBreak) {
      const sendBreakNotification = async () => {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: user.uid,
            title: isBreak ? 'وقت الراحة!' : 'بداية العمل!',
            message: isBreak ? 'يمكنك الآن أخذ استراحة قصيرة والدردشة.' : 'انتهى وقت الراحة، لنعد للتركيز!',
            type: isBreak ? 'break_start' : 'break_end',
            read: false,
            timestamp: serverTimestamp(),
            link: `round/${roundId}`
          });
        } catch (err) {
          console.error("Break notification error:", err);
        }
      };
      sendBreakNotification();
      prevIsBreak.current = isBreak;
    }
  }, [isBreak, round, user, roundId]);

  useEffect(() => {
    // Round Listener
    const unsubscribeRound = onSnapshot(doc(db, 'rounds', roundId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Round;
        setRound(data);
        
        // Add user as participant if not already in
        if (user && !data.participants.includes(user.uid)) {
           updateDoc(doc(db, 'rounds', roundId), {
             participants: arrayUnion(user.uid)
           }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `rounds/${roundId}`));
        }
        setLoading(false);
      } else {
        onNavigate('rounds');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rounds/${roundId}`);
    });

    // Messages Listener
    const q = query(
      collection(db, 'rounds', roundId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rounds/${roundId}/messages`);
    });

    return () => {
      unsubscribeRound();
      unsubscribeMessages();
    };
  }, [roundId, user]);

  // Timer Logic
  useEffect(() => {
    if (!round || !round.startTime || round.status !== 'active') return;

    const interval = setInterval(async () => {
      const startTime = round.startTime.toDate().getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = round.duration * 60;
      
      if (elapsedSeconds >= totalSeconds) {
        clearInterval(interval);
        setTimeLeft(0);
        // Automatically mark as completed if it's the creator
        if (user && round.creatorId === user.uid) {
           updateDoc(doc(db, 'rounds', roundId), { status: 'completed' });
        }
        
        // Notification
        if (user) {
          try {
            // Audio Notification
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 1.5);

            await addDoc(collection(db, 'notifications'), {
              userId: user.uid,
              title: 'انتهت الجولة!',
              message: `لقد انتهت جولة "${round.name}" بنجاح. عودة ميمونة!`,
              type: 'round_end',
              read: false,
              timestamp: serverTimestamp(),
              link: 'rounds'
            });
          } catch (err) {
            console.error("Notification error:", err);
          }
        }

        // Show success alert and navigate
        if (!isBreak) { // Only if they were in a work session
           alert('رائع! لقد انتهت الجولة بنجاح. سيتم توجيهك إلى سجل الإنجازات.');
           onNavigate('rounds', { tab: 'completed' });
        }
        return;
      }

      const cycleSeconds = (round.breakAfter + round.breakDuration) * 60;
      const currentCycleSeconds = elapsedSeconds % cycleSeconds;
      const workSeconds = round.breakAfter * 60;
      
      if (currentCycleSeconds < workSeconds) {
        setIsBreak(false);
        setTimeLeft(Math.max(0, workSeconds - currentCycleSeconds));
      } else {
        setIsBreak(true);
        setTimeLeft(Math.max(0, cycleSeconds - currentCycleSeconds));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [round, roundId, user]);

  const endRound = async () => {
    if (confirm('هل تريد إنهاء الجولة الآن؟')) {
      try {
        await updateDoc(doc(db, 'rounds', roundId), { status: 'completed' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `rounds/${roundId}`);
      }
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSectionRestricted) {
      alert('أنت مقيد من الدردشة حالياً');
      return;
    }
    if (!inputText.trim() || !profile) return;

    try {
      await addDoc(collection(db, 'rounds', roundId, 'messages'), {
        text: inputText,
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        senderRole: profile.role,
        senderGeneration: profile.generation,
        timestamp: serverTimestamp()
      });
      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rounds/${roundId}/messages`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !round) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--accent-primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row">
      {/* Left: Timer Panel */}
      <div className="w-full md:w-1/3 p-8 flex flex-col bg-[var(--card-bg)] border-l border-[var(--card-border)] shadow-2xl z-10">
        <button 
          onClick={() => onNavigate('rounds')}
          className="flex items-center gap-2 text-slate-500 hover:text-[var(--accent-primary)] mb-10 transition-all font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>مغادرة الجولة</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="mb-10">
             <div className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-widest mb-2">جولة نشطة الآن</div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{round.name}</h1>
            <p className="text-[var(--text-secondary)] text-sm italic">{round.duration} دقيقة من التركيز العميق</p>
          </div>

          <div className="relative mb-12">
             {/* Bento Style Timer Box */}
             <div className="bento-card bg-slate-900 text-white border-none w-72 h-72 flex flex-col items-center justify-center relative overflow-hidden shadow-indigo-500/20">
                <div className={`absolute top-0 left-0 w-full h-1 transition-all duration-1000 ${isBreak ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
                <div className="text-7xl font-mono font-bold tracking-tighter mb-2">{formatTime(timeLeft)}</div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                   {isBreak ? (
                     <>
                        <Coffee className="w-3 h-3 text-emerald-400" />
                        وقت الاستراحة
                     </>
                   ) : (
                     <>
                        <Clock className="w-3 h-3 text-indigo-400" />
                        وقت الإنجاز
                     </>
                   )}
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bento-card bg-[var(--bg-primary)] p-4 border-[var(--card-border)]">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{round.participants.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">المشاركين</div>
            </div>
            <div className="bento-card bg-[var(--bg-primary)] p-4 border-[var(--card-border)]">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{round.breakAfter}د</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">فاصل العمل</div>
            </div>
          </div>

          {(user?.uid === round.creatorId || profile?.role === 'admin') && round.status === 'active' && (
            <button 
              onClick={endRound}
              className="mt-8 w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30 text-sm"
            >
              إنهاء الجولة يدوياً
            </button>
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      <div className="flex-1 flex flex-col relative h-[50vh] md:h-screen">
        {!isBreak && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/40 backdrop-blur-md text-white p-8 text-center">
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] shadow-2xl text-[var(--text-primary)] max-w-sm"
             >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                   <MessageSquare className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3">الدردشة مغلقة الآن</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">دردشة الغرفة تفتح تلقائياً فقط خلال فترة الراحة لضمان تركيز الجميع.</p>
                <div className="flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300">
                   <Clock className="w-4 h-4" />
                   تفتح الدردشة بعد {formatTime(timeLeft)}
                </div>
             </motion.div>
          </div>
        )}

        {/* Chat Header */}
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--card-bg)]/80 backdrop-blur-md">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                 <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="font-bold text-[var(--text-primary)] leading-none">دردشة الاستراحة</h2>
                 <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">نشط حالياً</p>
              </div>
           </div>
           <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
             {round.participants.slice(0, 3).map((pId) => (
                <div key={pId} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold">
                  {pId.slice(0, 2).toUpperCase()}
                </div>
             ))}
             {round.participants.length > 3 && (
               <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">
                 +{round.participants.length - 3}
               </div>
             )}
           </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
           {messages.map((msg, i) => {
             const isMe = msg.senderId === user?.uid;
             const isAdminMsg = msg.senderRole === 'admin';
             return (
               <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse text-left' : 'text-right'}`}>
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0 border-2 border-transparent">
                     {msg.senderPhoto ? (
                       <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <UserIcon className="w-6 h-6" />
                       </div>
                     )}
                  </div>
              <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                 <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[10px] font-bold ${isAdminMsg ? 'gold-text' : 'text-slate-400'} flex items-center gap-1 uppercase tracking-wider`}>
                       {isAdminMsg && <ShieldCheck className="w-3 h-3" />}
                       {msg.senderName}
                        <GenerationBadge generation={msg.senderGeneration} />
                    </span>
                    {msg.senderRole === 'admin' && <Flame className="w-3 h-3 flame-icon" />}
                 </div>
                 <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                   isMe ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' : 
                   'bg-[var(--card-bg)] text-[var(--text-primary)] rounded-tl-none border-[var(--card-border)]'
                 }`}>
                    {msg.text}
                 </div>
              </div>
               </div>
             );
           })}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[var(--card-border)] bg-[var(--card-bg)]/50 backdrop-blur-md">
           <form onSubmit={sendMessage} className="flex gap-4">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={!isBreak}
                placeholder={isBreak ? "اكتب رسالة هنا..." : "الدردشة مغلقة للتركيز..."}
                className="flex-1 bg-[var(--bg-primary)] border-none rounded-2xl px-6 py-4 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] outline-none disabled:opacity-50 text-sm font-bold"
              />
              <button 
                type="submit"
                disabled={!isBreak || !inputText.trim()}
                className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                 <Send className="w-5 h-5 rtl:rotate-180" />
              </button>
           </form>
        </div>
      </div>
    </div>
  );
}
