import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Download, 
  ChevronLeft, 
  Calendar, 
  Trash2,
  ListTodo,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, where, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SharedContent } from '../types';
import jsPDF from 'jspdf';

interface Props {
  onNavigate: (page: any) => void;
}

export default function SchedulesPage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<SharedContent[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'content'),
      where('type', '==', 'schedule'),
      where('creatorId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedContent)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !profile) return;

    try {
      await addDoc(collection(db, 'content'), {
        type: 'schedule',
        content: inputText,
        creatorId: user.uid,
        creatorName: profile.displayName,
        timestamp: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEntry = async (id: string) => {
    if (confirm('حذف المهمة؟')) {
      await deleteDoc(doc(db, 'content', id));
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("My Daily Schedule - Nizam Al-Jawlat", 20, 20);
    
    let y = 30;
    entries.forEach((entry, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      const date = entry.timestamp?.toDate()?.toLocaleDateString('ar-EG') || '';
      doc.text(`${date}:`, 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(entry.content, 20, y);
      y += 10;
    });

    doc.save("schedule.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للوحة التحكم</span>
          </button>
          
          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none"
          >
            <Download className="w-5 h-5" />
            تصدير PDF
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold dark:text-white mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-green-500" />
            جداول المهام
          </h1>
          <p className="text-gray-500">نظم جدولك اليومي وما ستفعله في جولاتك القادمة</p>
        </div>

        {/* Input Area */}
        <form onSubmit={handleAdd} className="flex gap-4 mb-12">
           <input 
             type="text"
             value={inputText}
             onChange={e => setInputText(e.target.value)}
             placeholder="إضافة مهمة جديدة للجدول..."
             className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-lg dark:text-white shadow-sm"
           />
           <button 
             type="submit"
             disabled={!inputText.trim()}
             className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 dark:shadow-none"
           >
              <Plus className="w-8 h-8" />
           </button>
        </form>

        {/* Entries List */}
        <div className="space-y-4">
           {loading ? (
             <div className="flex justify-center p-12">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
             </div>
           ) : entries.length > 0 ? (
             entries.map((entry) => (
               <motion.div 
                 key={entry.id}
                 layout
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white dark:bg-gray-800 px-6 py-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group"
               >
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="w-5 h-5 text-green-500" />
                   </div>
                   <div>
                     <p className="text-gray-800 dark:text-gray-200 text-lg font-medium">{entry.content}</p>
                     <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                       <Clock className="w-3 h-3" />
                       {entry.timestamp?.toDate()?.toLocaleString('ar-EG')}
                     </div>
                   </div>
                 </div>
                 <button 
                   onClick={() => deleteEntry(entry.id)}
                   className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </motion.div>
             ))
           ) : (
             <div className="text-center p-20 bg-gray-50/50 dark:bg-gray-800/20 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                <ListTodo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400">لا يوجد مهام في الجدول</h3>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
