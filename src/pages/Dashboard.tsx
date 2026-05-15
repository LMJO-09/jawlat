import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Target, 
  Calendar, 
  Edit3, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  Settings,
  Plus,
  Flame,
  Globe,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { SupportTicket } from '../types';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import GenerationBadge from '../components/GenerationBadge';

interface Props {
  onNavigate: (page: any) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const { profile, isAdmin, user, isTimedOut, restrictedSections } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [config, setConfig] = useState<any>({ 
    communityEnabled: true, 
    expressionsEnabled: true, 
    schedulesEnabled: true 
  });

  useEffect(() => {
    // Config
    const unsubscribeConfig = onSnapshot(doc(db, 'app', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data());
      }
    });

    if (!user) return;
    const q = query(
      collection(db, 'support'),
      where('senderId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support');
    });
    return () => {
      unsubscribe();
      unsubscribeConfig();
    };
  }, [user]);

  const handleNavigate = (page: string, disabled?: boolean, msg?: string, sectionName?: string) => {
    if (disabled && !isAdmin) {
      alert(msg || 'هذا القسم مغلق حالياً للصيانة.');
      return;
    }
    
    if (isTimedOut && sectionName && restrictedSections.includes(sectionName) && !isAdmin) {
      alert(`عذراً، هذا القسم مقيد لك حالياً بسبب: ${profile?.timeoutReason || 'مخالفة القوانين'}`);
      return;
    }

    onNavigate(page);
  };

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim() || !user) return;
    try {
      await addDoc(collection(db, 'support'), {
        message: supportMsg,
        senderId: user.uid,
        senderEmail: user.email,
        status: 'open',
        timestamp: serverTimestamp()
      });
      setSupportMsg('');
      setShowSupport(false);
      // alert('تم إرسال طلب الدعم بنجاح'); // Optional: replace with toast if needed
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'support');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8 px-2">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
              نظام الجولات
            </h1>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <span>مرحباً بك،</span>
              <span className={`font-bold ${isAdmin ? 'gold-text' : 'text-[var(--text-primary)]'}`}>
                {profile?.displayName || 'المستخدم'}
              </span>
              <GenerationBadge generation={profile?.generation} />
              {isAdmin && <span className="text-yellow-500 text-xs align-middle inline-flex bg-yellow-500/10 px-2 py-0.5 rounded-full ring-1 ring-yellow-500/20 mr-1">مدير</span>}
            </div>
          </div>

          <GlobalCountdowns generation={profile?.generation} />
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--card-bg)] p-2 pr-6 rounded-2xl border border-[var(--card-border)] shadow-sm">
          <NotificationBell onNavigate={onNavigate} />
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <GenerationBadge generation={profile?.generation} />
              <p className={`${isAdmin ? 'gold-text' : 'text-[var(--text-primary)]'} text-sm leading-none`}>
                {profile?.displayName}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic">{profile?.email}</p>
          </div>
          <button 
            onClick={() => onNavigate('profile')}
            className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-800 transition-all hover:scale-105"
          >
            <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </button>
          
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-red-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-6 h-full">
        {/* Active Round Promo / Quick Start */}
        <div className="md:col-span-8 bento-card relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-indigo-800 border-none text-white p-10 min-h-[400px]">
          <div className="z-10 flex justify-between items-start">
            <div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">ابدأ الآن</span>
              <h2 className="text-4xl font-bold mt-4 leading-tight">جاهز لجولة <br />إنتاجية جديدة؟</h2>
            </div>
            {profile?.hasFlame && (
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <Flame className="w-8 h-8 flame-icon" />
              </div>
            )}
          </div>
          
          <div className="z-10 mt-auto">
            <p className="text-indigo-100 mb-6 max-w-sm">تحكم في وقتك بذكاء، وانجز مهامك بفعالية مع نظام الجولات المتطور.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleNavigate('rounds', false, '', 'Rounds')}
                className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                دخول الجولات
              </button>
              {isAdmin && (
                <button 
                  onClick={() => onNavigate('admin')}
                  className="px-8 py-3 bg-indigo-500/50 text-white rounded-xl font-bold text-lg border border-white/20 hover:bg-indigo-500/70 transition-all"
                >
                  لوحة المدير
                </button>
              )}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <Target className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
        </div>

        {/* Action Widgets */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <button 
            onClick={() => handleNavigate('community', !config.communityEnabled, config.communityMessage, 'Community')}
            className={`bento-card group text-right flex items-center justify-between hover:border-emerald-400 ${(!config.communityEnabled && !isAdmin) ? 'opacity-50' : ''}`}
          >
            <div>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block mb-1">تفاعل اجتماعي</span>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-[var(--text-primary)]">مجتمع الجولات</span>
                 {(!config.communityEnabled && !isAdmin) && <Clock className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-all">
              <Globe className="w-6 h-6" />
            </div>
          </button>

          <button 
            onClick={() => handleNavigate('schedules', !config.schedulesEnabled, config.schedulesMessage, 'Schedules')}
            className={`bento-card group text-right flex items-center justify-between hover:border-indigo-400 ${(!config.schedulesEnabled && !isAdmin) ? 'opacity-50' : ''}`}
          >
            <div>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mb-1">تنظيم الوقت</span>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-[var(--text-primary)]">جداول المهام</span>
                 {(!config.schedulesEnabled && !isAdmin) && <Clock className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-all">
              <Calendar className="w-6 h-6" />
            </div>
          </button>

          <button 
            onClick={() => handleNavigate('expressions', !config.expressionsEnabled, config.expressionsMessage, 'Expressions')}
            className={`bento-card group text-right flex items-center justify-between hover:border-purple-400 ${(!config.expressionsEnabled && !isAdmin) ? 'opacity-50' : ''}`}
          >
            <div>
              <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider block mb-1">مساحة حرة</span>
              <div className="flex items-center gap-2">
                 <span className="text-xl font-bold text-[var(--text-primary)]">التعبير الذاتي</span>
                 {(!config.expressionsEnabled && !isAdmin) && <Clock className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-all">
              <Edit3 className="w-6 h-6" />
            </div>
          </button>

          <div className="bento-card flex-1 bg-gradient-to-br from-slate-800 to-slate-900 border-none p-6 relative overflow-hidden text-white flex flex-col justify-center">
             <FocusTimer />
             <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Support Section as a Wide Bento Card */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bento-card bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Settings className="w-7 h-7" />
             </div>
             <div>
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">هل تواجه أي مشكلة؟</p>
                <p className="text-sm text-[var(--text-secondary)]">فريق الدعم الفني متواجد لمساعدتك في أي لحظة.</p>
             </div>
          </div>
          <button 
            onClick={() => setShowSupport(true)}
            className="w-full md:w-auto px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
          >
            إرسال تذكرة دعم
          </button>
        </div>
      </div>

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-[var(--card-bg)] border border-[var(--card-border)] w-full max-w-lg rounded-3xl shadow-2xl p-8"
           >
              <h3 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">تواصل مع الدعم الفني</h3>
              
              <div className="max-h-[300px] overflow-y-auto mb-6 space-y-4 px-2">
                 {tickets.map(ticket => (
                   <div key={ticket.id} className="p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--card-border)]">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] text-gray-500">{ticket.timestamp?.toDate()?.toLocaleString('ar-EG')}</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {ticket.status === 'open' ? 'بانتظار الرد' : 'تم الرد'}
                         </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mb-2 whitespace-pre-wrap">{ticket.message}</p>
                      {ticket.adminReply && (
                        <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
                           <p className="text-[10px] text-indigo-500 font-bold mb-1 uppercase tracking-widest">رد الإدارة:</p>
                           <p className="text-xs text-indigo-700 dark:text-indigo-300">{ticket.adminReply}</p>
                        </div>
                      )}
                   </div>
                 ))}
                 {tickets.length === 0 && (
                   <div className="text-center py-4 text-gray-400 text-sm">لا توجد رسائل سابقة</div>
                 )}
              </div>

               <textarea 
                 value={supportMsg}
                 onChange={e => setSupportMsg(e.target.value)}
                 placeholder="اشرح مشكلتك أو اقتراحك هنا..."
                 className="w-full h-32 p-4 bg-[var(--bg-primary)] rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-indigo-500 text-[var(--text-primary)] border border-[var(--card-border)]"
               />
               <div className="flex gap-4">
                  <button 
                    onClick={handleSupport}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  >
                    إرسال
                  </button>
                  <button 
                    onClick={() => setShowSupport(false)}
                    className="px-6 py-3 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-xl font-bold"
                  >
                    إلغاء
                  </button>
               </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}

function NavCard({ title, description, icon, color, onClick }: any) {
  return (
    <motion.button
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] shadow-sm hover:shadow-2xl hover:border-transparent transition-all group text-right w-full flex flex-col items-start"
    >
      <div className="mb-8 p-4 bg-[var(--bg-primary)] rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-[var(--text-secondary)] mb-6">{description}</p>
      <div className={`mt-auto px-6 py-2 rounded-full ${color} text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity`}>
        فتح القسم
      </div>
    </motion.button>
  );
}

function FocusTimer() {
  const [minutes, setMinutes] = useState(50);
  const [timeLeft, setTimeLeft] = useState(50 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playAlarm();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.error('Failed to play sound', e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(minutes * 60);
  };

  const adjustMinutes = (delta: number) => {
    const newMins = Math.max(1, minutes + delta);
    setMinutes(newMins);
    if (!isRunning) {
      setTimeLeft(newMins * 60);
    }
  };

  return (
    <div className="relative z-10 text-center">
       <div className="flex items-center justify-center gap-2 mb-2 text-emerald-400">
          <Clock className="w-5 h-5" />
          <h3 className="font-bold text-sm uppercase tracking-widest">عداد التركيز</h3>
       </div>
       
       <div className="flex items-center justify-center gap-4 mb-6">
          <button 
            disabled={isRunning}
            onClick={() => adjustMinutes(-5)}
            className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center hover:bg-slate-700 disabled:opacity-20 transition-all font-bold"
          >
            -5
          </button>
          
          <div className="text-5xl font-mono font-bold tracking-tighter">
             {formatTime(timeLeft)}
          </div>

          <button 
            disabled={isRunning}
            onClick={() => adjustMinutes(5)}
            className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center hover:bg-slate-700 disabled:opacity-20 transition-all font-bold"
          >
            +5
          </button>
       </div>

       <div className="flex items-center justify-center gap-4">
          <button 
            onClick={toggleTimer}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRunning ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
            }`}
          >
             {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <button 
            onClick={resetTimer}
            className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all"
          >
             <RotateCcw className="w-5 h-5" />
          </button>
       </div>
    </div>
  );
}

function ExamCountdown({ targetDate, label, year }: { targetDate: string, label: string, year: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse-slow">
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
        <GraduationCap className="w-6 h-6" />
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest leading-none">{label}</span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-black">{year}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-[var(--text-primary)] mt-0.5">
          <span className="text-blue-600">{timeLeft.days}ي</span>
          <span>:</span>
          <span>{timeLeft.hours}س</span>
          <span>:</span>
          <span>{timeLeft.minutes}د</span>
          <span>:</span>
          <span className="w-5 text-slate-400">{timeLeft.seconds}ث</span>
        </div>
      </div>
    </div>
  );
}

function GlobalCountdowns({ generation }: { generation?: string }) {
  if (!generation) return null;
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {generation === '2008' && <ExamCountdown targetDate="2026-06-25T00:00:00" label="موعد الوزاري" year="2008" />}
      {generation === '2009' && <ExamCountdown targetDate="2026-07-23T00:00:00" label="موعد الوزاري" year="2009" />}
      {generation === '2010' && <ExamCountdown targetDate="2027-06-25T00:00:00" label="موعد الوزاري المتوقع" year="2010" />}
    </div>
  );
}
