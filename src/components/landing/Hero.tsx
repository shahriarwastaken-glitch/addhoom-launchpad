import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import mockup1 from '@/assets/dashboard-mockup-1.png';
import mockup2 from '@/assets/dashboard-mockup-2.png';
import mockup3 from '@/assets/dashboard-mockup-3.png';

const toBengali = (n: number) => {
  const str = Number.isInteger(n) ? n.toString() : n.toFixed(1);
  return str.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
};

const stats = [
  { value: 4.2, suffix: 'x', label: { bn: 'গড় ROAS', en: 'Avg ROAS' }, color: 'bg-primary' },
  { value: 87, suffix: '%', label: { bn: 'AI নির্ভুলতা', en: 'AI Accuracy' }, color: 'bg-brand-green' },
  { value: 50, suffix: '+', label: { bn: 'বিজ্ঞাপন ৩০ সেকেন্ডে', en: 'Ads in 30s' }, color: 'bg-brand-yellow' },
  { value: 24, suffix: '/৭', label: { bn: 'অটো অপ্টিমাইজেশন', en: 'Auto Optimization' }, color: 'bg-brand-purple' },
];

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);
  const display = target < 10 ? toBengali(parseFloat(val.toFixed(1))) : toBengali(Math.floor(val));
  return <span className="font-mono text-3xl font-bold">{display}{suffix}</span>;
}

const floatingShapes = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 4 + Math.random() * 8,
  left: Math.random() * 100,
  delay: Math.random() * 8,
  duration: 8 + Math.random() * 8,
  type: ['●', '★', '◆'][i % 3],
  color: ['text-primary', 'text-brand-yellow', 'text-brand-green'][i % 3],
}));

const dashScreens = ['AI বিজ্ঞাপন জেনারেটর', 'AI চ্যাট অ্যাসিস্ট্যান্ট', 'অ্যাকাউন্ট ডাক্তার'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const Hero = () => {
  const { t } = useLanguage();
  const [activeScreen, setActiveScreen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveScreen(s => (s + 1) % 3), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const pills = ['Daraz সেলার', 'Facebook Shop', 'Instagram Store', 'D2C ব্র্যান্ড'];

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-4 overflow-hidden">
      <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-gradient-brand opacity-[0.12] blur-[120px] animate-breathe" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-green opacity-[0.12] blur-[120px] animate-breathe" style={{ animationDelay: '3s' }} />

      {floatingShapes.map(s => (
        <span key={s.id} className={`absolute ${s.color} opacity-30 animate-float pointer-events-none`}
          style={{ left: `${s.left}%`, bottom: '-20px', fontSize: `${s.size}px`, animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }}>
          {s.type}
        </span>
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
          <span className="text-sm font-medium font-body-bn text-primary">
            🇧🇩 {t('বাংলাদেশের ই-কমার্সের জন্য AI মার্কেটিং', 'AI Marketing for Bangladesh E-commerce')}
          </span>
        </motion.div>

        <motion.h1 variants={itemVariants} className="font-heading-bn font-extrabold leading-[1.1] tracking-[-0.02em] mb-6"
          style={{ fontSize: 'clamp(42px, 6vw, 80px)' }}>
          <span className="block text-foreground">{t('আপনার শপের বিজ্ঞাপন', "Your Shop's Ads")}</span>
          <span className="block text-gradient-brand">{t('এখন AI দিয়ে ধুম তুলবে', 'Now Powered by AI')}</span>
        </motion.h1>

        <motion.p variants={itemVariants} className="text-muted-foreground text-lg max-w-[560px] mb-8 font-body-bn" style={{ lineHeight: '1.75' }}>
          {t('Facebook, Google, Instagram — সব এক জায়গায়। বাংলায়। মিনিটে।', 'Facebook, Google, Instagram — all in one place. In Bangla. In minutes.')}
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link to="/auth" className="bg-gradient-cta text-primary-foreground rounded-full px-8 py-4 text-lg font-semibold shadow-orange-glow hover:scale-[1.04] transition-transform animate-pulse-glow font-body-bn">
            {t('শুরু করুন', 'Get Started')}
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['র', 'ত', 'না', 'ক', 'স'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-brand border-2 border-card flex items-center justify-center text-xs text-primary-foreground font-bold">{c}</div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground font-body-bn">
              {t('৫০০+ বাংলাদেশী শপ ইতিমধ্যে ব্যবহার করছে', '500+ Bangladeshi shops already using')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-brand-yellow text-sm">
            ★★★★★ <span className="text-muted-foreground font-mono">4.9/5</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mb-12">
          <span className="text-xs text-muted-foreground font-body-bn mr-1">{t('পারফেক্ট ফর:', 'Perfect for:')}</span>
          {pills.map(p => (
            <span key={p} className="text-xs border border-primary/30 text-primary rounded-full px-3 py-1 font-body-bn">{p}</span>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-16">
          {stats.map((s, i) => (
            <motion.div key={i} className="bg-card rounded-2xl p-5 shadow-warm flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}>
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <AnimatedCounter target={s.value} suffix={s.suffix} inView={inView} />
              <span className="text-xs text-muted-foreground font-body-bn">{t(s.label.bn, s.label.en)}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="w-full max-w-3xl perspective-[1000px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
        >
          <motion.div
            className="bg-card rounded-3xl shadow-warm-lg border border-border overflow-hidden"
            style={{ rotateX, rotateY }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-brand-yellow/60" />
                <div className="w-3 h-3 rounded-full bg-brand-green/60" />
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground font-mono">addhoom.com/dashboard</div>
            </div>
            <div className="relative h-[300px] md:h-[400px] bg-background overflow-hidden">
              {[mockup1, mockup2, mockup3].map((img, i) => (
                <img key={i} src={img} alt={dashScreens[i]}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === activeScreen ? 'opacity-100' : 'opacity-0'}`} />
              ))}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {dashScreens.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === activeScreen ? 'bg-primary' : 'bg-border'}`} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
