# Stage 5 — Android App Setup Guide

## Step 1: Install Android Studio
1. Download from https://developer.android.com/studio
2. Install with all defaults → it includes the Android SDK automatically
3. First launch: complete the Setup Wizard (download SDK, tools)

---

## Step 2: Create the Project

1. Open Android Studio → **New Project**
2. Select template: **"Empty Views Activity"** (NOT "Empty Activity")
3. Fill in:
   - **Name**: `SMS Gateway`
   - **Package name**: `com.smsgw.app`
   - **Save location**: `C:\Users\VINAY\Desktop\VM\sms\android`
   - **Language**: `Kotlin`
   - **Minimum SDK**: `API 26 (Android 8.0)`
4. Click **Finish** — wait for Gradle sync to complete (~3 minutes)

---

## Step 3: Set Up Firebase

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `sms-gateway` → disable Google Analytics
3. In the project: click the **Android icon** to add an Android app
4. Package name: `com.smsgw.app`
5. Register → **Download `google-services.json`**
6. Place `google-services.json` in `android/app/` folder (alongside `build.gradle`)
7. In Firebase console: go to **Cloud Messaging** (left sidebar)
   - This enables FCM for your app

**For the backend (FIREBASE_SERVICE_ACCOUNT in .env):**
1. In Firebase console → Project Settings (gear icon) → **Service accounts**
2. Click **"Generate new private key"** → downloads a JSON file
3. Convert to base64 (run this command):
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("C:\path\to\serviceAccount.json")) | Set-Clipboard
   ```
4. Paste the result into `.env` → `FIREBASE_SERVICE_ACCOUNT=<pasted value>`

---

## Step 4: Replace Project Files

After the project is created in Android Studio, replace these files with the ones I've written:

```
android/
├── app/
│   ├── google-services.json          ← download from Firebase
│   ├── build.gradle                  ← REPLACE with Stage5 version
│   └── src/main/
│       ├── AndroidManifest.xml       ← REPLACE
│       ├── res/
│       │   ├── layout/
│       │   │   ├── activity_main.xml
│       │   │   └── activity_settings.xml
│       │   └── values/
│       │       ├── strings.xml
│       │       └── themes.xml
│       └── java/com/smsgw/app/
│           ├── MainActivity.kt
│           ├── SettingsActivity.kt
│           ├── data/
│           │   ├── SecureStorage.kt
│           │   └── ApiClient.kt
│           ├── fcm/
│           │   └── SmsFirebaseService.kt
│           └── worker/
│               └── SmsWorker.kt
```

---

## Step 5: Required Permissions
The app needs SMS permission — Android will ask the user to grant it on first launch.

---

## Step 6: Add Your Server URL
After installing the app, open **Settings** inside the app and enter:
- **Server URL**: `http://192.168.x.x:3000` (your local IP while testing)
- **Device ID**: from the dashboard after registering a device
- **Device Secret**: the one-time secret shown during registration
