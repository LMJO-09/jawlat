import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Download, 
  ChevronLeft, 
  Edit3, 
  Trash2,
  FileText,
  Clock,
  Image as ImageIcon,
  X,
  User as UserIcon,
  Globe,
  MessageSquare,
  Send,
  Reply as ReplyIcon
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, where, orderBy, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SharedContent } from '../types';
import jsPDF from 'jspdf';

interface Props {
  onNavigate: (page: any) => void;
}

export default function ExpressionsPage({ onNavigate }: Props) {
  const { user, profile, isAdmin } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>({ expressionsEnabled: true, expressionsMessage: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("ExpressionsPage Debug:", { uid: user?.uid, email: user?.email, isAdmin, role: profile?.role });
  }, [user, isAdmin, profile]);

  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    const unsubscribeConfig = onSnapshot(doc(db, 'app', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data());
      }
    });

    // Show all public expressions
    const q = query(
      collection(db, 'content'),
      where('type', '==', 'expression'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => {
      unsubscribe();
      unsubscribeConfig();
    };
  }, []);

  useEffect(() => {
    if (!expandedComments) {
      setComments([]);
      return;
    }
    const q = query(
      collection(db, 'content', expandedComments, 'comments'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [expandedComments]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً (الأقصى 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && images.length === 0) || !user || !profile) return;

    try {
      await addDoc(collection(db, 'content'), {
        type: 'expression',
        content: inputText,
        images: images,
        creatorId: user.uid,
        creatorName: profile.displayName,
        creatorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        likes: [],
        commentCount: 0
      });
      setInputText('');
      setImages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEntry = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      try {
        console.log("Attempting to delete entry:", id, "as Admin:", isAdmin);
        await deleteDoc(doc(db, 'content', id));
        // Also cleanup comments subcollection if needed (Firestore doesn't auto-delete subcollections on client side)
      } catch (err: any) {
        console.error("Delete Entry Error:", err);
        setError(`فشل حذف المنشور: ${err.message || 'تأكد من صلاحيات المسؤول'}`);
      }
    }
  };

  const addComment = async (postId: string) => {
    if (!commentInput.trim() || !user || !profile) return;
    try {
      await addDoc(collection(db, 'content', postId, 'comments'), {
        postId,
        content: commentInput,
        creatorId: user.uid,
        creatorName: profile.displayName,
        creatorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        replies: []
      });
      setCommentInput('');
      const postRef = doc(db, 'content', postId);
      await updateDoc(postRef, {
        commentCount: (entries.find(e => e.id === postId)?.commentCount || 0) + 1
      });
    } catch (err: any) {
      console.error("Add Comment Error:", err);
      setError('فشل إضافة التعليق.');
    }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm('هل تريد حذف هذا التعليق؟')) return;
    try {
      console.log("Attempting to delete comment:", commentId, "from post:", postId, "as Admin:", isAdmin);
      await deleteDoc(doc(db, 'content', postId, 'comments', commentId));
      const postRef = doc(db, 'content', postId);
      await updateDoc(postRef, {
        commentCount: Math.max(0, (entries.find(e => e.id === postId)?.commentCount || 0) - 1)
      });
    } catch (err: any) {
      console.error("Delete Comment Error:", err);
      setError(`فشل حذف التعليق: ${err.message || 'تأكد من صلاحيات المسؤول'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-[var(--accent-primary)] transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للوحة التحكم</span>
          </button>
        </div>

        <div className="mb-10 text-center md:text-right">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 flex items-center justify-center md:justify-start gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
               <Edit3 className="w-7 h-7" />
            </div>
            مساحة التعبير الحر
          </h1>
          <p className="text-[var(--text-secondary)]">شارك خواطرك وصورك مع الآخرين في مجتمع الجولات</p>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold flex justify-between items-center"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4"/></button>
            </motion.div>
          )}
        </div>

        {(!config.expressionsEnabled && !isAdmin) ? (
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-12 rounded-[3rem] text-center mb-12">
             <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-purple-600" />
             </div>
             <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-400 mb-2">قسم التعبير متوقف مؤقتاً</h3>
             <p className="text-purple-600 dark:text-purple-300 font-medium">
               {config.expressionsMessage || 'هذا القسم مغلق حالياً، نعتذر عن الإزعاج.'}
             </p>
          </div>
        ) : (
          <>
            {/* Create Post Area */}
            <div className="bento-card mb-12 border-purple-100 dark:border-purple-900/30 overflow-hidden">
               <form onSubmit={handleAdd}>
                  <div className="flex items-start gap-4 mb-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                        {profile?.photoURL ? (
                          <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                             <UserIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                     </div>
                     <textarea 
                       value={inputText}
                       onChange={e => setInputText(e.target.value)}
                       placeholder="بماذا تفكر الآن؟ شارك شيئاً ملهماً..."
                       className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-lg resize-none text-[var(--text-primary)] pt-2"
                     />
                  </div>

                  {/* Image Previews */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                       {images.map((img, idx) => (
                         <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md scale-75 hover:scale-100 transition-all"
                            >
                               <X className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex gap-2">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/30 transition-all flex items-center gap-2 font-bold text-sm"
                        >
                           <ImageIcon className="w-5 h-5" />
                           إضافة صور
                        </button>
                     </div>
                     <button 
                       type="submit"
                       disabled={(!inputText.trim() && images.length === 0)}
                       className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
                     >
                        نشر التعبير
                     </button>
                  </div>
               </form>
            </div>

            {/* Feed List */}
            <div className="space-y-8">
               {loading ? (
                 <div className="flex justify-center p-12">
                   <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                 </div>
               ) : entries.length > 0 ? (
                 entries.map((entry) => {
                   const isOwner = entry.creatorId === user?.uid;
                   return (
                     <motion.div 
                       key={entry.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="bento-card border-slate-100 dark:border-slate-800"
                     >
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                 {entry.creatorPhoto ? (
                                   <img src={entry.creatorPhoto} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <UserIcon className="w-5 h-5" />
                                   </div>
                                 )}
                              </div>
                              <div>
                                 <h3 className="font-bold text-[var(--text-primary)] leading-none">{entry.creatorName}</h3>
                                 <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    <Clock className="w-3 h-3" />
                                    {entry.timestamp?.toDate()?.toLocaleString('ar-EG')}
                                 </div>
                              </div>
                           </div>
                           {(isOwner || isAdmin) && (
                             <button 
                               onClick={() => deleteEntry(entry.id)}
                               className="p-2 text-slate-300 hover:text-red-500 transition-all"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                           )}
                        </div>

                        {entry.content && (
                          <p className="text-[var(--text-primary)] text-lg leading-relaxed whitespace-pre-wrap mb-6">
                            {entry.content}
                          </p>
                        )}

                        {entry.images && entry.images.length > 0 && (
                          <div className={`grid gap-2 mb-4 ${
                            entry.images.length === 1 ? 'grid-cols-1' : 
                            entry.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
                          }`}>
                             {entry.images.map((img: string, i: number) => (
                               <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:opacity-90 transition-opacity cursor-pointer">
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                               </div>
                             ))}
                          </div>
                        )}

                        <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                           <button 
                             onClick={() => setExpandedComments(expandedComments === entry.id ? null : entry.id)}
                             className={`flex items-center gap-2 font-bold text-sm transition-all ${expandedComments === entry.id ? 'text-purple-600' : 'text-slate-400 hover:text-purple-600'}`}
                           >
                              <MessageSquare className="w-5 h-5" />
                              {entry.commentCount || 0}
                           </button>
                        </div>

                        <AnimatePresence>
                           {expandedComments === entry.id && (
                             <motion.div 
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden bg-slate-50 dark:bg-slate-900/50 -mx-6 mt-6 px-6 py-6 border-t border-slate-100 dark:border-slate-800"
                             >
                                <div className="space-y-6 mb-8">
                                   {comments.map(comment => (
                                     <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                           {comment.creatorPhoto ? <img src={comment.creatorPhoto} alt="" className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 m-2 text-slate-400"/>}
                                        </div>
                                        <div className="flex-1">
                                           <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-2xl rounded-tr-none shadow-sm inline-block min-w-[200px]">
                                              <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-1">{comment.creatorName}</p>
                                              <p className="text-[var(--text-primary)] text-sm font-medium">{comment.content}</p>
                                           </div>
                                           <div className="flex items-center gap-4 mt-2 px-1">
                                              {(comment.creatorId === user?.uid || isAdmin) && (
                                                <button onClick={() => deleteComment(entry.id, comment.id)} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1">
                                                   <Trash2 className="w-3 h-3"/>
                                                   حذف
                                                </button>
                                              )}
                                              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{comment.timestamp?.toDate()?.toLocaleTimeString('ar-EG')}</span>
                                           </div>
                                        </div>
                                     </div>
                                   ))}
                                </div>

                                <div className="flex gap-4">
                                   <input 
                                     type="text" 
                                     value={commentInput}
                                     onChange={e => setCommentInput(e.target.value)}
                                     placeholder="اكتب تعليقاً..."
                                     onKeyDown={e => e.key === 'Enter' && addComment(entry.id)}
                                     className="flex-1 bg-[var(--bg-primary)] border-none rounded-2xl px-6 py-3 text-[var(--text-primary)] font-bold text-sm shadow-sm"
                                   />
                                   <button 
                                     onClick={() => addComment(entry.id)}
                                     className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-md"
                                   >
                                      <Send className="w-5 h-5 rtl:rotate-180" />
                                   </button>
                                </div>
                             </motion.div>
                           )}
                        </AnimatePresence>
                     </motion.div>
                   );
                 })
               ) : (
                 <div className="text-center p-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">كن أول من يشارك تعبيراً في المجتمع</h3>
                 </div>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
