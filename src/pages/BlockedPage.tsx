import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Send, LogOut, MessageSquare } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export default function BlockedPage() {
  const { user, profile } = useAuth();
  const [supportMsg, setSupportMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim() || !user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'support'), {
        message: supportMsg,
        senderId: user.uid,
        senderEmail: user.email,
        status: 'open',
        type: 'blocked_appeal',
        timestamp: serverTimestamp()
      });
      setSupportMsg('');
      setSent(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'support');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card border-red-100 dark:border-red-900/30 overflow-hidden text-center"
        >
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">تم حظر حسابك</h1>
          <p className="text-[var(--text-secondary)] mb-8 font-medium leading-relaxed">
            عذراً {profile?.displayName || 'يا زائر'}، لقد تم تقييد وصولك إلى النظام. إذا كنت تعتقد أن هذا حدث بالخطأ، يمكنك التواصل مع الدعم الفني أدناه.
          </p>

          {!sent ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 justify-center">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  طلب مراجعة الحظر
               </h3>
               <form onSubmit={handleSupport}>
                  <textarea 
                    value={supportMsg}
                    onChange={e => setSupportMsg(e.target.value)}
                    placeholder="اكتب رسالتك للمدير هنا..."
                    className="w-full h-32 p-4 bg-[var(--bg-primary)] border-none rounded-2xl mb-4 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button 
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 rtl:rotate-180" />
                        إرسال الطلب
                      </>
                    )}
                  </button>
               </form>
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 p-6 rounded-[2rem] text-center"
            >
               <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-1">تم إرسال رسالتك!</p>
               <p className="text-xs text-emerald-600/70">سنقوم بمراجعة طلبك في أقرب وقت ممكن.</p>
            </motion.div>
          )}

          <div className="mt-8 flex items-center justify-center gap-6">
             <button 
               onClick={() => signOut(auth)}
               className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold transition-all"
             >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
