import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Download, 
  ChevronLeft, 
  Calendar, 
  Trash2,
  ListTodo,
  Clock,
  CheckCircle2,
  Edit2,
  FileImage,
  Save,
  X
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, where, orderBy, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SharedContent } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  onNavigate: (page: any) => void;
}

export default function SchedulesPage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scheduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'content'),
      where('type', '==', 'schedule'),
      where('creatorId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        completed: false,
        creatorId: user.uid,
        creatorName: profile.displayName,
        timestamp: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComplete = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'content', id), { completed: !current });
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditText(entry.content);
  };

  const handleEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await updateDoc(doc(db, 'content', editingId), { content: editText });
    setEditingId(null);
  };

  const deleteEntry = async (id: string) => {
    if (confirm('حذف المهمة؟')) {
      await deleteDoc(doc(db, 'content', id));
    }
  };

  const exportAsImage = async () => {
    if (!scheduleRef.current) return;
    const canvas = await html2canvas(scheduleRef.current);
    const link = document.createElement('a');
    link.download = 'my-schedule.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const downloadPDF = async () => {
     if (!scheduleRef.current) return;
     const canvas = await html2canvas(scheduleRef.current);
     const imgData = canvas.toDataURL('image/png');
     const pdf = new jsPDF('p', 'mm', 'a4');
     const imgProps = pdf.getImageProperties(imgData);
     const pdfWidth = pdf.internal.pageSize.getWidth();
     const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
     pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
     pdf.save("schedule.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للوحة التحكم</span>
          </button>
          
          <div className="flex gap-2">
             <button 
               onClick={exportAsImage}
               className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-800 text-sm"
             >
               <FileImage className="w-4 h-4" />
               حفظ كصورة
             </button>
             <button 
               onClick={downloadPDF}
               className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 text-sm"
             >
               <Download className="w-4 h-4" />
               تصدير PDF
             </button>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
               <Calendar className="w-7 h-7" />
            </div>
            جداول المهام اليومية
          </h1>
          <p className="text-slate-500 dark:text-slate-400">خطط ليومك وبادر بإنجاز مهامك في جولات التركيز</p>
        </div>

        {/* Create Task */}
        <form onSubmit={handleAdd} className="flex gap-4 mb-12">
           <input 
             type="text"
             value={inputText}
             onChange={e => setInputText(e.target.value)}
             placeholder="ما هي مهمتك القادمة؟"
             className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-lg dark:text-white shadow-sm font-bold"
           />
           <button 
             type="submit"
             disabled={!inputText.trim()}
             className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-500/20 transition-all"
           >
              <Plus className="w-8 h-8" />
           </button>
        </form>

        {/* Entries List Area (Target for export) */}
        <div ref={scheduleRef} className="bg-transparent space-y-4">
           {loading ? (
             <div className="flex justify-center p-12">
               <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
             </div>
           ) : entries.length > 0 ? (
             <AnimatePresence>
               {entries.map((entry) => (
                 <motion.div 
                   key={entry.id}
                   layout
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className={`bento-card px-6 py-5 flex items-center justify-between group ${entry.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}
                 >
                   <div className="flex items-center gap-4 flex-1">
                      <button 
                        onClick={() => toggleComplete(entry.id, entry.completed)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          entry.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 dark:border-slate-700 hover:border-green-500'
                        }`}
                      >
                         {entry.completed && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                      
                      <div className="flex-1">
                        {editingId === entry.id ? (
                           <div className="flex gap-2">
                              <input 
                                type="text"
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1 outline-none dark:text-white font-bold"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleEdit()}
                              />
                              <button onClick={handleEdit} className="text-green-500"><Save className="w-5 h-5" /></button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
                           </div>
                        ) : (
                           <>
                             <p className={`text-lg font-bold transition-all ${entry.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                {entry.content}
                             </p>
                             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                               <Clock className="w-3 h-3" />
                               {entry.timestamp?.toDate()?.toLocaleString('ar-EG')}
                             </div>
                           </>
                        )}
                      </div>
                   </div>

                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!entry.completed && editingId !== entry.id && (
                        <button 
                          onClick={() => startEdit(entry)}
                          className="p-2 text-slate-400 hover:text-indigo-500 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           ) : (
             <div className="text-center p-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                   <ListTodo className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">لا يوجد مهام في جدولك حالياً</h3>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
