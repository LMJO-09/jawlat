import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User as UserIcon, 
  Camera, 
  ChevronLeft, 
  Mail, 
  Key, 
  Flame,
  Shield,
  Save,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Props {
  onNavigate: (page: any) => void;
}

export default function ProfilePage({ onNavigate }: Props) {
  const { profile, isAdmin } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: name,
        photoURL: photoURL
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span>العودة للرئيسية</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Avatar & Badges */}
          <div className="md:col-span-1 border-r border-gray-100 dark:border-gray-800 pr-0 md:pr-8">
            <div className="relative w-48 h-48 mx-auto mb-8">
               <div className="w-full h-full rounded-[3rem] overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl relative">
                  <img 
                    src={photoURL || `https://ui-avatars.com/api/?name=${name}&size=200`} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                     <Camera className="w-10 h-10 text-white" />
                  </div>
               </div>
               {profile?.hasFlame && (
                 <div className="absolute -top-4 -right-4 bg-orange-500 text-white p-3 rounded-2xl shadow-xl animate-pulse">
                    <Flame className="w-6 h-6 fill-current" />
                 </div>
               )}
            </div>
            
            <div className="space-y-4">
               <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${isAdmin ? 'bg-yellow-500/10 text-yellow-600' : 'bg-blue-500/10 text-blue-600'}`}>
                     {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase">الرتبة</p>
                     <p className="font-bold dark:text-white">{isAdmin ? 'مدير النظام' : 'مستخدم مميز'}</p>
                  </div>
               </div>
               
               <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                     <Flame className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase">المستوى</p>
                     <p className="font-bold dark:text-white">{profile?.hasFlame ? 'نشط جداً' : 'مبتدئ'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Settings Form */}
          <div className="md:col-span-2">
            <h1 className="text-4xl font-bold dark:text-white mb-8">إعدادات الحساب الشخصي</h1>
            
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2">إسم المستخدم</label>
                <div className="relative">
                   <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                   <input 
                     type="text" 
                     value={name}
                     onChange={e => setName(e.target.value)}
                     className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2">البريد الإلكتروني</label>
                <div className="relative opacity-50 cursor-not-allowed">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                   <input 
                     type="email" 
                     readOnly
                     value={profile?.email}
                     className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-transparent shadow-inner outline-none dark:text-gray-500 cursor-not-allowed"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2">رابط الصورة الشخصية</label>
                <input 
                  type="text" 
                  value={photoURL}
                  onChange={e => setPhotoURL(e.target.value)}
                  placeholder="ضع رابط الصورة هنا..."
                  className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-none ${
                    success ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : success ? (
                    <>
                      <Shield className="w-6 h-6" />
                      تم الحفظ بنجاح
                    </>
                  ) : (
                    <>
                      <Save className="w-6 h-6" />
                      حفظ التغييرات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
