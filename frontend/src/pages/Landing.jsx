import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Smartphone, Zap, Server, Shield, Globe, ArrowRight, Database, Terminal, CheckCircle2, Download } from 'lucide-react';

const StaggerContainer = ({ children, delayOffset = 0, className = "" }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "0px 0px -50px 0px" }}
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.1,
          delayChildren: delayOffset,
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

const FadeUp = ({ children, className = "" }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] } }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Landing() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Parallax for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 selection:text-white overflow-hidden">

      {/* Nav */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -10, scale: 1.05 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden bg-transparent"
            >
              <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-150" />
            </motion.div>
            <span className="font-semibold text-lg tracking-tight text-white">SMSGW</span>
          </div>
          <div className="flex items-center gap-6">
            {token ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium px-4 py-1.5 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm"
              >
                Dashboard
              </button>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium px-4 py-1.5 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 md:pt-24 pb-20 md:pb-32 px-6 flex flex-col items-center justify-center min-h-[80vh] md:min-h-[85vh]">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-5xl mx-auto text-center flex flex-col items-center z-10"
        >

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-white/5 mb-6 sm:mb-8 rounded-full"
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-xs tracking-widest uppercase text-zinc-400 font-semibold">v2.0 is now live</span>
          </motion.div>

          <div className="overflow-hidden mb-8">
            <motion.h1
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.3 }}
              className="text-[40px] sm:text-5xl md:text-7xl lg:text-[100px] font-bold tracking-tighter leading-[1.05] text-white"
            >
              Turn your Android <br className="hidden md:block" /> into an API.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-base sm:text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light mb-8 sm:mb-10"
          >
            Bypass legacy gateways like Twilio and Plivo. Link your smartphone, integrate our API in minutes, and dispatch zero-delay background SMS messages using your unmetered cellular plan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mb-8 sm:mb-10"
          >
            <Link to="/story" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-all group text-sm font-medium border border-white/10 bg-white/[0.02] px-4 py-2 rounded-full hover:border-white/20 hover:bg-white/5">
              <span>📖 Discover why I built SMS Gateway</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
          >
            <Link
              to={token ? "/dashboard" : "/login"}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold text-lg hover:bg-zinc-200 transition-colors rounded-sm w-full sm:w-auto overflow-hidden relative"
            >
              <motion.span
                className="absolute inset-0 bg-zinc-300 origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {token ? "Go to Dashboard" : "Start Routing"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a
              href={import.meta.env.VITE_APP_DOWNLOAD_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 transition-colors rounded-sm w-full sm:w-auto"
            >
              <Download className="w-5 h-5" />
              Download APK
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Hero Terminal Snippet */}
      <section className="px-6 pb-40 relative z-20 w-full overflow-hidden">
        <StaggerContainer className="max-w-4xl mx-auto w-full">
          <FadeUp>
            <motion.div
              whileHover={{ y: -5, boxShadow: "0 20px 80px rgba(255,255,255,0.05)" }}
              transition={{ duration: 0.4 }}
              className="border border-white/10 bg-[#050505] shadow-[0_0_80px_rgba(255,255,255,0.03)] rounded-lg overflow-hidden w-full"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0a]">
                <div className="flex items-center gap-4">
                  <Terminal className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-mono text-zinc-500">POST /api/sms/queue</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
              </div>
              <div className="p-4 sm:p-8 md:p-12 overflow-x-auto w-full">
                <pre className="font-mono text-[13px] sm:text-[15px] leading-loose text-zinc-300">
                  <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                    <span className="text-zinc-600">$</span> curl -X POST {import.meta.env.VITE_API_SNIPPET_URL || 'https://api.yourdomain.com'}/api/sms/queue \
                  </motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                    <span className="text-zinc-600">  -H</span> "x-api-key: your_api_key_here" \
                  </motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                    <span className="text-zinc-600">  -H</span> "Content-Type: application/json" \
                  </motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                    <span className="text-zinc-600">  -d</span> '{'{\n    "to": "+919876543210",\n    "message": "Your OTP is 1234",\n    "type": "otp",\n    "webhookUrl": "https://your-server.com/webhook",\n    "idempotencyKey": "order-12345"\n  }'}'
                  </motion.div>
                </pre>
              </div>
            </motion.div>
          </FadeUp>
        </StaggerContainer>
      </section>

      {/* Spacer / Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center"
      />

      {/* Main Intro for Features */}
      <section className="py-24 md:py-32 px-6 text-center max-w-4xl mx-auto">
        <StaggerContainer>
          <FadeUp>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Built by the developer, for the developer.</h2>
          </FadeUp>
          <FadeUp>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-white/30" />
              <span className="text-sm font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                Lightning Fast
              </span>
              <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-white/30" />
            </div>
          </FadeUp>
          <FadeUp>
            <p className="text-xl text-zinc-400 leading-relaxed font-light">
              We built an enterprise-grade infrastructure so you don't have to. Experience zero-delay message dispatch without draining your phone's battery.
            </p>
          </FadeUp>
        </StaggerContainer>
      </section>

      {/* Feature 1: Reliability */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <StaggerContainer className="flex-1 lg:pr-12">
            <FadeUp>
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 flex items-center justify-center border border-white/20 bg-white/5 rounded-full mb-8"
              >
                <Server className="w-6 h-6 text-white" />
              </motion.div>
            </FadeUp>
            <FadeUp><h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Guaranteed Delivery</h3></FadeUp>
            <FadeUp>
              <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                Never lose a message again. Our intelligent queueing system automatically handles network drops, rate limits, and offline devices. If a message fails, we automatically retry until it's delivered.
              </p>
            </FadeUp>
            <ul className="space-y-4">
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> Built-in rate limit protection</li></FadeUp>
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> Automatic retry mechanisms</li></FadeUp>
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> 99.99% infrastructure uptime</li></FadeUp>
            </ul>
          </StaggerContainer>

          <div className="flex-1 w-full relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -50px 0px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative aspect-square md:aspect-video lg:aspect-square flex items-center justify-center"
            >
              <div className="absolute inset-0 border border-white/10 rounded-2xl bg-[#050505] overflow-hidden flex items-center justify-center group">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-48 h-48 rounded-full border border-white/20 absolute"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="w-64 h-64 rounded-full border border-white/10 absolute"
                />
                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }}>
                  <Server className="w-16 h-16 text-zinc-600 group-hover:text-white transition-colors duration-500" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature 2: Android App */}
      <section className="py-24 px-6 overflow-hidden bg-[#020202]">
        <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="flex-1 w-full relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -50px 0px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative aspect-square md:aspect-video lg:aspect-square flex items-center justify-center"
            >
              <div className="absolute inset-0 border border-white/10 rounded-2xl bg-[#050505] overflow-hidden flex items-center justify-center group">
                <div className="grid grid-cols-6 gap-2 w-full h-full p-8 opacity-20">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0.2 }}
                      whileInView={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 2, delay: Math.random() * 2, repeat: Infinity }}
                      className="bg-white rounded-sm"
                    />
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.1, rotate: [-10, 10, 0] }} transition={{ duration: 0.5 }} className="absolute z-10">
                  <Smartphone className="w-16 h-16 text-zinc-600 group-hover:text-white transition-colors duration-500" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          <StaggerContainer className="flex-1 lg:pl-12">
            <FadeUp>
              <motion.div
                whileHover={{ rotate: -90 }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 flex items-center justify-center border border-white/20 bg-white/5 rounded-full mb-8"
              >
                <Smartphone className="w-6 h-6 text-white" />
              </motion.div>
            </FadeUp>
            <FadeUp><h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Set it and forget it.</h3></FadeUp>
            <FadeUp>
              <p className="text-lg text-zinc-400 leading-relaxed mb-8">
                Install our lightweight companion app on any Android device. It runs silently in the background, consuming virtually zero battery, ready to dispatch messages the moment you call the API.
              </p>
            </FadeUp>
            <ul className="space-y-4">
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> Zero battery drain technology</li></FadeUp>
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> Works perfectly on locked screens</li></FadeUp>
              <FadeUp><li className="flex items-center gap-3 text-zinc-300"><CheckCircle2 className="w-5 h-5 text-white" /> Link multiple devices instantly</li></FadeUp>
            </ul>
          </StaggerContainer>
        </div>
      </section>

      {/* Grid for smaller features */}
      <section className="py-32 px-6 border-t border-white/10">
        <StaggerContainer className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FadeUp>
            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 border border-white/10 bg-[#050505] rounded-xl h-full transition-colors hover:bg-[#0a0a0a]"
            >
              <Shield className="w-8 h-8 text-white mb-6" />
              <h4 className="text-xl font-semibold mb-3">Enterprise Security</h4>
              <p className="text-zinc-400 leading-relaxed">Your data is safe. All API requests are authenticated with secure API keys, and device secrets are heavily encrypted to prevent unauthorized access.</p>
            </motion.div>
          </FadeUp>

          <FadeUp>
            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 border border-white/10 bg-[#050505] rounded-xl h-full transition-colors hover:bg-[#0a0a0a]"
            >
              <Database className="w-8 h-8 text-white mb-6" />
              <h4 className="text-xl font-semibold mb-3">Real-time Analytics</h4>
              <p className="text-zinc-400 leading-relaxed">Monitor your entire fleet from a beautiful dashboard. View real-time delivery logs, track device health, and analyze your messaging volume.</p>
            </motion.div>
          </FadeUp>

          <FadeUp>
            <motion.div
              whileHover={{ y: -10 }}
              className="p-8 border border-white/10 bg-[#050505] rounded-xl h-full transition-colors hover:bg-[#0a0a0a]"
            >
              <Zap className="w-8 h-8 text-white mb-6" />
              <h4 className="text-xl font-semibold mb-3">Built for Scale</h4>
              <p className="text-zinc-400 leading-relaxed">Whether you're sending 10 or 10,000 messages, our infrastructure automatically scales to handle your load without slowing down.</p>
            </motion.div>
          </FadeUp>
        </StaggerContainer>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 md:py-40 px-6 border-t border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/[0.02]" />
        <StaggerContainer className="max-w-4xl mx-auto text-center relative z-10">
          <FadeUp>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Ready to build?</h2>
          </FadeUp>
          <FadeUp>
            <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
              Stop paying per SMS. Start your own unmetered gateway in minutes.
            </p>
          </FadeUp>
          <FadeUp>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={token ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-black font-semibold text-lg hover:bg-zinc-200 transition-colors rounded-full"
              >
                {token ? "Go to Dashboard" : "Get Started Now"}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </FadeUp>
        </StaggerContainer>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-20 pb-10 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          {/* Logo & Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden bg-transparent">
                <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-150" />
              </div>
              <span className="font-semibold text-xl text-zinc-100 tracking-tight">SMSGW</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
              Connecting software to cellular networks seamlessly. Built by developers, for developers.
            </p>
          </div>

          {/* Contact & Socials */}
          <div className="flex flex-col items-center md:items-end gap-5">
            <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourdomain.com'}`} className="flex items-center gap-2.5 text-sm text-zinc-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              {import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourdomain.com'}
            </a>
            <div className="flex items-center gap-6 text-zinc-500">
              <a href="https://github.com/vinay-vk-kumar" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/vinay-vk-kumar/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-300">
          <p>© {new Date().getFullYear()} SMS Gateway. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/story" className="hover:text-zinc-200 transition-colors">Our Story</Link>
            <Link to="/docs" className="hover:text-zinc-200 transition-colors">Documentation</Link>
            <Link to={token ? "/dashboard" : "/login"} className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
