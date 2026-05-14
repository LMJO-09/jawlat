import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Download, 
  ChevronLeft, 
  Edit3, 
  Trash2,
  FileText,
  Clock
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, where, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SharedContent } from '../types';
import jsPDF from 'jspdf';

interface Props {
  onNavigate: (page: any) => void;
}

export default function ExpressionsPage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<SharedContent[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'content'),
      where('type', '==', 'expression'),
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
        type: 'expression',
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
    if (confirm('هل أنت متأكد من حذف هذا النص؟')) {
      await deleteDoc(doc(db, 'content', id));
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("My Expressions - Nizam Al-Jawlat", 20, 20);
    
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
      const lines = doc.splitTextToSize(entry.content, 170);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 10;
    });

    doc.save("expressions.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للوحة التحكم</span>
          </button>
          
          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg"
          >
            <Download className="w-5 h-5" />
            تحميل PDF
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold dark:text-white mb-2 flex items-center gap-3">
            <Edit3 className="w-10 h-10 text-purple-500" />
            مساحة التعبير
          </h1>
          <p className="text-gray-500">اكتب خواطرك وملاحظاتك الإبداعية هنا</p>
        </div>

        {/* Input Area */}
        <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm mb-12">
           <textarea 
             value={inputText}
             onChange={e => setInputText(e.target.value)}
             placeholder="بماذا تفكر الآن؟"
             className="w-full min-h-[150px] p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-lg resize-none dark:text-white"
           />
           <div className="mt-4 flex justify-end">
             <button 
               type="submit"
               disabled={!inputText.trim()}
               className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
             >
                <Plus className="w-5 h-5" />
                إضافة للتعبير
             </button>
           </div>
        </form>

        {/* Entries List */}
        <div className="space-y-6">
           {loading ? (
             <div className="flex justify-center p-12">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
             </div>
           ) : entries.length > 0 ? (
             entries.map((entry) => (
               <motion.div 
                 key={entry.id}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm relative group"
               >
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                     <Clock className="w-3 h-3" />
                     {entry.timestamp?.toDate()?.toLocaleString('ar-EG')}
                   </div>
                   <button 
                     onClick={() => deleteEntry(entry.id)}
                     className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
                 <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
                   {entry.content}
                 </p>
               </motion.div>
             ))
           ) : (
             <div className="text-center p-20 bg-gray-50/50 dark:bg-gray-800/20 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400">لا يوجد تعبيرات حتى الآن</h3>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
