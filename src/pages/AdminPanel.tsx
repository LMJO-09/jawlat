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
import { collection, onSnapshot, query, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, SupportTicket } from '../types';

interface Props {
  onNavigate: (page: any) => void;
}

export default function AdminPanel({ onNavigate }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'support'>('users');

  useEffect(() => {
    // Real-time Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    });

    // Real-time Support
    const unsubscribeTickets = onSnapshot(collection(db, 'support'), (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTickets();
    };
  }, []);

  const toggleBlock = async (user: UserProfile) => {
    await updateDoc(doc(db, 'users', user.uid), {
      isBlocked: !user.isBlocked
    });
  };

  const toggleRestriction = async (user: UserProfile, action: string) => {
    const restrictions = user.restrictedActions || [];
    const newRestrictions = restrictions.includes(action) 
      ? restrictions.filter(a => a !== action)
      : [...restrictions, action];
    
    await updateDoc(doc(db, 'users', user.uid), {
      restrictedActions: newRestrictions
    });
  };

  const toggleAdmin = async (user: UserProfile) => {
    await updateDoc(doc(db, 'users', user.uid), {
      role: user.role === 'admin' ? 'user' : 'admin'
    });
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>لوحة التحكم الرئيسية</span>
          </button>
          
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
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
          </div>
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
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-800 border-none shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
                       <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden">
                          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <h3 className="font-bold dark:text-white truncate">{user.displayName}</h3>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${user.isBlocked ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-900 text-red-500 hover:bg-red-50'}`}
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
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
             {tickets.map(ticket => (
               <div key={ticket.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                           <MessageSquare className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                           <h4 className="font-bold dark:text-white">طلب دعم من {ticket.senderEmail}</h4>
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
