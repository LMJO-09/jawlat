import React from 'react';
import { motion } from 'motion/react';
import { Target, Calendar, Edit3, Shield, Star, Layout } from 'lucide-react';

interface Props {
  onNavigate: (page: any) => void;
}

export default function LandingPage({ onNavigate }: Props) {
  return (
    <div className="bg-white dark:bg-gray-900 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl"
        >
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-blue-600 uppercase bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-200">
            مرحباً بك في نظام الجولات
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white leading-tight">
            نظم وقتك، زد إنتاجيتك <br />
            <span className="text-blue-600">بأسلوب ذكي ومتكامل</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            منصة متكاملة لإدارة الجولات الدراسية والعملية، مع نظام تفاعلي للمناقشة، جداول مرنة، وأدوات تعبيرية متطورة.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onNavigate('auth')}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              ابدأ الآن مجاناً
            </button>
            <button
              onClick={() => {
                const features = document.getElementById('features');
                features?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all dark:bg-gray-800 dark:text-white"
            >
              اكتشف المميزات
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-800/50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold dark:text-white mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-gray-600 dark:text-gray-400">صُمم النظام ليوفر لك تجربة مستخدم سلسة واحترافية</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Target className="w-8 h-8 text-blue-500" />}
              title="نظام الجولات"
              description="حدد مدة الجولة، وقت البريك، وتابع التوقيت التنازلي بدقة مع تنبيهات ذكية."
            />
            <FeatureCard
              icon={<Calendar className="w-8 h-8 text-green-500" />}
              title="الجداول الذكية"
              description="نظم مواعيدك ومهامك اليومية بسهولة مع إمكانية التحويل لملفات PDF."
            />
            <FeatureCard
              icon={<Edit3 className="w-8 h-8 text-purple-500" />}
              title="مساحة التعبير"
              description="دون أفكارك، خواطرك، أو ملاحظاتك في مساحة مخصصة للإبداع."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-red-500" />}
              title="إدارة متقدمة"
              description="نظام رقابة وحظر متطور لضمان بيئة عمل آمنة ومريحة للجميع."
            />
            <FeatureCard
              icon={<Star className="w-8 h-8 text-yellow-500" />}
              title="نظام الشعلة"
              description="احصل على تميز بجانب اسمك عند مشاركتك النشطة في الجولات."
            />
            <FeatureCard
              icon={<Layout className="w-8 h-8 text-cyan-500" />}
              title="تعدد الثيمات"
              description="اختر المظهر الذي يريح عينيك من بين مجموعة متنوعة من الألوان والثيمات."
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 dark:text-white">نبذة عن الموقع</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            نظام الجولات هو رفيقك الأمثل في رحلة الإنجاز. سواء كنت طالباً يطمح للتركيز في دراسته أو مبرمجاً يبحث عن الإنتاجية القصوى، نوفر لك الأدوات اللازمة لتقسيم وقتك بشكل علمي (تقنية بومودورو المطورة) مع مساحة للتواصل الاجتماعي الهادف خلال فترات الراحة.
          </p>
          <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              "نحن نؤمن أن الوقت هو أثمن ما نملك، وإدارته بحكمة هي مفتاح النجاح."
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 dark:border-gray-800 px-4 text-center">
        <p className="text-gray-500 dark:text-gray-500">
          © 2026 نظام الجولات. جميع الحقوق محفوظة.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}
