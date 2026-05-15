import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  Heart, 
  Share2, 
  MoreVertical, 
  ChevronLeft,
  X,
  Send,
  User as UserIcon,
  Globe,
  Clock,
  Trash2,
  Reply as ReplyIcon,
  ShieldCheck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { SharedContent, Comment, Reply } from '../types';

interface Props {
  onNavigate: (page: any) => void;
}

export default function CommunityPage({ onNavigate }: Props) {
  const { user, profile, isAdmin } = useAuth();
  const [posts, setPosts] = useState<SharedContent[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Media states
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [duration, setDuration] = useState(24); // Default 24 hours
  
  // Interaction states
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyInput, setReplyInput] = useState<{id: string, text: string} | null>(null);
  const [config, setConfig] = useState<any>({ communityEnabled: true, communityMessage: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Config
    const unsubscribeConfig = onSnapshot(doc(db, 'app', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data());
      }
    });

    const q = query(
      collection(db, 'content'),
      where('type', '==', 'community'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SharedContent));
      // Filter out expired posts
      const now = new Date();
      setPosts(allPosts.filter(p => !p.expiresAt || p.expiresAt.toDate() > now));
      setLoading(false);
    });
    return () => {
      unsubscribe();
      unsubscribeConfig();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'pdf') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 2 * 1024 * 1024 && type === 'image') {
        alert('حجم الصورة كبير جداً (الأقصى 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'image') setImages(prev => [...prev, result]);
        if (type === 'video') setVideos(prev => [...prev, result]);
        if (type === 'pdf') setPdfs(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!inputText.trim() && images.length === 0 && videos.length === 0 && pdfs.length === 0) return;

    // Default duration: from state
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + duration);

    try {
      await addDoc(collection(db, 'content'), {
        type: 'community',
        content: inputText,
        images,
        videos,
        pdfs,
        creatorId: user.uid,
        creatorName: profile.displayName,
        creatorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        likes: [],
        expiresAt: Timestamp.fromDate(expiresAt),
        commentCount: 0
      });
      setInputText('');
      setImages([]);
      setVideos([]);
      setPdfs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLike = async (post: SharedContent) => {
    if (!user) return;
    const isLiked = post.likes?.includes(user.uid);
    const postRef = doc(db, 'content', post.id);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const deletePost = async (id: string) => {
    if (confirm('حذف هذا المنشور؟')) {
      await deleteDoc(doc(db, 'content', id));
    }
  };

  // Comments Logic
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
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    });
    return () => unsubscribe();
  }, [expandedComments]);

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
      // Update count
      const postRef = doc(db, 'content', postId);
      await updateDoc(postRef, {
        commentCount: (posts.find(p => p.id === postId)?.commentCount || 0) + 1
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addReply = async (postId: string, commentId: string) => {
    if (!replyInput?.text.trim() || !user || !profile) return;
    try {
      const commentRef = doc(db, 'content', postId, 'comments', commentId);
      const newReply: Reply = {
        id: Math.random().toString(36).substr(2, 9),
        content: replyInput.text,
        creatorId: user.uid,
        creatorName: profile.displayName,
        creatorPhoto: profile.photoURL,
        timestamp: new Date()
      };
      await updateDoc(commentRef, {
        replies: arrayUnion(newReply)
      });
      setReplyInput(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-[var(--accent-primary)] transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للرئيسية</span>
          </button>
        </div>

        <div className="mb-10 text-center md:text-right">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 flex items-center justify-center md:justify-start gap-3">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
               <Globe className="w-7 h-7" />
            </div>
            مجتمع الجولات
          </h1>
          <p className="text-[var(--text-secondary)] font-bold">تفاعل مع الآخرين، شارك إنجازاتك وافتح آفاقاً جديدة</p>
        </div>

        {(!config.communityEnabled && !isAdmin) ? (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-8 rounded-[2.5rem] text-center mb-12">
             <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
             </div>
             <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-2">المجتمع متوقف مؤقتاً</h3>
             <p className="text-amber-600 dark:text-amber-300 font-medium">
               {config.communityMessage || 'هذا القسم مغلق حالياً للصيانة، نعتذر عن الإزعاج.'}
             </p>
          </div>
        ) : (
          <>
            {/* Create Post Area */}
            <div className="bento-card mb-12 border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
               <form onSubmit={handleAddPost}>
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
                       placeholder="اكتب منشوراً جديداً للمجتمع..."
                       className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-lg resize-none dark:text-white pt-2 font-bold"
                     />
                  </div>

                  {/* Previews */}
                  {(images.length > 0 || videos.length > 0 || pdfs.length > 0) && (
                    <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                       {images.map((img, idx) => (
                         <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                         </div>
                       ))}
                       {videos.map((vid, idx) => (
                         <div key={idx} className="relative w-20 h-20 rounded-xl bg-black flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                            <button type="button" onClick={() => setVideos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                         </div>
                       ))}
                       {pdfs.map((pdf, idx) => (
                         <div key={idx} className="relative w-20 h-20 rounded-xl bg-blue-500 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                            <button type="button" onClick={() => setPdfs(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                         </div>
                       ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex gap-1">
                        <MediaButton icon={<ImageIcon className="w-4 h-4"/>} label="صور" onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = (e) => handleFileUpload(e as any, 'image');
                            input.click();
                        }} />
                        <MediaButton icon={<Video className="w-4 h-4"/>} label="فيديو" onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'video/*';
                            input.onchange = (e) => handleFileUpload(e as any, 'video');
                            input.click();
                        }} />
                        <MediaButton icon={<FileText className="w-4 h-4"/>} label="PDF" onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'application/pdf';
                            input.onchange = (e) => handleFileUpload(e as any, 'pdf');
                            input.click();
                        }} />
                     </div>
                     
                     <div className="flex items-center gap-4">
                        {isAdmin && (
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <select 
                                value={duration} 
                                onChange={e => setDuration(Number(e.target.value))}
                                className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
                              >
                                 <option value={1}>ساعة واحدة</option>
                                 <option value={6}>6 ساعات</option>
                                 <option value={12}>12 ساعة</option>
                                 <option value={24}>يوم كامل</option>
                                 <option value={48}>يومان</option>
                                 <option value={168}>أسبوع</option>
                              </select>
                           </div>
                        )}
                        <button 
                          type="submit"
                          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
                        >
                           نشر الآن
                        </button>
                     </div>
                  </div>
               </form>
            </div>

            {/* Posts List */}
            <div className="space-y-8">
               {loading ? (
                 <div className="flex justify-center p-12">
                   <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                 </div>
               ) : posts.map(post => (
                 <motion.div 
                   key={post.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bento-card border-[var(--card-border)] shadow-lg shadow-indigo-200/10 dark:shadow-none"
                 >
                    {/* Post Header */}
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                             {post.creatorPhoto ? (
                               <img src={post.creatorPhoto} alt="" className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <UserIcon className="w-6 h-6" />
                               </div>
                             )}
                          </div>
                          <div>
                             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                               {post.creatorName}
                               {isAdmin && <ShieldCheck className="w-3 h-3 text-indigo-500" />}
                             </h3>
                             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                <Clock className="w-3 h-3" />
                                {post.timestamp?.toDate()?.toLocaleString('ar-EG')}
                             </div>
                          </div>
                       </div>
                       {(post.creatorId === user?.uid || isAdmin) && (
                         <button onClick={() => deletePost(post.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 className="w-5 h-5" />
                         </button>
                       )}
                    </div>

                    <p className="text-[var(--text-primary)] text-lg leading-relaxed whitespace-pre-wrap mb-6 font-medium">
                      {post.content}
                    </p>

                    {/* Media */}
                    {(post.images?.length || 0) > 0 && (
                      <div className={`grid gap-2 mb-6 ${post.images!.length === 1 ? 'grid-cols-1' : post.images!.length === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
                         {post.images!.map((img, i) => (
                           <img key={i} src={img} alt="" className="rounded-2xl w-full h-64 object-cover border border-slate-100 dark:border-slate-800" />
                         ))}
                      </div>
                    )}
                    
                    {post.videos?.map((vid, i) => (
                       <video key={i} src={vid} controls className="w-full rounded-2xl mb-6 shadow-xl border border-slate-100 dark:border-slate-800 max-h-[500px]" />
                    ))}

                    {post.pdfs?.map((pdf, i) => (
                       <a key={i} href={pdf} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl mb-6 hover:bg-slate-100 transition-all">
                          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white">
                             <FileText className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 dark:text-white text-sm">ملف مرفق (PDF)</p>
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">اضغط للعرض</p>
                          </div>
                       </a>
                    ))}

                    {/* Stats */}
                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <button 
                         onClick={() => toggleLike(post)}
                         className={`flex items-center gap-2 font-bold text-sm transition-all ${post.likes?.includes(user?.uid || '') ? 'text-rose-500 scale-110' : 'text-slate-400 hover:text-rose-500'}`}
                       >
                          <Heart className={`w-5 h-5 ${post.likes?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                          {post.likes?.length || 0}
                       </button>
                       <button 
                         onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                         className={`flex items-center gap-2 font-bold text-sm transition-all ${expandedComments === post.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                       >
                          <MessageSquare className="w-5 h-5" />
                          {post.commentCount || 0}
                       </button>
                       <button className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-emerald-500 transition-all mr-auto">
                          <Share2 className="w-5 h-5" />
                       </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                       {expandedComments === post.id && (
                         <motion.div 
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="overflow-hidden bg-slate-50 dark:bg-slate-900/50 -mx-6 mt-6 px-6 py-6 border-t border-slate-100 dark:border-slate-800"
                         >
                            <div className="space-y-6 mb-8">
                               {comments.map(comment => (
                                 <div key={comment.id} className="group">
                                    <div className="flex gap-3">
                                       <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                          {comment.creatorPhoto ? <img src={comment.creatorPhoto} alt="" className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 m-2 text-slate-400"/>}
                                       </div>
                                       <div className="flex-1">
                                          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-2xl rounded-tr-none shadow-sm inline-block min-w-[200px]">
                                             <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">{comment.creatorName}</p>
                                             <p className="text-[var(--text-primary)] text-sm font-medium">{comment.content}</p>
                                          </div>
                                          <div className="flex items-center gap-4 mt-2 px-1">
                                             <button onClick={() => setReplyInput({id: comment.id, text: ''})} className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                                <ReplyIcon className="w-3 h-3"/>
                                                رد
                                             </button>
                                             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{comment.timestamp?.toDate()?.toLocaleTimeString('ar-EG')}</span>
                                          </div>
                                          
                                          {/* Replies */}
                                          {comment.replies?.map((reply, rid) => (
                                             <div key={rid} className="flex gap-2 mt-4 pr-6">
                                                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                   {reply.creatorPhoto ? <img src={reply.creatorPhoto} alt="" className="w-full h-full object-cover"/> : <UserIcon className="w-3 h-3 m-1.5 text-slate-400"/>}
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl rounded-tr-none text-xs flex-1">
                                                   <p className="font-bold text-indigo-500 mb-1">{reply.creatorName}</p>
                                                   <p className="text-slate-700 dark:text-slate-200">{reply.content}</p>
                                                </div>
                                             </div>
                                          ))}

                                          {/* Reply Input */}
                                          {replyInput?.id === comment.id && (
                                            <div className="mt-4 flex gap-2">
                                               <input 
                                                 type="text" 
                                                 placeholder="اكتب رداً..."
                                                 autoFocus
                                                 value={replyInput.text}
                                                 onChange={e => setReplyInput({...replyInput, text: e.target.value})}
                                                 className="flex-1 bg-[var(--bg-primary)] border-none rounded-xl px-4 py-2 text-xs text-[var(--text-primary)]"
                                               />
                                               <button onClick={() => addReply(post.id, comment.id)} className="bg-indigo-600 text-white p-2 rounded-xl"><Send className="w-3 h-3"/></button>
                                               <button onClick={() => setReplyInput(null)} className="text-slate-400 p-2"><X className="w-3 h-3"/></button>
                                            </div>
                                          )}
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
                                 onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                                 className="flex-1 bg-[var(--bg-primary)] border-none rounded-2xl px-6 py-3 text-[var(--text-primary)] font-bold text-sm shadow-sm"
                               />
                               <button 
                                 onClick={() => addComment(post.id)}
                                 className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md"
                               >
                                  <Send className="w-5 h-5 rtl:rotate-180" />
                               </button>
                            </div>
                         </motion.div>
                       )}
                    </AnimatePresence>
                 </motion.div>
               ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MediaButton({ icon, label, onClick }: any) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="p-3 text-[var(--text-secondary)] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
    >
       {icon}
       <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
