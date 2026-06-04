import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden mb-8 shadow-xl" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14] border-b border-[rgba(255,255,255,0.05)]">
        <span className="text-xs font-mono text-slate-400">{language}</span>
        <button
          onClick={handleCopy}
          className={`text-xs px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${copied ? 'bg-green-500/10 text-green-400' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono overflow-x-auto bg-[#07070f] text-slate-300 m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Docs() {
  const { isAuth } = useAuth();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('intro');

  const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        // Small delay to ensure render is complete
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
      const sections = ['intro', 'auth', 'send-sms'];
      let current = sections[0];

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the top of the section is near the top of the viewport, mark it active
          if (rect.top <= 200) {
            current = section;
          }
        }
      }

      setActiveSection((prev) => (prev !== current ? current : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItemClass = (id) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeSection === id
      ? 'bg-indigo-500/10 text-indigo-400'
      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`;

  return (
    <div className="min-h-screen bg-[#07070f] text-slate-200 font-sans selection:bg-indigo-500/30">

      {}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#07070f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm hover:scale-105 transition-transform">
            💬
          </Link>
          <span className="font-bold text-base text-white">SMS Gateway Docs</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Home</Link>
          {isAuth ? (
            <Link to="/dashboard" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Dashboard →</Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Sign In</Link>
          )}
        </div>
      </nav>

      <div className="pt-20 max-w-7xl mx-auto flex flex-col md:flex-row">

        {}
        <aside className="w-full md:w-64 shrink-0 p-6 md:sticky md:top-20 md:h-[calc(100vh-5rem)] overflow-y-auto border-r border-white/5 hidden md:block">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Getting Started</h4>
          <div className="space-y-1 mb-8">
            <a onClick={() => scrollTo('intro')} className={navItemClass('intro')}>Introduction</a>
            <a onClick={() => scrollTo('auth')} className={navItemClass('auth')}>Authentication</a>
          </div>

          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">API Reference</h4>
          <div className="space-y-1 mb-8">
            <a onClick={() => scrollTo('send-sms')} className={navItemClass('send-sms')}>Send SMS</a>
          </div>
        </aside>

        {}
        <main className="flex-1 p-6 md:p-12 md:max-w-4xl pb-32">

          <section id="intro" className="mb-16 scroll-mt-24">
            <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Introduction</h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-6">
              Welcome to the SMS Gateway API documentation. This platform allows you to use any Android device as an automated SMS delivery gateway.
              Instead of paying per-message fees to Twilio or AWS SNS, you can route OTPs, notifications, and marketing messages directly through your own SIM card.
            </p>
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm">
              <strong>Note:</strong> The delivery speed depends on your carrier's network. On modern 4G/5G networks, average delivery time is under 3 seconds.
            </div>
          </section>

          <hr className="border-white/5 mb-16" />

          <section id="auth" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Authentication</h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              All API endpoints are authenticated using an API Key. You can generate and revoke API keys from your Dashboard.
            </p>
            <p className="text-slate-400 leading-relaxed mb-6">
              To authenticate an API request, you must include your API key in the <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">x-api-key</code> header.
            </p>
            <CodeBlock
              language="HTTP Header"
              code={`x-api-key: your_api_key_here`}
            />
          </section>

          <hr className="border-white/5 mb-16" />

          <section id="send-sms" className="mb-16 scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Send an SMS</h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              To queue a message for delivery, make a <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">POST</code> request to the <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">/api/sms/queue</code> endpoint.
            </p>

            <h3 className="text-xl font-semibold text-white mt-8 mb-4">Endpoint</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-black/50 border border-white/5 font-mono text-sm mb-8 w-max">
              <span className="text-green-400 font-bold">POST</span>
              <span className="text-slate-300">{baseUrl}/api/sms/queue</span>
            </div>

            <h3 className="text-xl font-semibold text-white mb-4">Payload Parameters</h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm">
                    <th className="py-3 px-4 font-medium">Parameter</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-indigo-300">to <span className="text-red-400 text-xs ml-1">required</span></td>
                    <td className="py-3 px-4 text-slate-400">string</td>
                    <td className="py-3 px-4 text-slate-300">The recipient's phone number in E.164 format (e.g., <code className="bg-white/5 px-1 rounded">+919876543210</code>).</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-indigo-300">message <span className="text-red-400 text-xs ml-1">required</span></td>
                    <td className="py-3 px-4 text-slate-400">string</td>
                    <td className="py-3 px-4 text-slate-300">The text content of the SMS. Max 1600 characters.</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-indigo-300">deviceId <span className="text-red-400 text-xs ml-1">required</span></td>
                    <td className="py-3 px-4 text-slate-400">string</td>
                    <td className="py-3 px-4 text-slate-300">The unique ID of the Android device you want to send from. Find this in your Dashboard.</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-indigo-300">type</td>
                    <td className="py-3 px-4 text-slate-400">string</td>
                    <td className="py-3 px-4 text-slate-300">Optional categorization. One of: <code className="bg-white/5 px-1 rounded">otp</code>, <code className="bg-white/5 px-1 rounded">welcome</code>, <code className="bg-white/5 px-1 rounded">custom</code>. Default is custom.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-white mb-4">Code Examples</h3>

            <div className="space-y-8">
              <CodeBlock
                language="cURL"
                code={`curl -X POST ${baseUrl}/api/sms/queue \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "message": "Your verification code is 492019",
    "deviceId": "YOUR_DEVICE_ID"
  }'`}
              />

              <CodeBlock
                language="Node.js (Axios)"
                code={`const axios = require('axios');

async function sendSms() {
  try {
    const response = await axios.post('${baseUrl}/api/sms/queue', {
      to: '+919876543210',
      message: 'Hello from Node.js!',
      deviceId: 'YOUR_DEVICE_ID'
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

sendSms();`}
              />

              <CodeBlock
                language="Python (Requests)"
                code={`import requests

url = "${baseUrl}/api/sms/queue"
payload = {
    "to": "+919876543210",
    "message": "Hello from Python!",
    "deviceId": "YOUR_DEVICE_ID"
}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
              />

              <CodeBlock
                language="PHP (cURL)"
                code={`<?php

$ch = curl_init();

$payload = json_encode(array(
    "to" => "+919876543210",
    "message" => "Hello from PHP!",
    "deviceId" => "YOUR_DEVICE_ID"
));

curl_setopt($ch, CURLOPT_URL, "${baseUrl}/api/sms/queue");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    "x-api-key: YOUR_API_KEY",
    "Content-Type: application/json"
));

$result = curl_exec($ch);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
curl_close($ch);
echo $result;
?>`}
              />
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
