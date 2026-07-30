import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

function useMouseParallax(strength = 20) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const handler = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseX.set(((e.clientX - cx) / cx) * strength);
      mouseY.set(((e.clientY - cy) / cy) * strength);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseX, mouseY, strength]);

  return { smoothX, smoothY };
}

function ParticleField({ count = 25 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 12 + 8,
    delay: Math.random() * 6,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0.06 }}
          animate={{ y: [0, -60, 0], opacity: [0.03, 0.12, 0.03] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function Scene3D({ children, borderColor = 'border-white/10' }) {
  const ref = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const smoothRotX = useSpring(rotX, { stiffness: 150, damping: 20 });
  const smoothRotY = useSpring(rotY, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotX.set(((e.clientY - cy) / rect.height) * -15);
    rotY.set(((e.clientX - cx) / rect.width) * 15);
  };

  const handleMouseLeave = () => {
    rotX.set(0);
    rotY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px', rotateX: smoothRotX, rotateY: smoothRotY }}
      className={`w-full h-full rounded-2xl border ${borderColor} bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing`}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Subtle gloss */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none z-10 rounded-2xl" />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative z-20 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
}

function Chapter({ number, label, flip = false, visual, children }) {
  return (
    <motion.section
      className="relative my-24 md:my-36"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Chapter divider */}
      <div className="flex items-center gap-4 mb-10">
        <span className="text-[10px] font-mono text-white/25 tracking-[0.35em] uppercase">{number}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className={`flex flex-col ${flip ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-20 items-start md:items-center`}>
        {/* Text */}
        <div className="flex-1 min-w-0">{children}</div>

        {/* Visual — responsive height */}
        <div className="flex-shrink-0 w-full md:w-[400px] h-72 md:h-[340px]">
          {visual}
        </div>
      </div>
    </motion.section>
  );
}

function PaywallScene() {
  const [cracked, setCracked] = useState(false);

  return (
    <Scene3D borderColor="border-white/10">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">

        {/* VeggieMap Stall */}
        <motion.div
          className="absolute bottom-6 left-6 md:bottom-10 md:left-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-24 h-20 md:w-28 md:h-24 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent rounded-xl" />
            <span className="text-2xl md:text-3xl">🥦</span>
            <span className="text-[8px] md:text-[9px] font-mono text-zinc-500 mt-1 tracking-wide">VeggieMap</span>
            {['₹5', '₹5', '₹5'].map((p, i) => (
              <motion.div
                key={i}
                className="absolute text-[8px] md:text-[9px] font-mono font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/50"
                style={{ top: -10 - i * 16, left: 4 + i * 18 }}
                animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.35 }}
              >
                {p}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Twilio Block */}
        <motion.div
          className="absolute top-6 left-1/2 cursor-pointer z-10"
          style={{ x: "-50%" }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => setCracked(c => !c)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <motion.div
            className={`w-48 md:w-56 h-12 md:h-14 rounded-xl border flex items-center justify-center gap-2 md:gap-3 relative overflow-hidden transition-colors duration-300 ${cracked ? 'border-zinc-700 bg-zinc-950' : 'border-red-900 bg-red-950/70'}`}
            animate={cracked ? { rotate: [0, -2, 2, 0], scale: [1, 1.04, 0.97, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent" />
            {cracked ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xl md:text-2xl">💥</motion.div>
            ) : (
              <>
                <span className="text-lg md:text-xl">🔒</span>
                <div>
                  <div className="text-[10px] md:text-xs font-bold text-white font-mono leading-tight">API PAYWALL</div>
                  <div className="text-[8px] md:text-[9px] text-red-400 font-mono">₹5 per SMS · Twilio</div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Calculator */}
        <motion.div
          className="absolute top-20 right-4 md:top-14 md:right-8"
          animate={{ y: [0, -10, 0], rotate: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-16 h-24 md:w-[72px] md:h-[100px] bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center overflow-hidden shadow-lg">
            <div className="w-full bg-red-950/80 flex items-center justify-end px-2 py-1 md:py-1.5">
              <span className="text-red-400 font-mono text-[9px] md:text-[10px] font-bold">₹2,500</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1.5 md:p-2 mt-0.5 md:mt-1">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                <div key={n} className="w-3.5 h-3.5 bg-zinc-800 border border-zinc-700/50 rounded-sm flex items-center justify-center text-[7px] text-zinc-500 font-mono">{n}</div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Scene3D>
  );
}

function GapScene() {
  const [attempting, setAttempting] = useState(false);

  const tryConnect = () => {
    setAttempting(true);
    setTimeout(() => setAttempting(false), 2200);
  };

  return (
    <Scene3D borderColor="border-white/10">
      <div className="relative w-full h-full flex items-center justify-between px-8">

        {/* EC2 Server */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 z-10"
        >
          <div className="w-24 h-36 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center justify-center p-3 gap-2 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
            <span className="text-2xl">🖥️</span>
            <div className="w-full space-y-1">
              <div className="h-1 bg-green-500/25 rounded-full w-full" />
              <div className="h-1 bg-zinc-800 rounded-full w-3/4" />
              <div className="h-1 bg-zinc-800 rounded-full w-1/2" />
            </div>
          </div>
          <span className="text-[9px] font-mono text-white/30 tracking-widest">EC2-CLOUD</span>
          <span className="text-[8px] font-mono text-amber-500/60 bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded-full">AWS</span>
        </motion.div>

        {/* Broken Line */}
        <div className="flex-1 flex flex-col items-center gap-3 relative">
          <AnimatePresence>
            {attempting && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute -top-10 bg-zinc-950 border border-red-900/60 text-red-400 text-[9px] font-mono px-3 py-1 rounded-full whitespace-nowrap"
              >
                ❌ Connection refused — different network
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full flex items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} className="h-px bg-white/20 flex-1"
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <motion.span
              className="text-red-500 text-base font-bold mx-1"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >✕</motion.span>
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} className="h-px bg-white/20 flex-1"
                animate={{ opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 + 0.6 }}
              />
            ))}
          </div>
          <span className="text-[8px] text-red-400/70 font-mono tracking-widest whitespace-nowrap">LOCAL NETWORK ONLY</span>
        </div>

        {/* Phone */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 z-10"
        >
          <div className="w-20 h-36 bg-zinc-950 border-2 border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xl relative overflow-hidden">
            <div className="absolute top-2 w-7 h-1 bg-zinc-700 rounded-full" />
            <span className="text-2xl">📱</span>
          </div>
          <span className="text-[9px] font-mono text-white/30 tracking-widest">LOCAL DEVICE</span>
          <span className="text-[8px] font-mono text-indigo-400/60 bg-indigo-950/40 border border-indigo-800/30 px-2 py-0.5 rounded-full">SIM CARD</span>
        </motion.div>
      </div>
    </Scene3D>
  );
}

function AhaScene() {
  const [lit, setLit] = useState(false);

  return (
    <Scene3D borderColor="border-white/10">
      <div className="relative w-full h-full flex items-center justify-center">

        {/* Glow aura */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ opacity: lit ? [0.2, 0.6, 0.2] : 0 }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ background: 'radial-gradient(circle at 50% 55%, rgba(250,204,21,0.35) 0%, transparent 65%)' }}
        />

        {/* Orbiting labels when lit */}
        {lit && ['CS Student', 'Indie Dev', 'Startup', 'You?'].map((label, i) => (
          <motion.div
            key={label}
            className="absolute text-[9px] font-mono text-yellow-300/70 bg-yellow-950/60 border border-yellow-800/40 px-2 py-0.5 rounded-full whitespace-nowrap"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: Math.cos((i * 90) * Math.PI / 180) * 110,
              y: Math.sin((i * 90) * Math.PI / 180) * 70,
            }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}

        {/* Lightbulb */}
        <motion.button
          onClick={() => setLit(l => !l)}
          className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 z-10 cursor-pointer ${lit ? 'border-yellow-400/60 bg-yellow-500/10' : 'border-zinc-800 bg-zinc-950'}`}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={lit ? { boxShadow: ['0 0 0px rgba(250,204,21,0)', '0 0 60px rgba(250,204,21,0.5)', '0 0 30px rgba(250,204,21,0.2)'] } : { boxShadow: '0 0 0px transparent' }}
          transition={{ duration: 1.5, repeat: lit ? Infinity : 0 }}
        >
          <span className={`text-5xl transition-all duration-500 ${lit ? '' : 'grayscale opacity-40'}`}>💡</span>
        </motion.button>

        {/* Shards */}
        {lit && [...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/30 border border-yellow-400/50 rounded-sm"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: Math.cos((i * 45) * Math.PI / 180) * 120,
              y: Math.sin((i * 45) * Math.PI / 180) * 80,
              rotate: i * 55,
              opacity: [0, 0.8, 0.4],
            }}
            transition={{ duration: 0.7, delay: i * 0.04, ease: 'easeOut' }}
          />
        ))}
      </div>
    </Scene3D>
  );
}

function SolutionScene() {
  const [step, setStep] = useState(0);
  const steps = ['Sign up', 'Get API Key', 'Integrate', 'Connect App'];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <Scene3D borderColor="border-white/10">
      <div className="relative w-full h-full flex items-center justify-center gap-6 px-6">

        {/* Dashboard */}
        <motion.div
          className="w-44 h-52 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col flex-shrink-0"
          animate={{ y: [0, -8, 0], rotateY: [0, 2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-7 border-b border-zinc-800 flex items-center px-3 gap-1.5 bg-zinc-900/60">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
            <span className="text-[8px] font-mono text-white/20 ml-auto">smsgateway</span>
          </div>
          <div className="flex-1 p-3 space-y-1.5">
            {steps.map((s, i) => (
              <motion.div
                key={s}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-[9px] font-mono transition-all ${i <= step ? 'bg-white/5 text-white' : 'text-zinc-600'}`}
                animate={{ x: i === step ? [0, 2, 0] : 0 }}
                transition={{ duration: 0.4 }}
              >
                <span className={`text-[10px] ${i < step ? 'text-green-400' : i === step ? 'text-white' : 'text-zinc-700'}`}>
                  {i < step ? '✓' : i === step ? '›' : '○'}
                </span>
                <span>{s}</span>
              </motion.div>
            ))}
          </div>
          <div className="h-7 border-t border-zinc-800 flex items-center justify-center bg-zinc-900/60">
            <motion.span
              className="text-[8px] font-mono text-green-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity }}
            >● LIVE</motion.span>
          </div>
        </motion.div>

        {/* Data flow */}
        <div className="flex flex-col items-center gap-1">
          {[0, 0.5, 1.0].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/60"
              animate={{ x: [0, 36], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay, ease: 'easeInOut' }}
            />
          ))}
          <span className="text-[8px] font-mono text-white/20 mt-1 whitespace-nowrap">SECURE API</span>
        </div>

        {/* Phone with OTP */}
        <motion.div
          className="w-20 h-40 bg-zinc-950 border-2 border-zinc-700 rounded-2xl flex flex-col items-center justify-center shadow-xl relative overflow-hidden flex-shrink-0"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute top-2 w-7 h-1 bg-zinc-700 rounded-full" />
          <AnimatePresence mode="wait">
            {step === 3 ? (
              <motion.div key="otp" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-center px-2">
                <div className="text-xl mb-1">📩</div>
                <div className="text-[8px] font-mono text-green-400 bg-green-950/50 border border-green-800/40 px-1.5 py-1 rounded text-center leading-tight">
                  OTP<br />847291
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" exit={{ opacity: 0 }} className="text-center">
                <div className="text-xl">📱</div>
                <div className="text-[8px] text-white/20 font-mono mt-1">ready</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute bottom-3 w-10 h-0.5 bg-green-500/60 rounded-full animate-pulse" />
        </motion.div>
      </div>
    </Scene3D>
  );
}

export default function Story() {
  const { smoothX, smoothY } = useMouseParallax(6);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans relative selection:bg-white/20 w-full">
      <ParticleField />

      {/* Ambient gradient */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle 700px at 50% 40%, rgba(255,255,255,0.025) 0%, transparent 70%)',
          x: smoothX,
          y: smoothY,
        }}
      />

      {/* ── Nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]"
      >
        <Link to="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
          ← SMS Gateway
        </Link>
        <Link to="/docs" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
          Docs →
        </Link>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 md:pt-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {/* Book cover */}
          <motion.div
            className="mx-auto mb-10 md:mb-14 relative"
            style={{ perspective: '1000px' }}
          >
            <motion.div
              className="w-44 h-60 sm:w-56 sm:h-72 mx-auto rounded-r-2xl bg-zinc-950 border border-white/10 flex flex-col items-center justify-center gap-4 relative overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
              animate={{ rotateY: [0, 4, -4, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Subtle pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
              {/* Left spine line */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black to-transparent" />

              <motion.span className="text-5xl relative z-10" animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                📖
              </motion.span>
              <div className="text-center relative z-10 px-6">
                <p className="text-[9px] font-mono text-white/30 tracking-[0.3em] uppercase mb-2">The Story Behind</p>
                <h3 className="text-lg font-bold text-white leading-snug">SMS Gateway</h3>
                <p className="text-[10px] font-mono text-white/30 mt-3">Vinay Kumar</p>
              </div>
            </motion.div>
            {/* Shadow under book */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-36 h-6 bg-black/70 blur-xl rounded-full" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-none mb-6">
            Why I Built a<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-300 to-zinc-500">
              Free SMS Gateway
            </span>
          </h1>

          <p className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed mb-10">
            Every great tool usually starts with a developer running into a wall.<br />
            <span className="text-zinc-300">For me, that wall was an API paywall.</span>
          </p>

          <motion.p
            animate={{ opacity: [0.25, 0.6, 0.25], y: [0, 4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="text-[11px] font-mono text-white/25 tracking-widest"
          >
            ↓ scroll to read
          </motion.p>
        </motion.div>
      </section>

      {/* ── CHAPTERS ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">

        {/* ─ Chapter 01: The Paywall ─ */}
        <Chapter number="Chapter 01" label="The API Paywall" visual={<PaywallScene />}>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
              The API Paywall
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              While developing <a href="https://veggiemap.codewithvin.app" target="_blank" rel="noreferrer" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all">VeggieMap</a>, a hyperlocal marketplace, I reached a crucial milestone: I needed a secure way to verify the phone numbers of vendors onboarding onto the platform. I figured it would be as simple as plugging in an SMS API.
            </p>
            <p className="text-zinc-400 text-lg leading-relaxed">
              So I went online, found Twilio, and checked the pricing.
            </p>
            <div className="inline-block px-4 py-3 bg-zinc-950 border border-white/10 rounded-xl">
              <span className="text-2xl font-black text-white font-mono">₹5 per SMS.</span>
            </div>
            <p className="text-zinc-500 text-lg leading-relaxed">
              As a college student bootstrapping my own projects, sinking my pocket money into a basic OTP service just wasn't sustainable.
            </p>
            <div className="p-5 border border-white/[0.07] bg-zinc-950 rounded-xl">
              <p className="text-[11px] font-mono text-white/40 tracking-widest uppercase mb-2">💡 Did You Know?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Most standard SMS SaaS platforms are built for enterprise budgets, not developers. If a student project gets a spike of <strong className="text-white">500 sign-ups</strong>, standard API costs could drain their monthly budget in a single afternoon.
              </p>
            </div>
          </div>
        </Chapter>

        {/* ─ Chapter 02: The Search ─ */}
        <Chapter number="Chapter 02" label="The Dead End" flip visual={<GapScene />}>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
              The Search for the<br />"Resend of SMS"
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              I love tools like Resend that offer generous free tiers — like 1,000 emails a day — for developers to test and showcase their skills. I scoured the internet looking for an SMS equivalent: a platform that would let me send just enough free OTPs and welcome messages to get my project off the ground.
            </p>
            <p className="text-xl font-semibold text-white">
              I found absolutely nothing.
            </p>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Eventually, I stumbled across a workaround: a project that allowed you to send SMS directly from your own mobile device. It sounded perfect — but there was a massive catch. The server and the mobile app had to be on the <strong className="text-white">exact same local network</strong>.
            </p>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Since my VeggieMap backend was deployed in the cloud on an AWS EC2 instance, there was zero chance my server and my physical phone were going to share a local IP address. The solution was a dead end.
            </p>
          </div>
        </Chapter>

        {/* ─ Chapter 03: Aha Moment ─ */}
        <Chapter number="Chapter 03" label='The "Aha!" Moment' visual={<AhaScene />}>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
              The "Aha!" Moment
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              That roadblock sparked a realization. If I was struggling with this, how many other CS students, indie developers, and early-stage startups were facing the exact same problem?
            </p>
            <blockquote className="border-l border-white/20 pl-6 py-1">
              <p className="text-xl md:text-2xl font-semibold text-white leading-snug">
                "Why should anyone be priced out of building a fully functional, secure application just to showcase their skills?"
              </p>
            </blockquote>
            <p className="text-zinc-400 text-lg leading-relaxed">
              That motivation led to the creation of SMS Gateway. I decided to build an SMS gateway that bridges the gap between cloud servers and a physical device — empowering you to use your own mobile phone and SIM card as a dedicated SMS service, completely bypassing expensive SaaS fees.
            </p>
          </div>
        </Chapter>

        {/* ─ Chapter 04: The Solution ─ */}
        <Chapter number="Chapter 04" label="Built for Developers" flip visual={<SolutionScene />}>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
              Built for Developers,<br />by a Developer
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Whether you are a student building a college project, a QA tester needing to automate alerts, or a startup validating an idea — this tool is for you.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {[['🔒', 'OTP Verifications'], ['👋', 'Welcome Messages'], ['🚨', 'System Alerts']].map(([emoji, label]) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-default"
                  whileHover={{ x: 4 }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-zinc-300 font-medium">{label}</span>
                </motion.div>
              ))}
            </div>

            <div>
              <p className="text-[11px] font-mono text-white/30 tracking-widest uppercase mb-3">How it works</p>
              <div className="space-y-2">
                {[
                  'Sign up on the SMS Gateway dashboard.',
                  'Generate your unique API key.',
                  'Integrate the API into your codebase.',
                  'Connect our mobile app and let your phone do the heavy lifting!',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono text-white/30 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                    <span className="text-zinc-400 text-sm leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-zinc-500 text-sm border-t border-white/[0.06] pt-5">
              No massive bills. No restrictive local-network limitations. Just a seamless, free way to handle SMS delivery.
            </p>
          </div>
        </Chapter>

      </div>

      {/* ── CTA / Epilogue ── */}
      <motion.section
        className="text-center py-40 px-6 relative z-10"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-mono text-white/25 tracking-[0.4em] uppercase mb-6">Epilogue</p>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            Ready to stop paying<br />for OTPs and start building?
          </h2>
          <p className="text-zinc-500 text-lg mb-12 max-w-lg mx-auto">
            No massive bills. No restrictive local-network limitations. Just a seamless, free way to handle SMS delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-100 transition-all"
            >
              Check out our documentation →
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/15 text-zinc-300 font-medium text-sm hover:bg-white/5 transition-all"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
