import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';

interface Props {
  onNavigate: (page: any) => void;
}

export default function NotificationBell({ onNavigate }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications/all');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const deleteRead = async () => {
    const read = notifications.filter(n => n.read);
    if (read.length === 0) return;
    try {
      const batch = writeBatch(db);
      read.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications/read');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-indigo-500"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[1000]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-12 left-0 w-80 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl z-[1001] overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                 <h3 className="font-bold text-sm text-[var(--text-primary)]">التنبيهات</h3>
                 <div className="flex gap-2">
                    <button 
                      onClick={markAllAsRead} 
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                      title="تحديد الكل كمقروء"
                    >
                       <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={deleteRead} 
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                      title="حذف المقروءة"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                 {notifications.length === 0 ? (
                   <div className="p-8 text-center text-slate-400">
                      <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-medium">لا توجد تنبيهات حالياً</p>
                   </div>
                 ) : (
                   notifications.map(n => (
                     <div 
                       key={n.id} 
                       className={`p-4 border-b border-[var(--card-border)] transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 flex gap-3 relative group ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                     >
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-indigo-600' : 'bg-transparent'}`} />
                        <div className="flex-1 text-right">
                           <p className="text-xs font-bold text-[var(--text-primary)] mb-1 leading-tight">{n.title}</p>
                           <p className="text-[10px] text-[var(--text-secondary)] mb-2 leading-relaxed">{n.message}</p>
                           <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{n.timestamp?.toDate()?.toLocaleTimeString('ar-EG')}</span>
                           
                           {n.link && (
                             <button 
                               onClick={() => {
                                 onNavigate(n.link);
                                 setIsOpen(false);
                               }}
                               className="block mt-2 text-[8px] font-bold text-indigo-500 hover:underline"
                             >
                               عرض التفاصيل
                             </button>
                           )}
                        </div>
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           {!n.read && (
                             <button 
                               onClick={() => markAsRead(n.id)}
                               className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md"
                             >
                                <Check className="w-3 h-3" />
                             </button>
                           )}
                           <button 
                             onClick={() => deleteNotification(n.id)}
                             className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md"
                           >
                              <X className="w-3 h-3" />
                           </button>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
