import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

export default function GenerationSetup() {
  const { user, profile } = useAuth();
  const [generation, setGeneration] = useState<'2008' | '2009' | '2010'>('2008');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        generation: generation,
        lastLogin: new Date() // Force a profile update to be sure
      });
      // App.tsx should re-render and move to Dashboard automatically
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  // If profile already has generation, don't show this
  React.useEffect(() => {
    if (profile?.generation) {
      // Just a safety check
    }
  }, [profile]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bento-card p-8 border-indigo-100 dark:border-indigo-900/30 text-center"
      >
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">أهلاً بك {profile?.displayName}!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-bold">
          يرجى اختيار "جيلك" لنقوم بتخصيص تجربتك بشكل أفضل.
          <br />
          <span className="text-red-500 text-[10px]">ملاحظة: لا يمكن تغيير هذا الاختيار لاحقاً.</span>
        </p>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {(['2008', '2009', '2010'] as const).map((gen) => (
            <button
              key={gen}
              onClick={() => setGeneration(gen)}
              className={`p-6 rounded-[2rem] border-4 transition-all text-right flex items-center justify-between ${generation === gen ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-xl shadow-indigo-500/10' : 'border-slate-50 dark:border-slate-800'}`}
            >
              <div>
                <h3 className={`font-black text-lg ${generation === gen ? 'text-indigo-600' : 'text-slate-400'}`}>جيل {gen}</h3>
                <p className="text-xs text-slate-400 font-bold">طلاب التوجيهي لعام {parseInt(gen) + 18}</p>
              </div>
              {generation === gen && <CheckCircle2 className="w-6 h-6 text-indigo-600" />}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
        </button>
      </motion.div>
    </div>
  );
}
