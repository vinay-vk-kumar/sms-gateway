import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Book, Code, Key, Smartphone, Send, List, ShieldAlert, Activity, CheckCircle2, Webhook, Terminal, Download } from 'lucide-react';
import { motion } from 'framer-motion';

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden mb-6 border border-white/10 bg-[#050505] shadow-[0_0_40px_rgba(255,255,255,0.02)] w-full max-w-full">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/5">
        <span className="text-xs font-mono text-zinc-500">{language}</span>
        <button
          onClick={handleCopy}
          className={`text-xs px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5 ${copied ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-zinc-400'}`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={12} />
              Copied!
            </>
          ) : (
            <>
              <Code size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-5 text-sm font-mono overflow-x-auto bg-[#050505] text-zinc-300 m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MultiLanguageCodeBlock({ endpoints }) {
  const [activeTab, setActiveTab] = useState('curl');
  
  const tabs = [
    { id: 'curl', label: 'cURL' },
    { id: 'node', label: 'Node.js' },
    { id: 'python', label: 'Python' },
    { id: 'php', label: 'PHP' },
  ];

  return (
    <div className="mb-8">
      <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap ${
              activeTab === t.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock code={endpoints[activeTab]} language={tabs.find(t => t.id === activeTab).label} />
    </div>
  );
}

export default function Docs() {
  const { isAuth, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('intro');
  const isClickScrolling = useRef(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(id);
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) return;

      const sections = ['intro', 'auth', 'setup', 'send-sms', 'status-polling', 'webhooks', 'logs', 'errors', 'rate-limits'];
      let current = sections[0];

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            current = section;
          }
        }
      }

      // If user has scrolled to the bottom of the page, select the last section
      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      );
      
      if (scrollPosition >= documentHeight - 50) {
        current = sections[sections.length - 1];
      }

      setActiveSection((prev) => (prev !== current ? current : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    isClickScrolling.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Re-enable scroll listener after animation finishes
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => scrollTo(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
        activeSection === id
          ? 'bg-white/10 text-white'
          : 'text-zinc-500 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} className={activeSection === id ? 'text-white' : 'text-zinc-500'} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      {/* Nav */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-10 h-10 flex items-center justify-center rounded-lg overflow-hidden bg-transparent hover:scale-105 transition-transform">
              <img src="/logo.png" alt="SMSGW Logo" className="w-full h-full object-cover scale-150" />
            </Link>
            <span className="font-semibold text-lg tracking-tight text-white">SMSGW</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors">Home</Link>
            {token ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-sm bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </motion.nav>

      <div className="pt-24 max-w-[90rem] mx-auto flex flex-col md:flex-row md:items-start px-4 sm:px-6 lg:px-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 pb-6 md:pb-0 md:sticky md:top-24 md:h-[calc(100vh-6rem)] overflow-y-auto border-b md:border-b-0 md:border-r border-white/10 pr-0 md:pr-6 mb-8 md:mb-0">
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-1">Getting Started</h4>
              <div className="space-y-1">
                <NavItem id="intro" icon={Book} label="Introduction" />
                <NavItem id="auth" icon={Key} label="Authentication" />
                <NavItem id="setup" icon={Smartphone} label="Device Setup" />
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-1">API Reference</h4>
              <div className="space-y-1">
                <NavItem id="send-sms" icon={Send} label="Send SMS" />
                <NavItem id="status-polling" icon={Activity} label="Status Polling" />
                <NavItem id="webhooks" icon={Webhook} label="Webhooks" />
                <NavItem id="logs" icon={List} label="Delivery Logs" />
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-1">Troubleshooting</h4>
              <div className="space-y-1">
                <NavItem id="errors" icon={ShieldAlert} label="Error Codes" />
                <NavItem id="rate-limits" icon={Activity} label="Rate Limits" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:pl-10 lg:pl-16 max-w-4xl pb-32">
          
          <section id="intro" className="mb-20 scroll-mt-28">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter text-white mb-6">Introduction</h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-8 font-light">
              Welcome to the SMS Gateway API documentation. This platform allows you to use your own Android devices as an automated SMS delivery gateway.
              Instead of paying per-message fees to providers like Twilio or AWS SNS, you can route OTPs, notifications, and marketing messages directly through your own SIM cards at a fraction of the cost.
            </p>
            <div className="p-5 rounded-lg border border-white/10 bg-[#050505] flex gap-4">
              <div className="text-zinc-500 mt-0.5"><Activity size={18} /></div>
              <div>
                <strong className="text-zinc-200 block mb-1">Architecture Overview</strong>
                <span className="text-sm text-zinc-400 leading-relaxed">Your server sends a request to our API. The message is instantly placed into a high-performance Redis queue (BullMQ). Our backend pushes a silent FCM (Firebase Cloud Messaging) notification to your linked Android device, waking it up instantly. The device then sends the physical SMS via its SIM card, and reports the final delivery receipt back to our backend.</span>
              </div>
            </div>
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="auth" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Authentication</h2>
            <p className="text-zinc-400 leading-relaxed mb-4 font-light">
              All REST API endpoints are authenticated using an API Key. You can generate and revoke API keys instantly from your Dashboard. Keep your API key secure and never expose it in client-side code.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              To authenticate an API request, include your API key in the <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-sm">x-api-key</code> HTTP header.
            </p>
            <CodeBlock
              language="HTTP Header"
              code={`x-api-key: your_api_key_here`}
            />
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="setup" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Device Setup</h2>
            <p className="text-zinc-400 leading-relaxed mb-8 font-light">
              Before you can send messages, you must link at least one Android device to your account. The Android app runs quietly in the background and processes your API queue.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4 p-5 rounded-lg border border-white/10 bg-[#050505]">
                <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                <div>
                  <h4 className="text-white font-medium mb-2">Download the App</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">Download and install the SMS Gateway APK on your Android device. Grant the required permissions for SMS and battery optimization when prompted.</p>
                  <a
                    href={import.meta.env.VITE_APP_DOWNLOAD_URL || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors rounded-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download APK
                  </a>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-lg border border-white/10 bg-[#050505]">
                <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                <div>
                  <h4 className="text-white font-medium mb-2">Generate a Pairing QR Code</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">Go to the Devices tab in your web Dashboard. Click "Add Device" to instantly generate a secure, one-time pairing QR Code.</p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-lg border border-white/10 bg-[#050505]">
                <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                <div>
                  <h4 className="text-white font-medium mb-2">Scan & Pair</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">Open the Android app and tap "Scan QR to Pair". Point your camera at the dashboard. The device will securely exchange credentials and instantly appear as "Online"!</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="send-sms" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Send an SMS</h2>
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              To push a message into the delivery queue, make a <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-sm">POST</code> request to the API. The message will be routed to the specified Android device for dispatch.
            </p>

            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border border-white/10 bg-[#050505] rounded-lg mb-8 max-w-full overflow-x-auto scrollbar-hide">
              <Terminal className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="font-mono text-[13px] sm:text-sm break-all">
                <span className="text-white font-bold mr-2">POST</span>
                <span className="text-zinc-400">{baseUrl}/api/sms/queue</span>
              </div>
            </div>

            <h3 className="text-lg font-medium text-white mb-4">JSON Body Parameters</h3>
            <div className="overflow-x-auto mb-10 rounded-lg border border-white/10 bg-[#050505]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-medium">Parameter</th>
                    <th className="py-4 px-6 font-medium">Type</th>
                    <th className="py-4 px-6 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">to <span className="text-zinc-500 text-[10px] uppercase ml-2 border border-white/10 px-1.5 py-0.5 rounded">Required</span></td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">The recipient's phone number in strict E.164 format (e.g., <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">+919876543210</code>).</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">message <span className="text-zinc-500 text-[10px] uppercase ml-2 border border-white/10 px-1.5 py-0.5 rounded">Required</span></td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">The text content of the SMS. Maximum 1600 characters (approx. 10 concatenated SMS segments).</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">deviceId <span className="text-zinc-500 text-[10px] uppercase ml-2 border border-white/10 px-1.5 py-0.5 rounded">Required</span></td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">The unique 24-character Object ID of the Android device you want to send from. Find this in your Dashboard.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">type</td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">Optional categorization. One of: <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">otp</code>, <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">welcome</code>, <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">custom</code>. Default is <code className="text-zinc-500 font-mono">custom</code>.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">webhookUrl</td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">Optional URL where the backend will send a <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">POST</code> request with the final delivery status once the SMS is dispatched by the phone.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-zinc-200">idempotencyKey</td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">string</td>
                    <td className="py-4 px-6 text-zinc-400 leading-relaxed">Optional unique string. Prevents duplicate messages from being sent if your server accidentally retries the identical request.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-white mb-4">Code Examples</h3>
            <MultiLanguageCodeBlock 
              endpoints={{
                curl: `curl -X POST ${baseUrl}/api/sms/queue \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210", 
    "message": "Your verification code is 492019", 
    "deviceId": "YOUR_DEVICE_ID", 
    "type": "otp", 
    "webhookUrl": "https://your-server.com/sms/callback?secret=123", 
    "idempotencyKey": "order-12345" 
  }'`,
                node: `import axios from 'axios';

async function sendSms() {
  try {
    const response = await axios.post('${baseUrl}/api/sms/queue', {
      to: '+919876543210',                                // REQUIRED
      message: 'Hello from Node.js!',                    // REQUIRED
      deviceId: 'YOUR_DEVICE_ID',                        // REQUIRED
      type: 'custom',                                    // OPTIONAL (otp, welcome, custom)
      webhookUrl: 'https://your-server.com/sms/webhook', // OPTIONAL
      idempotencyKey: 'order-12345'                      // OPTIONAL (prevents duplicates)
    }, {
      headers: {
        'x-api-key': 'YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendSms();`,
                python: `import requests

url = "${baseUrl}/api/sms/queue"
payload = {
    "to": "+919876543210",                                 # REQUIRED
    "message": "Hello from Python!",                       # REQUIRED
    "deviceId": "YOUR_DEVICE_ID",                          # REQUIRED
    "type": "custom",                                      # OPTIONAL
    "webhookUrl": "https://your-server.com/sms/webhook",   # OPTIONAL
    "idempotencyKey": "order-12345"                        # OPTIONAL
}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
                php: `<?php

$ch = curl_init();

$payload = json_encode([
    "to" => "+919876543210",                                 // REQUIRED
    "message" => "Hello from PHP!",                          // REQUIRED
    "deviceId" => "YOUR_DEVICE_ID",                          // REQUIRED
    "type" => "custom",                                      // OPTIONAL
    "webhookUrl" => "https://your-server.com/sms/webhook",   // OPTIONAL
    "idempotencyKey" => "order-12345"                        // OPTIONAL
]);

curl_setopt($ch, CURLOPT_URL, "${baseUrl}/api/sms/queue");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: YOUR_API_KEY",
    "Content-Type: application/json"
]);

$result = curl_exec($ch);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
echo $result;
?>`
              }} 
            />
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="status-polling" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Status Polling</h2>
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              You can check the real-time delivery status of a specific message using its <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-sm">messageId</code>. 
              This endpoint features <strong>Long Polling</strong>: if the message is still <code className="text-zinc-300 font-mono text-sm">pending</code>, the server will gently hold the connection open for up to 3 seconds waiting for a status change before responding.
            </p>

            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border border-white/10 bg-[#050505] rounded-lg mb-8 max-w-full overflow-x-auto scrollbar-hide">
              <Terminal className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="font-mono text-[13px] sm:text-sm break-all">
                <span className="text-white font-bold mr-2">GET</span>
                <span className="text-zinc-400">{baseUrl}/api/sms/status/:messageId</span>
              </div>
            </div>
            
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              Just like sending an SMS, this endpoint requires your <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-sm">x-api-key</code> in the headers. You can only fetch the status of messages sent from your own account.
            </p>

            <h3 className="text-lg font-medium text-white mb-4">Response Payload</h3>
            <CodeBlock
              language="JSON"
              code={`{
  "success": true,
  "data": {
    "messageId": "6a6a36db957033f05f0e48b7",
    "to": "+919876543210",
    "status": "sent",
    "error": null,
    "sentAt": "2026-07-29T17:22:39.187Z",
    "createdAt": "2026-07-29T17:22:35.595Z"
  }
}`}
            />
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="webhooks" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Delivery Webhooks</h2>
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              When you include a <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-sm">webhookUrl</code> in your send request, our servers will automatically issue an <strong>outbound POST request</strong> back to your URL the exact millisecond the Android device confirms delivery.
              This is the industry-standard and most efficient way to update your application without polling.
            </p>
            
            <div className="p-5 rounded-lg border border-white/10 bg-[#050505] mb-8">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2"><ShieldAlert size={16} /> Securing your Webhook</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Because webhooks are outbound requests from us to your server, you must protect your own endpoint. The standard way to do this is by appending a secret token to the <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">webhookUrl</code> you provide (e.g. <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono">https://your-server.com/webhook?secret=12345</code>), and verifying that token on your backend.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-white/10 bg-[#050505] mb-8">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Idempotency & Duplicate Prevention</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                If your server loses connection and accidentally retries a <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono text-xs">POST /queue</code> request, you risk sending the same SMS twice. To prevent this, always generate a unique string (like an order ID, e.g. <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono text-xs">"order-9941"</code>) and pass it as the <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono text-xs">idempotencyKey</code> parameter. Our backend will catch any duplicate keys, silently block the duplicate SMS from being sent, and return the original success response. We will also include your exact <code className="bg-white/10 px-1 rounded text-zinc-300 font-mono text-xs">idempotencyKey</code> in the Webhook Payload below so you can easily map it to your database record!
              </p>
            </div>
            
            <h3 className="text-lg font-medium text-white mb-4">Webhook Payload Example</h3>
            <CodeBlock
              language="JSON"
              code={`{
  "messageId": "60d5ec9af682fbd39a234a1a",
  "to": "+919876543210",
  "status": "sent",
  "error": null,
  "sentAt": "2026-07-24T18:45:00.000Z",
  "type": "otp",
  "idempotencyKey": "order-12345"
}`}
            />
            <p className="text-sm text-zinc-500 italic mt-4">
              Note: If the SMS fails (e.g. invalid number, no signal, carrier rejection), the <code className="text-zinc-300 font-mono text-xs">status</code> will be <code className="text-zinc-300 font-mono text-xs">"failed"</code> and the <code className="text-zinc-300 font-mono text-xs">error</code> field will contain the carrier error reason.
            </p>
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="logs" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Delivery Logs</h2>
            <p className="text-zinc-400 leading-relaxed mb-6 font-light">
              If you prefer not to use webhooks, you can programmatically fetch the history and status of your messages via the API. Note that this endpoint is authenticated via Session (JWT Cookie), as it is primarily designed for the frontend dashboard.
            </p>

            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border border-white/10 bg-[#050505] rounded-lg mb-6 max-w-full overflow-x-auto scrollbar-hide">
              <Terminal className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="font-mono text-[13px] sm:text-sm break-all">
                <span className="text-white font-bold mr-2">GET</span>
                <span className="text-zinc-400">{baseUrl}/api/sms/logs?page=1&limit=50</span>
              </div>
            </div>
            
            <p className="text-sm text-zinc-500">
              Returns a paginated array of your queued, sent, and failed messages.
            </p>
          </section>

          <hr className="mb-16 border-white/10" />

          <section id="errors" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Error Codes</h2>
            <p className="text-zinc-400 leading-relaxed mb-8 font-light">
              The API uses standard HTTP response codes to indicate the success or failure of an API request.
            </p>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#050505]">
              <table className="w-full text-left border-collapse">
                <tbody className="text-sm divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">2xx</td>
                    <td className="py-5 px-6 text-zinc-400">Success. The request was processed successfully.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">400</td>
                    <td className="py-5 px-6 text-zinc-400">Bad Request. Often due to a missing required parameter or an invalid phone number format.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">401</td>
                    <td className="py-5 px-6 text-zinc-400">Unauthorized. Your API key is missing or invalid.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">404</td>
                    <td className="py-5 px-6 text-zinc-400">Not Found. The specified <code className="text-zinc-300 font-mono text-xs">deviceId</code> does not exist or doesn't belong to your account.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">429</td>
                    <td className="py-5 px-6 text-zinc-400">Too Many Requests. You have exceeded your rate limits.</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-mono font-bold text-zinc-200 w-24">5xx</td>
                    <td className="py-5 px-6 text-zinc-400">Server Error. Something went wrong on our end (e.g. Redis Queue offline).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="rate-limits" className="mb-20 scroll-mt-28">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white mb-5">Rate Limits</h2>
            <p className="text-zinc-400 leading-relaxed mb-8 font-light">
              To prevent abuse and ensure stability across the network, the API enforces rate limits on a per-user basis using Redis.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-lg border border-white/10 bg-[#050505]">
                <div className="text-zinc-500 mb-3"><Activity size={20} /></div>
                <h4 className="text-white font-medium mb-1">Queue Limits</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  • 30 messages per minute<br/>
                  • 1000 messages per day<br/>
                  • 100 messages per hour to the same number
                </p>
              </div>
              <div className="p-6 rounded-lg border border-white/10 bg-[#050505]">
                <div className="text-zinc-500 mb-3"><ShieldAlert size={20} /></div>
                <h4 className="text-white font-medium mb-1">Penalty</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">If exceeded, requests will be blocked with a 429 status code until the window resets.</p>
              </div>
            </div>
          </section>

        </main>
      </div>

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
            <Link to="/" className="hover:text-zinc-200 transition-colors">Home</Link>
            <Link to="/story" className="hover:text-zinc-200 transition-colors">Our Story</Link>
            <Link to={token ? "/dashboard" : "/login"} className="hover:text-zinc-400 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
