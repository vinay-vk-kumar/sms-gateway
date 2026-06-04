import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as THREE from 'three';
import { motion, useScroll, useTransform } from 'framer-motion';

function useThreeScene(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070f, 0.04);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 14);
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const pLight1 = new THREE.PointLight(0x6366f1, 5, 20);
    pLight1.position.set(5, 5, 5);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0x7c3aed, 4, 20);
    pLight2.position.set(-5, -5, 5);
    scene.add(pLight2);

    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(4, 0, 0);
    phoneGroup.rotation.y = -Math.PI / 8;
    const phoneGeo = new THREE.BoxGeometry(2.2, 4.4, 0.2);
    const phoneMat = new THREE.MeshStandardMaterial({
      color: 0x11111a,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1
    });
    const phoneBody = new THREE.Mesh(phoneGeo, phoneMat);
    phoneGroup.add(phoneBody);

    const screenGeo = new THREE.PlaneGeometry(2.0, 4.2);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x07070f,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.101;
    phoneGroup.add(screen);

    const notifGeo = new THREE.PlaneGeometry(1.6, 0.4);
    const notifMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.8 });
    const notif = new THREE.Mesh(notifGeo, notifMat);
    notif.position.set(0, 1.5, 0.102);
    phoneGroup.add(notif);

    // Add second notification line
    const notif2Geo = new THREE.PlaneGeometry(1.2, 0.1);
    const notif2Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.5 });
    const notif2 = new THREE.Mesh(notif2Geo, notif2Mat);
    notif2.position.set(-0.2, 1.1, 0.102);
    phoneGroup.add(notif2);

    scene.add(phoneGroup);

    // 2. Data Packets (SMS messages flowing from left to right)
    const packetGroup = new THREE.Group();
    scene.add(packetGroup);

    const PACKET_COUNT = 15;
    const packets = [];

    // Create a simple chat bubble shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 0.6);
    shape.lineTo(0, 0.6);
    shape.lineTo(0, -0.2); // Tail
    shape.lineTo(0.2, 0);

    const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const bubbleGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bubbleGeo.center();

    for (let i = 0; i < PACKET_COUNT; i++) {
      const isSent = i % 2 === 0;
      const mat = new THREE.MeshStandardMaterial({
        color: isSent ? 0x6366f1 : 0x22c55e,
        emissive: isSent ? 0x4338ca : 0x166534,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(bubbleGeo, mat);

      // Random starting positions far left and back
      resetPacket(mesh);
      // Stagger them initially
      mesh.position.x = (Math.random() * 15) - 10;

      packetGroup.add(mesh);
      packets.push({
        mesh,
        speedX: 0.05 + Math.random() * 0.05,
        speedY: (Math.random() - 0.5) * 0.02,
        wobbleSpeed: 2 + Math.random() * 3,
        wobbleOffset: Math.random() * Math.PI * 2
      });
    }

    function resetPacket(mesh) {
      mesh.position.set(-10 - Math.random() * 5, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5);
      mesh.rotation.set(0, 0, 0);
      // Orient tail appropriately
      mesh.scale.set(0.6, 0.6, 0.6);
    }

    // 3. Grid Floor (Matrix/Digital vibe)
    const gridGeo = new THREE.PlaneGeometry(40, 40, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -4;
    scene.add(grid);

    let mouseX = 0, mouseY = 0;
    let scrollY = 0;

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll);

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Phone floating & mouse parallax
      phoneGroup.position.y = Math.sin(t * 1.5) * 0.2 - (scrollY * 0.002);
      phoneGroup.rotation.y = -Math.PI / 8 + mouseX * 0.2;
      phoneGroup.rotation.x = mouseY * 0.1;

      // Notification pulse
      notifMat.opacity = 0.6 + Math.sin(t * 4) * 0.4;

      // Packets flowing
      packets.forEach(p => {
        p.mesh.position.x += p.speedX;
        p.mesh.position.y += p.speedY;
        p.mesh.position.y += Math.sin(t * p.wobbleSpeed + p.wobbleOffset) * 0.01; // wobble

        // Rotate slightly
        p.mesh.rotation.y = Math.sin(t * p.wobbleSpeed * 0.5) * 0.2;
        p.mesh.rotation.z = Math.cos(t * p.wobbleSpeed * 0.5) * 0.1;

        // If they reach the phone, reset them
        if (p.mesh.position.x > 4.5) {
          resetPacket(p.mesh);
        }

        // Scale down as they get close to phone to simulate going "into" it
        if (p.mesh.position.x > 3) {
          const scale = Math.max(0, 0.6 - (p.mesh.position.x - 3) * 0.4);
          p.mesh.scale.set(scale, scale, scale);
        }
      });

      // Grid scrolling effect
      grid.position.z = (t * 2) % 1;

      // Camera parallax
      camera.position.x += (mouseX * 1 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 1 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      // Dispose geometries & materials
      phoneGeo.dispose();
      phoneMat.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      bubbleGeo.dispose();
      gridGeo.dispose();
      gridMat.dispose();
    };
  }, []);
}

function FeatureCard({ icon, title, desc, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: delay * 0.1 }}
      className="rounded-2xl p-6 flex flex-col gap-3 group hover:-translate-y-1 transition-transform duration-300"
      style={{
        background: 'rgba(15,15,26,0.6)',
        border: '1px solid rgba(99,102,241,0.15)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-110"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-[16px] tracking-tight" style={{ color: '#f8fafc' }}>{title}</h3>
      <p className="text-[14px] leading-relaxed" style={{ color: '#94a3b8' }}>{desc}</p>
    </motion.div>
  );
}

function StepCard({ n, title, desc, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative pl-12 sm:pl-0 sm:pt-12"
    >
      <div
        className="absolute left-0 top-0 sm:-top-4 sm:left-0 font-mono font-black text-5xl sm:text-7xl opacity-20 pointer-events-none"
        style={{ color: '#6366f1', lineHeight: 1 }}
      >
        {n}
      </div>
      <div
        className="rounded-2xl p-6 h-full relative z-10"
        style={{ background: 'rgba(15,15,26,0.4)', border: '1px solid rgba(99,102,241,0.1)' }}
      >
        <h3 className="font-semibold text-lg mb-2" style={{ color: '#f1f5f9' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{desc}</p>
      </div>
    </motion.div>
  );
}

function CodeSnippet() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: '#0a0a14',
        border: '1px solid rgba(99,102,241,0.3)',
        fontFamily: "'Fira Code', 'Courier New', monospace",
        boxShadow: '0 20px 40px -10px rgba(99,102,241,0.15)'
      }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', background: '#0f0f1a' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
        <span className="ml-2 text-xs opacity-50 text-white">terminal</span>
      </div>
      {/* Code */}
      <div className="p-6 text-xs sm:text-[13px] leading-relaxed overflow-x-auto text-left">
        <div><span style={{ color: '#64748b' }}># Queue an SMS in one line</span></div>
        <div className="mt-2">
          <span style={{ color: '#818cf8' }}>curl</span>
          <span style={{ color: '#e2e8f0' }}> -X POST </span>
          <span style={{ color: '#4ade80' }}>https://api.smsgateway.codewithvib.com/api/sms/queue</span> <span style={{ color: '#e2e8f0' }}>\</span>
        </div>
        <div className="pl-4 mt-1">
          <span style={{ color: '#818cf8' }}>-H </span>
          <span style={{ color: '#fbbf24' }}>"x-api-key: YOUR_API_KEY"</span> <span style={{ color: '#e2e8f0' }}>\</span>
        </div>
        <div className="pl-4 mt-1">
          <span style={{ color: '#818cf8' }}>-H </span>
          <span style={{ color: '#fbbf24' }}>"Content-Type: application/json"</span> <span style={{ color: '#e2e8f0' }}>\</span>
        </div>
        <div className="pl-4 mt-1">
          <span style={{ color: '#818cf8' }}>-d </span>
          <span style={{ color: '#e2e8f0' }}>{'\'{'}</span>
        </div>
        <div className="pl-8 mt-1">
          <span style={{ color: '#fbbf24' }}>"to"</span>
          <span style={{ color: '#e2e8f0' }}>: </span>
          <span style={{ color: '#4ade80' }}>"+91XXXXXXXXXX"</span>
          <span style={{ color: '#e2e8f0' }}>,</span>
        </div>
        <div className="pl-8 mt-1">
          <span style={{ color: '#fbbf24' }}>"message"</span>
          <span style={{ color: '#e2e8f0' }}>: </span>
          <span style={{ color: '#4ade80' }}>"Your OTP is 123456"</span>
        </div>
        <div className="pl-4 mt-1">
          <span style={{ color: '#e2e8f0' }}>{'}\''}</span>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#64748b' }}>→ </span>
          <span style={{ color: '#4ade80' }}>{`{ "success": true, "data": { "status": "queued" } }`}</span>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ value, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-3xl sm:text-4xl font-bold" style={{ color: '#a5b4fc' }}>{value}</div>
      <div className="text-sm mt-2 font-medium" style={{ color: '#64748b' }}>{label}</div>
    </motion.div>
  );
}

export default function Landing() {
  const canvasRef = useRef(null);
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  useThreeScene(canvasRef);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  const handleDownload = () => {
    window.location.href = 'https://github.com/vinay-vk-kumar/sms-gateway/releases/download/v1.0/SmsGateway-v1.0.apk';
  };

  return (
    <div style={{ background: '#07070f', minHeight: '100vh', color: '#e2e8f0', overflowX: 'hidden', scrollBehavior: 'smooth' }}>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 transition-all duration-300"
        style={{
          background: 'rgba(7,7,15,0.7)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
          >
            💬
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: '#ffffff' }}>SMS Gateway</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuth ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}
            >
              Dashboard →
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium transition-colors text-gray-300 hover:text-[#6366f1]"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 shadow-lg"
                style={{ background: '#f8fafc', color: '#0f172a' }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Three.js canvas — fixed background for the hero area */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />

        {/* Gradient overlays to blend the 3D scene into the page background */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, #07070f 30%, transparent 60%)', zIndex: 1 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 70%, #07070f 100%)', zIndex: 1 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, transparent 80%, #07070f 100%)', zIndex: 1 }} />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between">

          <motion.div
            className="md:w-3/5 text-left"
            style={{ opacity: heroOpacity, y: heroY }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
              Open Source API Infrastructure
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tighter"
              style={{
                color: '#ffffff',
                textShadow: '0 4px 24px rgba(0,0,0,0.5)'
              }}
            >
              Turn any Android<br />
              <span style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>into an SMS API.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl mb-10 max-w-xl leading-relaxed" style={{ color: '#94a3b8' }}
            >
              Self-hostable, RESTful SMS delivery engine.
              Queue OTPs and transactional messages directly through your own phone.
              No carrier locks, no monthly SaaS fees.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/login"
                className="px-8 py-4 rounded-xl text-base font-semibold transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                  color: '#fff',
                  boxShadow: '0 10px 30px -10px rgba(99,102,241,0.8)',
                }}
              >
                Start Building Free
              </Link>
              <button
                onClick={handleDownload}
                className="px-8 py-4 rounded-xl text-base font-semibold transition-all hover:bg-white/5 inline-flex items-center justify-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
              >
                <span className="text-xl">🤖</span>
                Download App
              </button>
            </motion.div>
          </motion.div>

          {/* Spacer for 3D model on the right */}
          <div className="hidden md:block md:w-2/5 h-full" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-20 bg-[#07070f] pt-10 pb-20 border-t border-[rgba(255,255,255,0.05)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <Stat value="RESTful" label="Clean JSON API" />
            <Stat value="< 2.5s" label="Avg. Delivery Speed" />
            <Stat value="Free" label="Open Source & Self-hosted" />
            <Stat value="Secure" label="E2E encrypted payloads" />
          </div>
        </div>
      </section>

      {/* ── Quote Section ── */}
      <section className="relative z-20 py-32 bg-[#07070f] overflow-hidden">
        <div className="absolute inset-0 flex justify-center items-center opacity-[0.02] pointer-events-none">
          {/* Giant decorative quote marks */}
          <span className="text-[400px] font-serif leading-none" style={{ color: '#ffffff' }}>"</span>
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] mb-8">
              <span className="text-white">Built by the developer,</span><br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                for the developer.
              </span>
            </h3>
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              whileInView={{ opacity: 1, width: "100%" }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="flex items-center justify-center gap-4 mx-auto max-w-sm"
            >
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-indigo-500/50"></div>
              <p className="text-indigo-400 font-mono text-xs tracking-[0.2em] uppercase shrink-0">Open Source Promise</p>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-indigo-500/50"></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Code Section ── */}
      <section className="relative z-20 py-24 bg-[#0a0a14]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                Developer Experience
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 tracking-tight" style={{ color: '#ffffff' }}>
                Send SMS like it's 2026.
              </h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
                Integrate in seconds. We provide a single endpoint to queue your messages. The Android app automatically polls, encrypts, and dispatches them via your carrier.
              </p>

              <ul className="space-y-4 mb-8">
                {['No complex SDKs required', 'Works from any backend (Node, Python, Go, PHP)', 'Real-time delivery status webhooks'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium" style={{ color: '#cbd5e1' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <CodeSnippet />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-20 py-24 bg-[#07070f]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: '#ffffff' }}>
              How it works
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>
              From API call to recipient in under 3 seconds.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <StepCard
              index={0}
              n="1"
              title="Install Android App"
              desc="Download our lightweight agent on your spare Android device. It requests SMS permissions and runs quietly in the background."
            />
            <StepCard
              index={1}
              n="2"
              title="Get API Key"
              desc="Register on the dashboard to generate your secure x-api-key and register your device IDs."
            />
            <StepCard
              index={2}
              n="3"
              title="Queue Messages"
              desc="Make an HTTP POST to the queue endpoint. The Android app instantly picks it up via FCM pushes and sends the SMS."
            />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-20 py-24 bg-[#0a0a14]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: '#ffffff' }}>
              Everything you need.
            </h2>
            <p className="text-lg" style={{ color: '#94a3b8' }}>
              Enterprise-grade features, open-source flexibility.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>} title="API Key Authentication" desc="Secure your endpoints with standard header-based authentication. Revoke or cycle keys instantly." delay={0} />
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>} title="Multi-Device Routing" desc="Connect multiple Android phones. Route messages based on carrier networks or geographic numbers." delay={1} />
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} title="Real-time Logs" desc="Track message states (queued, sent, failed) directly from your dashboard with detailed error reporting." delay={2} />
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>} title="FCM Push Delivery" desc="Zero polling overhead. Messages are pushed to your device instantly via Firebase Cloud Messaging." delay={3} />
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>} title="Dark Mode Default" desc="A beautiful, developer-centric interface crafted with attention to detail and typography." delay={4} />
            <FeatureCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>} title="100% Self-Hostable" desc="Deploy the Node.js backend and MongoDB cluster anywhere. Keep your data entirely in your control." delay={5} />
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="relative z-20 py-32 bg-[#07070f]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(30,30,50,0.4) 0%, rgba(15,15,25,0.8) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg pointer-events-none" style={{ background: 'radial-gradient(circle at top, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight" style={{ color: '#ffffff' }}>
                Ready to take control?
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: '#94a3b8' }}>
                Join thousands of developers routing messages through their own devices. Free to start, easy to scale.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/login"
                  className="px-8 py-4 rounded-xl text-base font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', boxShadow: '0 10px 25px -5px rgba(99,102,241,0.4)' }}
                >
                  Create Free Account
                </Link>
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 rounded-xl text-base font-semibold transition-all hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
                >
                  Download APK
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Modern Footer ── */}
      <footer className="relative z-20 bg-[#040408] pt-16 pb-8 border-t border-[rgba(255,255,255,0.05)]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  💬
                </div>
                <span className="font-bold text-lg" style={{ color: '#ffffff' }}>SMS Gateway</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: '#64748b' }}>
                The open-source, developer-friendly infrastructure to turn any Android device into a powerful REST API for SMS delivery.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-6" style={{ color: '#f1f5f9' }}>Product</h4>
              <ul className="space-y-4">
                <li><Link to="/login" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Dashboard</Link></li>
                <li><button onClick={handleDownload} className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Download App</button></li>
                <li><Link to="/docs" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-6" style={{ color: '#f1f5f9' }}>Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-indigo-400 transition-colors">Open Source License</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.05)]">
            <p className="text-xs" style={{ color: '#64748b' }}>
              © {new Date().getFullYear()} SMS Gateway. Built with ❤️ for developers.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/vinay-vk-kumar/sms-gateway" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors" title="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </a>
              <a href="https://www.linkedin.com/in/vinay-vk-kumar/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors" title="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
