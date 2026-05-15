import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Send, LogOut, MessageSquare } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { SupportTicket, Message } from '../types';

export default function BlockedPage() {
  const { user, profile } = useAuth();
  const [supportMsg, setSupportMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'support'),
      where('senderId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
      setTickets(fetchedTickets);
      if (fetchedTickets.length > 0 && !activeTicket) {
        setActiveTicket(fetchedTickets[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support');
    });
    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!activeTicket) return;
    const q = query(
      collection(db, 'support', activeTicket.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `support/${activeTicket.id}/messages`);
    });
    return () => unsubscribe();
  }, [activeTicket]);

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim() || !user) return;
    setLoading(true);
    try {
      if (activeTicket) {
        // Add to existing conversation
        await addDoc(collection(db, 'support', activeTicket.id, 'messages'), {
          text: supportMsg,
          senderId: user.uid,
          senderName: profile?.displayName || 'User',
          senderPhoto: profile?.photoURL || '',
          senderRole: 'user',
          timestamp: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'support', activeTicket.id), {
          status: 'open',
          lastResponseAt: serverTimestamp()
        });
      } else {
        // Create new ticket
        const ticketRef = await addDoc(collection(db, 'support'), {
          message: supportMsg,
          senderId: user.uid,
          senderEmail: user.email,
          status: 'open',
          type: 'blocked_appeal',
          timestamp: serverTimestamp()
        });
        
        // Add first message
        await addDoc(collection(db, 'support', ticketRef.id, 'messages'), {
          text: supportMsg,
          senderId: user.uid,
          senderName: profile?.displayName || 'User',
          senderPhoto: profile?.photoURL || '',
          senderRole: 'user',
          timestamp: serverTimestamp()
        });
      }
      setSupportMsg('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'support');
    } finally {
      setLoading(false);
    }
  };

  const createNewTicket = () => {
    setActiveTicket(null);
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card border-red-100 dark:border-red-900/30 overflow-hidden"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-red-600 dark:text-red-400 mb-2">تم حظر حسابك</h1>
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm mx-auto">
              عذراً {profile?.displayName || 'يا زائر'}، لقد تم تقييد وصولك. يمكنك المحادثة مع الدعم الفني لحل المشكلة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[50vh]">
            <div className="md:col-span-1 space-y-2 overflow-y-auto pr-1">
               <button 
                 onClick={createNewTicket}
                 className="w-full p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 mb-4 hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-800/50"
               >
                 <MessageSquare className="w-4 h-4" />
                 تذكرة جديدة
               </button>
               {tickets.map(ticket => (
                 <button 
                   key={ticket.id}
                   onClick={() => setActiveTicket(ticket)}
                   className={`w-full p-4 rounded-2xl text-right border transition-all ${activeTicket?.id === ticket.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-[var(--text-primary)]'}`}
                 >
                    <div className="flex justify-between items-center mb-1">
                       <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase ${ticket.status === 'open' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                          {ticket.status === 'open' ? 'نشط' : 'تم الرد'}
                       </span>
                    </div>
                    <p className={`text-[10px] font-bold truncate ${activeTicket?.id === ticket.id ? 'text-indigo-100' : 'text-slate-500'}`}>{ticket.message}</p>
                 </button>
               ))}
            </div>

            <div className="md:col-span-2 flex flex-col bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
               {activeTicket ? (
                 <>
                   <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
                      <span className="text-[10px] font-bold text-slate-400">تذكرة #{activeTicket.id.slice(-6)}</span>
                      <span className="text-[10px] font-bold text-indigo-500">{activeTicket.status === 'open' ? 'بانتظار الإدارة' : 'تم مراجعة الطلب'}</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div className="flex flex-col gap-1 max-w-[85%] self-start">
                         <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-2xl rounded-tr-none text-xs font-medium text-slate-700 dark:text-slate-200">
                            {activeTicket.message}
                         </div>
                         <span className="text-[8px] text-slate-400 font-bold ml-2">{activeTicket.timestamp?.toDate?.()?.toLocaleString('ar-EG')}</span>
                      </div>
                      
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${msg.senderId === user?.uid ? 'mr-auto items-end' : ''}`}>
                           <div className={`p-3 rounded-2xl text-xs font-medium ${msg.senderId === user?.uid ? 'bg-indigo-600 text-white rounded-tl-none' : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-primary)] rounded-tr-none'}`}>
                              {msg.text}
                           </div>
                           <span className="text-[8px] text-slate-400 mx-2">{msg.timestamp?.toDate?.()?.toLocaleString('ar-EG')}</span>
                        </div>
                      ))}
                   </div>
                   <div className="p-4 bg-slate-50/30 border-t border-slate-100 dark:border-slate-800">
                      <form onSubmit={handleSupport} className="flex gap-2">
                         <input 
                           type="text"
                           value={supportMsg}
                           onChange={e => setSupportMsg(e.target.value)}
                           placeholder="اكتب رسالتك للدعم..."
                           className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border-none rounded-xl text-xs font-bold shadow-inner outline-none focus:ring-1 focus:ring-indigo-500"
                         />
                         <button 
                           disabled={loading || !supportMsg.trim()}
                           className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50"
                         >
                            <Send className="w-4 h-4" />
                         </button>
                      </form>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/20">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                       <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400">ابدأ تذكرة جديدة للتواصل مع الإدارة</h3>
                    <form onSubmit={handleSupport} className="w-full mt-6 space-y-3">
                       <textarea 
                         value={supportMsg}
                         onChange={e => setSupportMsg(e.target.value)}
                         placeholder="اشرح مشكلتك هنا بالتفصيل ليتم مراجعة الحظر..."
                         className="w-full p-4 bg-white dark:bg-slate-900 border-none rounded-2xl text-xs font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                         required
                       />
                       <button 
                         disabled={loading || !supportMsg.trim()}
                         className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                       >
                          <Send className="w-4 h-4" />
                          إرسال طلب مراجعة
                       </button>
                    </form>
                 </div>
               )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
             <button 
               onClick={() => signOut(auth)}
               className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold transition-all text-sm"
             >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
