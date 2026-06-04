<div align="center">
  <img src="https://raw.githubusercontent.com/vinay-vk-kumar/sms-gateway/main/frontend/public/vite.svg" width="120" alt="Logo" />
  <h1>🚀 Next-Gen SMS Gateway</h1>
  <p><strong>Turn any Android phone into a powerful, self-hosted Twilio alternative.</strong></p>
  
  <p>
    <a href="https://github.com/vinay-vk-kumar/sms-gateway/releases"><img src="https://img.shields.io/github/v/release/vinay-vk-kumar/sms-gateway?color=6366f1&label=Latest%20Release&style=for-the-badge" alt="Release" /></a>
    <a href="https://github.com/vinay-vk-kumar/sms-gateway/stargazers"><img src="https://img.shields.io/github/stars/vinay-vk-kumar/sms-gateway?color=f59e0b&style=for-the-badge" alt="Stars" /></a>
    <a href="https://github.com/vinay-vk-kumar/sms-gateway/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-4ade80?style=for-the-badge" alt="License" /></a>
  </p>
</div>

<hr/>

Send OTPs, transactional notifications, and marketing campaigns directly through your own Android device's cellular plan. No carrier locks, no monthly SaaS fees, and complete control over your data.

## ✨ Why this SMS Gateway?
- **💰 Zero SaaS Fees:** Pay only your local carrier's standard SMS rates.
- **⚡ Zero-Delay Delivery:** Background foreground service ensures messages are dispatched instantly, without Android battery-saver throttling.
- **🛠️ Developer-First REST API:** A clean, Twilio-inspired JSON API (`/api/sms/queue`).
- **📊 Real-time Dashboard:** Manage API keys, view SMS delivery logs, track success rates, and monitor device health from a beautiful web UI.
- **📡 Multi-Device Support:** Connect multiple Android devices dynamically to load-balance your SMS traffic.
- **🛡️ Secure:** JWT Authentication, encrypted payloads, and rate-limiting built-in.

---

## 📱 Getting Started: The Android App

The core of this system is the Android worker app. It securely connects to your backend and listens for outgoing SMS requests.

### 📥 Download the App
> [!IMPORTANT]
> Download the latest stable release directly to your Android device:
> 👉 **[Download SmsGateway-v1.0.apk](https://github.com/vinay-vk-kumar/sms-gateway/releases/download/v1.0/SmsGateway-v1.0.apk)**

*(Note: You will need to allow "Install from Unknown Sources" in your Android settings to install the APK).*

### 🔗 Connecting Your Device
1. Log in to your deployed Web Dashboard.
2. Navigate to the **Devices** tab and click **Add Device**.
3. Open the installed Android App on your phone and grant SMS permissions.
4. Enter the **Server URL** (your backend API URL), along with the **Device ID** and **Device Secret** provided by the dashboard.
5. Click **Save Credentials**. Your device will instantly show as "Online" on the dashboard!

---

## 💻 Programmatic API Usage

Once your device is connected, sending an SMS is as simple as a single `curl` command:

```bash
curl -X POST https://your-backend-api.com/api/sms/queue \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+91XXXXXXXXXX",
    "message": "Hello from my self-hosted SMS Gateway! 🚀"
  }'
```

---

## 🏗️ Local Development & Setup

Want to contribute or run the system locally? Here's how to spin it up.

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (Local or MongoDB Atlas)
- **Redis** (Local or Upstash)
- **Firebase Project** (For FCM Push Notifications)

### 1. Backend Setup
```bash
git clone https://github.com/vinay-vk-kumar/sms-gateway.git
cd sms-gateway/backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/sms_gateway
REDIS_URL=redis://default:<password>@your-redis-url.upstash.io:6379
JWT_SECRET=your_super_secret_jwt_key
ADMIN_EMAIL=admin@example.com
```

**Firebase Config:** Download your Firebase Admin private key JSON and save it as `serviceAccount.json` in the `backend` folder.

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
# Leave empty for local development (Vite will proxy requests to backend)
VITE_API_BASE_URL=
VITE_APP_PUBLIC_URL=http://localhost:5173
VITE_API_SNIPPET_URL=http://localhost:3000
```

Start the frontend:
```bash
npm run dev
```

---

## 🛡️ Architecture & Tech Stack

This project is built using modern, highly-scalable technologies:
- **Frontend**: React.js, Vite, TailwindCSS, Framer Motion, Recharts
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), BullMQ (Redis-backed Queue)
- **Android**: Kotlin, WorkManager, Firebase Cloud Messaging (FCM)

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/vinay-vk-kumar/sms-gateway/issues).

## 📝 License
MIT License
