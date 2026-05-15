import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ChevronLeft, 
  ShieldAlert, 
  Ban, 
  MessageSquare,
  Search,
  CheckCircle,
  MoreVertical,
  Mail,
  ShieldCheck,
  UserCheck,
  Clock,
  AlertTriangle,
  X,
  Send,
  ShieldAlert as ShieldError
} from 'lucide-react';
import { collection, onSnapshot, query, updateDoc, doc, getDocs, setDoc, serverTimestamp, addDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, SupportTicket, Message } from '../types';
import { useAuth } from '../hooks/useAuth';

interface Props {
  onNavigate: (page: any) => void;
}

export default function AdminPanel({ onNavigate }: Props) {
  const { user: authUser, isSuperAdmin: checkIsSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'settings'>('users');
  const [config, setConfig] = useState<any>({ 
    communityEnabled: true, 
    communityMessage: '',
    expressionsEnabled: true,
    expressionsMessage: '',
    schedulesEnabled: true,
    schedulesMessage: ''
  });

  const SUPER_ADMIN_EMAIL = 'abdalrhmanmaaith24@gmail.com';

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    });

    const unsubscribeTickets = onSnapshot(collection(db, 'support'), (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'app', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data());
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTickets();
      unsubscribeConfig();
    };
  }, []);

  const updateConfig = async (updates: any) => {
    try {
      await setDoc(doc(db, 'app', 'config'), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'app/config');
    }
  };

  const isSuper = (u: UserProfile) => u.email === SUPER_ADMIN_EMAIL;

  const toggleBlock = async (user: UserProfile) => {
    if (isSuper(user)) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: !user.isBlocked
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleRestriction = async (user: UserProfile, action: string) => {
    if (isSuper(user)) return;
    const restrictions = user.restrictedActions || [];
    const newRestrictions = restrictions.includes(action) 
      ? restrictions.filter(a => a !== action)
      : [...restrictions, action];
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        restrictedActions: newRestrictions
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const setRole = async (user: UserProfile, role: 'admin' | 'moderator' | 'user') => {
    if (isSuper(user)) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Timeout logic
  const [showingTimeout, setShowingTimeout] = useState<UserProfile | null>(null);
  const [timeoutHours, setTimeoutHours] = useState('24');
  const [timeoutReason, setTimeoutReason] = useState('');
  const [timeoutSections, setTimeoutSections] = useState<string[]>([]);

  const applyTimeout = async () => {
    if (!showingTimeout) return;
    try {
      const until = new Date();
      until.setHours(until.getHours() + parseInt(timeoutHours));
      
      await updateDoc(doc(db, 'users', showingTimeout.uid), {
        timeoutUntil: Timestamp.fromDate(until),
        timeoutReason,
        restrictedSections: timeoutSections
      });

      // Send warning notification
      await addDoc(collection(db, 'notifications'), {
        userId: showingTimeout.uid,
        title: 'تنبيه: تم وضعك في فترة استراحة إجبارية',
        message: `تم تقييد حسابك لمدة ${timeoutHours} ساعات بسبب: ${timeoutReason || 'مخالفة القوانين'}`,
        type: 'warning',
        read: false,
        timestamp: serverTimestamp()
      });

      setShowingTimeout(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${showingTimeout.uid}`);
    }
  };

  const removeTimeout = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        timeoutUntil: null,
        timeoutReason: '',
        restrictedSections: []
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Warning logic
  const [showingWarning, setShowingWarning] = useState<UserProfile | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  const sendWarning = async () => {
    if (!showingWarning || !warningMessage.trim()) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: showingWarning.uid,
        title: 'تحذير من الإدارة',
        message: warningMessage,
        type: 'warning',
        read: false,
        timestamp: serverTimestamp()
      });
      setShowingWarning(null);
      setWarningMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notifications');
    }
  };

  // Support Conversation
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!activeTicket) return;
    const q = query(
      collection(db, 'support', activeTicket.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTicketMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return () => unsubscribe();
  }, [activeTicket]);

  const sendTicketReply = async () => {
    if (!activeTicket || !replyText.trim() || !authUser) return;
    try {
      await addDoc(collection(db, 'support', activeTicket.id, 'messages'), {
        text: replyText,
        senderId: authUser.uid,
        senderName: 'إدارة النظام',
        senderPhoto: '',
        senderRole: 'admin',
        timestamp: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'support', activeTicket.id), {
        status: 'resolved',
        lastResponseAt: serverTimestamp()
      });

      setReplyText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `support/${activeTicket.id}/messages`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => !u.isBlocked).length,
    today: users.filter(u => {
      if (!u.lastLogin) return false;
      const loginDate = u.lastLogin.toDate ? u.lastLogin.toDate() : new Date(u.lastLogin);
      const today = new Date();
      return loginDate.getDate() === today.getDate() &&
             loginDate.getMonth() === today.getMonth() &&
             loginDate.getFullYear() === today.getFullYear();
    }).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'moderator').length,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-[var(--accent-primary)] transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>لوحة التحكم الرئيسية</span>
          </button>
          
          <div className="flex bg-[var(--card-bg)] p-1 rounded-2xl shadow-sm border border-[var(--card-border)]">
             <button onClick={() => setActiveTab('users')} className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>المستخدمين</button>
             <button onClick={() => setActiveTab('support')} className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>الدعم الفني</button>
             <button onClick={() => setActiveTab('settings')} className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>الإعدادات</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <StatCard label="إجمالي المستخدمين" value={stats.total} icon={<Users className="w-5 h-5"/>} color="bg-blue-500" />
           <StatCard label="دخلوا اليوم" value={stats.today} icon={<UserCheck className="w-5 h-5"/>} color="bg-emerald-500" />
           <StatCard label="المشرفين والمدراء" value={stats.admins} icon={<ShieldCheck className="w-5 h-5"/>} color="bg-amber-500" />
           <StatCard label="طلبات الدعم" value={tickets.filter(t => t.status === 'open').length} icon={<MessageSquare className="w-5 h-5"/>} color="bg-rose-500" />
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="mb-8 flex items-center gap-4">
               <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="ابحث عن مستخدم بالإسم أو الإيميل..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredUsers.map((user) => {
                 const userIsSuper = isSuper(user);
                 const isTimedOut = user.timeoutUntil && (user.timeoutUntil.toDate ? user.timeoutUntil.toDate() > new Date() : new Date(user.timeoutUntil) > new Date());
                 
                 return (
                   <motion.div 
                     key={user.uid}
                     layout
                     className={`bento-card relative transition-all ${user.isBlocked ? 'border-red-200 dark:border-red-900/50 grayscale opacity-60' : ''}`}
                   >
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-14 h-14 bg-[var(--bg-primary)] rounded-2xl overflow-hidden">
                            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="" className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
                              {user.displayName}
                              {userIsSuper && <ShieldCheck className="w-4 h-4 text-amber-500" />}
                            </h3>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            {isTimedOut && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-black mt-1">
                                <Clock className="w-3 h-3" />
                                <span>مقيد حتى {user.timeoutUntil.toDate ? user.timeoutUntil.toDate().toLocaleTimeString('ar-EG') : new Date(user.timeoutUntil).toLocaleTimeString('ar-EG')}</span>
                              </div>
                            )}
                         </div>
                         <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-yellow-500/10 text-yellow-600' : user.role === 'moderator' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                            {user.role}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-bold">الحالة العامّة</span>
                            <div className="flex gap-2">
                               <button 
                                 disabled={userIsSuper}
                                 onClick={() => toggleBlock(user)}
                                 className={`p-2 rounded-xl transition-all ${user.isBlocked ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-red-500 hover:bg-red-50 disabled:opacity-30'}`}
                                 title={user.isBlocked ? 'رفع الحظر' : 'حظر الحساب'}
                               >
                                  <Ban className="w-5 h-5" />
                               </button>
                               <button 
                                 disabled={userIsSuper}
                                 onClick={() => isTimedOut ? removeTimeout(user) : setShowingTimeout(user)}
                                 className={`p-2 rounded-xl transition-all ${isTimedOut ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-amber-50 disabled:opacity-30'}`}
                                 title={isTimedOut ? 'إزالة التقييد' : 'وضع تقييد (Timeout)'}
                               >
                                  <Clock className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => setShowingWarning(user)}
                                 className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-500 hover:bg-blue-50"
                                 title="إرسال تحذير"
                               >
                                  <AlertTriangle className="w-5 h-5" />
                               </button>
                            </div>
                         </div>

                         <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">تعديل الصلاحيات والمناصب</p>
                            <div className="flex flex-wrap gap-2">
                               <button 
                                 disabled={userIsSuper}
                                 onClick={() => setRole(user, 'user')}
                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${user.role === 'user' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-30'}`}
                               >مستخدم</button>
                               <button 
                                 disabled={userIsSuper}
                                 onClick={() => setRole(user, 'moderator')}
                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${user.role === 'moderator' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-30'}`}
                               >مشرف</button>
                               <button 
                                 disabled={userIsSuper}
                                 onClick={() => setRole(user, 'admin')}
                                 className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${user.role === 'admin' ? 'bg-amber-50 border-amber-200 text-amber-600 text-gold shadow-sm shadow-amber-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-30'}`}
                               >مدير</button>
                            </div>
                         </div>
                      </div>
                   </motion.div>
                 );
               })}
            </div>
          </>
        ) : activeTab === 'support' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <h3 className="font-black text-xl text-[var(--text-primary)] mb-6 flex items-center gap-2">
                   <MessageSquare className="w-6 h-6 text-indigo-500" />
                   صندوق الوارد (الدعم)
                </h3>
                {tickets.map(ticket => (
                  <button 
                    key={ticket.id}
                    onClick={() => setActiveTicket(ticket)}
                    className={`w-full text-right p-5 rounded-3xl border transition-all ${activeTicket?.id === ticket.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-[1.02]' : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${ticket.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                           {ticket.status === 'open' ? 'جديد' : 'مغلق'}
                        </span>
                        <span className={`text-[10px] font-bold ${activeTicket?.id === ticket.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                           {ticket.timestamp?.toDate?.()?.toLocaleDateString('ar-EG') || 'الآن'}
                        </span>
                     </div>
                     <h4 className="font-bold truncate">{ticket.senderEmail}</h4>
                     <p className={`text-xs truncate transition-all ${activeTicket?.id === ticket.id ? 'text-indigo-100' : 'text-slate-500'}`}>{ticket.message}</p>
                  </button>
                ))}
             </div>

             <div className="lg:col-span-2">
                {activeTicket ? (
                  <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--card-border)] h-[70vh] flex flex-col shadow-xl overflow-hidden">
                     <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                              <Mail className="w-6 h-6" />
                           </div>
                           <div>
                              <h4 className="font-black text-[var(--text-primary)]">{activeTicket.senderEmail}</h4>
                              <p className="text-xs text-slate-400">تذكرة دعم #{activeTicket.id.slice(-6)}</p>
                           </div>
                        </div>
                        <button onClick={() => setActiveTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                           <X className="w-6 h-6 text-slate-400" />
                        </button>
                     </div>

                     <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="flex flex-col gap-1 max-w-[80%]">
                           <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-2xl rounded-tr-none text-indigo-900 dark:text-indigo-200 text-sm font-medium">
                              {activeTicket.message}
                           </div>
                           <span className="text-[10px] text-slate-400 mr-2">{activeTicket.timestamp?.toDate?.()?.toLocaleString('ar-EG')}</span>
                        </div>

                        {ticketMessages.map(msg => (
                          <div key={msg.id} className={`flex flex-col gap-1 max-w-[80%] ${msg.senderId === authUser?.uid ? 'mr-auto items-end' : ''}`}>
                             <div className={`p-4 rounded-2xl text-sm font-medium ${msg.senderId === authUser?.uid ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)] rounded-tr-none'}`}>
                                {msg.text}
                             </div>
                             <span className="text-[10px] text-slate-400 ml-2">{msg.timestamp?.toDate?.()?.toLocaleString('ar-EG') || 'جاري الإرسال...'}</span>
                          </div>
                        ))}
                     </div>

                     <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-[var(--card-border)]">
                        <div className="flex gap-4">
                           <textarea 
                             value={replyText}
                             onChange={e => setReplyText(e.target.value)}
                             placeholder="اكتب ردك هنا للتواصل مع المستخدم..."
                             className="flex-1 p-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] resize-none"
                           />
                           <button 
                             onClick={sendTicketReply}
                             disabled={!replyText.trim()}
                             className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/30"
                           >
                              <Send className="w-8 h-8" />
                           </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="h-[70vh] bento-card flex flex-col items-center justify-center text-center">
                     <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="w-12 h-12 text-indigo-300" />
                     </div>
                     <h3 className="text-2xl font-black text-slate-300">اختر تذكرة للبدء في الرد عليها</h3>
                     <p className="text-slate-400 mt-2 max-w-xs">سيقوم الرد بفتح قناة محادثة مع المستخدم ووصول تنبيه فوري له.</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
             {/* Existing settings code */}
             <div className="bento-card">
                <h3 className="text-xl font-bold text-indigo-600 mb-6 flex items-center gap-2">
                   <Users className="w-6 h-6" />
                   إعدادات مجتمع الجولات
                </h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div><div className="font-bold">حالة قسم المجتمع</div></div>
                      <button onClick={() => updateConfig({ communityEnabled: !config.communityEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${config.communityEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${config.communityEnabled ? 'right-7' : 'left-1'}`} /></button>
                   </div>
                   <input type="text" value={config.communityMessage} onChange={e => updateConfig({ communityMessage: e.target.value })} placeholder="رسالة التعطيل..." className="w-full bg-[var(--bg-primary)] border-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-bold shadow-inner" />
                </div>
             </div>

             <div className="bento-card">
                <h3 className="text-xl font-bold text-purple-600 mb-6 flex items-center gap-2">
                   <ShieldAlert className="w-6 h-6" />
                   إعدادات التعبير الذاتي
                </h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div><div className="font-bold">حالة قسم التعبير</div></div>
                      <button onClick={() => updateConfig({ expressionsEnabled: !config.expressionsEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${config.expressionsEnabled ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-800'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${config.expressionsEnabled ? 'right-7' : 'left-1'}`} /></button>
                   </div>
                   <input type="text" value={config.expressionsMessage} onChange={e => updateConfig({ expressionsMessage: e.target.value })} placeholder="رسالة التعطيل..." className="w-full bg-[var(--bg-primary)] border-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-bold shadow-inner" />
                </div>
             </div>

             <div className="bento-card">
                <h3 className="text-xl font-bold text-blue-600 mb-6 flex items-center gap-2">
                   <CheckCircle className="w-6 h-6" />
                   إعدادات جدول المهام
                </h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div><div className="font-bold">حالة قسم المهام</div></div>
                      <button onClick={() => updateConfig({ schedulesEnabled: !config.schedulesEnabled })} className={`w-14 h-8 rounded-full transition-all relative ${config.schedulesEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-800'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${config.schedulesEnabled ? 'right-7' : 'left-1'}`} /></button>
                   </div>
                   <input type="text" value={config.schedulesMessage} onChange={e => updateConfig({ schedulesMessage: e.target.value })} placeholder="رسالة التعطيل..." className="w-full bg-[var(--bg-primary)] border-none rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] font-bold shadow-inner" />
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showingTimeout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 overflow-hidden shadow-2xl">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mb-6 text-amber-600 mx-auto">
                   <Clock className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] text-center mb-2">تقييد حساب {showingTimeout.displayName}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm">سيتم منع المستخدم من دخول الأقسام المحددة للمدة المختارة.</p>
                
                <div className="space-y-6">
                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">المدة بالساعات</label>
                      <select 
                        value={timeoutHours} 
                        onChange={e => setTimeoutHours(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-[var(--text-primary)] font-black accent-amber-500 outline-none"
                      >
                         <option value="1">ساعة واحدة</option>
                         <option value="6">6 ساعات</option>
                         <option value="24">يوم كامل (24 ساعة)</option>
                         <option value="72">3 أيام</option>
                         <option value="168">أسبوع كامل</option>
                      </select>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">الأقسام المحظورة</label>
                      <div className="grid grid-cols-2 gap-2">
                         {['Community', 'Schedules', 'Expressions', 'Chat'].map(section => (
                           <button 
                             key={section}
                             onClick={() => setTimeoutSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])}
                             className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${timeoutSections.includes(section) ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                           >
                              {section === 'Community' ? 'مجتمع' : section === 'Schedules' ? 'مهام' : section === 'Expressions' ? 'تعبير' : 'دردشة'}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">سبب التقييد</label>
                      <input 
                        type="text"
                        value={timeoutReason}
                        onChange={e => setTimeoutReason(e.target.value)}
                        placeholder="أدخل السبب لإيضاحه للمستخدم..."
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-[var(--text-primary)] font-bold accent-amber-500 outline-none"
                      />
                   </div>

                   <div className="flex gap-3 pt-4">
                      <button onClick={applyTimeout} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-500/20">تطبيق التقييد</button>
                      <button onClick={() => setShowingTimeout(null)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black">إلغاء</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {showingWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 overflow-hidden shadow-2xl">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center mb-6 text-blue-600 mx-auto">
                   <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] text-center mb-2">إرسال تحذير إداري</h3>
                <p className="text-slate-400 text-center mb-8 text-sm">سيظهر هذا التحذير للمستخدم فوراً على كامل الشاشة.</p>
                
                <div className="space-y-6">
                   <div>
                      <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">نص التحذير</label>
                      <textarea 
                        value={warningMessage}
                        onChange={e => setWarningMessage(e.target.value)}
                        placeholder="مثال: يرجى الالتزام بقواعد النظام في الدردشة..."
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-[var(--text-primary)] font-bold min-h-[120px] outline-none focus:ring-2 focus:ring-blue-500"
                      />
                   </div>

                   <div className="flex gap-3 pt-4">
                      <button onClick={sendWarning} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20">إرسال التحذير</button>
                      <button onClick={() => setShowingWarning(null)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black">إلغاء</button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bento-card p-6 flex flex-col items-center text-center justify-center border-slate-100 dark:border-slate-800">
       <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-black/5`}>
          {icon}
       </div>
       <div className="text-2xl font-black text-[var(--text-primary)] mb-1">{value}</div>
       <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">{label}</div>
    </div>
  );
}

