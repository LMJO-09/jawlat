import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  UserCheck
} from 'lucide-react';
import { collection, onSnapshot, query, updateDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, SupportTicket } from '../types';

interface Props {
  onNavigate: (page: any) => void;
}

export default function AdminPanel({ onNavigate }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'settings'>('users');
  const [config, setConfig] = useState<any>({ communityEnabled: true, communityMessage: '' });

  useEffect(() => {
    // Real-time Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    });

    // Real-time Support
    const unsubscribeTickets = onSnapshot(collection(db, 'support'), (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    });

    // Config
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

  const toggleBlock = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: !user.isBlocked
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleRestriction = async (user: UserProfile, action: string) => {
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

  const toggleAdmin = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: user.role === 'admin' ? 'user' : 'admin'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
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
      const loginDate = u.lastLogin.toDate();
      const today = new Date();
      return loginDate.getDate() === today.getDate() &&
             loginDate.getMonth() === today.getMonth() &&
             loginDate.getFullYear() === today.getFullYear();
    }).length,
    admins: users.filter(u => u.role === 'admin').length,
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
             <button 
               onClick={() => setActiveTab('users')}
               className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
             >
                المستخدمين
             </button>
             <button 
               onClick={() => setActiveTab('support')}
               className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
             >
                الدعم الفني
             </button>
             <button 
               onClick={() => setActiveTab('settings')}
               className={`px-8 py-2 rounded-xl transition-all font-bold text-sm ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
             >
                الإعدادات
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <StatCard label="إجمالي المستخدمين" value={stats.total} icon={<Users className="w-5 h-5"/>} color="bg-blue-500" />
           <StatCard label="دخلوا اليوم" value={stats.today} icon={<UserCheck className="w-5 h-5"/>} color="bg-emerald-500" />
           <StatCard label="مدراء النظام" value={stats.admins} icon={<ShieldCheck className="w-5 h-5"/>} color="bg-amber-500" />
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
               {filteredUsers.map((user) => (
                 <motion.div 
                   key={user.uid}
                   layout
                   className={`bento-card transition-all ${user.isBlocked ? 'border-red-200 dark:border-red-900/50 grayscale opacity-60' : ''}`}
                 >
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 bg-[var(--bg-primary)] rounded-2xl overflow-hidden">
                          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-primary)] truncate">{user.displayName}</h3>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          {user.lastLogin && (
                            <p className="text-[10px] text-indigo-500 font-bold mt-1">
                               آخر دخول: {user.lastLogin?.toDate?.()?.toLocaleString('ar-EG') || 'الآن'}
                            </p>
                          )}
                       </div>
                       <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {user.role}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 font-bold">الحالة العامّة</span>
                          <button 
                            onClick={() => toggleBlock(user)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${user.isBlocked ? 'bg-red-600 text-white' : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-red-500 hover:bg-red-50'}`}
                          >
                             {user.isBlocked ? <ShieldAlert className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                             {user.isBlocked ? 'رفع الحظر' : 'حظر الحساب'}
                          </button>
                       </div>

                       <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">تعديل الصلاحيات</p>
                          <div className="flex flex-wrap gap-2">
                             <RestrictionBadge 
                               label="الدردشة" 
                               active={user.restrictedActions?.includes('chat')} 
                               onToggle={() => toggleRestriction(user, 'chat')}
                             />
                             <RestrictionBadge 
                               label="إنشاء جولات" 
                               active={user.restrictedActions?.includes('createRound')} 
                               onToggle={() => toggleRestriction(user, 'createRound')}
                             />
                             <button 
                               onClick={() => toggleAdmin(user)}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${user.role === 'admin' ? 'bg-amber-100 border-amber-300 gold-text' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                             >
                                <ShieldCheck className="w-3 h-3 inline-block ml-1" />
                                {user.role === 'admin' ? 'إزالة كمدير' : 'ترقية لمدير'}
                             </button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
          </>
        ) : activeTab === 'support' ? (
          <div className="max-w-4xl mx-auto space-y-4">
             {tickets.map(ticket => (
               <div key={ticket.id} className="bg-[var(--card-bg)] p-6 rounded-3xl border border-[var(--card-border)] shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                           <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                           <h4 className="font-bold text-[var(--text-primary)]">طلب دعم من {ticket.senderEmail}</h4>
                           <p className="text-xs text-gray-400">{ticket.timestamp?.toDate()?.toLocaleString('ar-EG')}</p>
                        </div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ticket.status === 'open' ? 'نشط' : 'تم الرد'}
                     </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl mb-4">
                     {ticket.message}
                  </p>
                  <div className="flex justify-end">
                     <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all">
                        رد على التذكرة
                     </button>
                  </div>
               </div>
             ))}
             {tickets.length === 0 && (
               <div className="text-center p-20 text-gray-400 italic">لا توجد طلبات دعم حالياً.</div>
             )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
             <div className="bento-card">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">إعدادات النظام</h3>
                
                <div className="space-y-8">
                   <div>
                      <div className="flex items-center justify-between mb-4">
                         <div className="font-bold text-[var(--text-primary)]">حالة مجتمع الجولات</div>
                         <button 
                           onClick={() => updateConfig({ communityEnabled: !config.communityEnabled })}
                           className={`w-14 h-8 rounded-full transition-all relative ${config.communityEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'}`}
                         >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${config.communityEnabled ? 'right-7' : 'left-1'}`} />
                         </button>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-4">تفعيل أو تعطيل قسم المجتمع لجميع المستخدمين.</p>
                      
                      <div className="space-y-4 mt-6">
                         <label className="text-sm font-bold text-[var(--text-primary)]">رسالة التعطيل (تظهر عند إغلاق المجتمع):</label>
                         <textarea 
                           value={config.communityMessage}
                           onChange={e => updateConfig({ communityMessage: e.target.value })}
                           placeholder="مثال: المجتمع مغلق للصيانة حالياً..."
                           className="w-full bg-[var(--bg-primary)] border-none rounded-xl p-4 text-sm text-[var(--text-primary)] min-h-[100px]"
                         />
                         <p className="text-[10px] text-amber-600 font-bold">هذه الرسالة تظهر لغير المدراء عند تعطيل القسم من الأعلى.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RestrictionBadge({ label, active, onToggle }: any) {
  return (
    <button 
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-gray-100 dark:border-gray-700'}`}
    >
       {active ? `ممنوع من ${label}` : `مسموح له ${label}`}
    </button>
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
