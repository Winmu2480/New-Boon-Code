# 🚀 Boon App — Complete Deployment Guide

## Overview
This guide walks you through every step to go from this codebase to live apps in the Apple App Store and Google Play Store.

---

## Step 1 — Prerequisites

Install these tools on your computer:

```bash
# 1. Node.js (v18+) — download from nodejs.org
node --version   # should print v18 or higher

# 2. Install Expo CLI
npm install -g expo-cli eas-cli

# 3. Verify EAS
eas --version
```

---

## Step 2 — Install Dependencies

```bash
cd boon
npm install
```

---

## Step 3 — Set Up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project called **Boon**
3. Enable these services:
   - **Authentication** → Sign-in methods → Enable: Email/Password, Google, Apple
   - **Firestore Database** → Create database → Start in production mode
   - **Storage** → Get started

4. Go to Project Settings → Your Apps → Add app → iOS (and Android separately)
5. Copy your config and create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase values:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:ios:abc
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-key
```

---

## Step 4 — Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorId;
      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

---

## Step 5 — Download Fonts

Download and place these fonts in `assets/fonts/`:

| Font | URL |
|------|-----|
| PlayfairDisplay-Bold.ttf | [Google Fonts - Playfair Display](https://fonts.google.com/specimen/Playfair+Display) |
| DMSans-Regular.ttf | [Google Fonts - DM Sans](https://fonts.google.com/specimen/DM+Sans) |
| DMSans-Medium.ttf | Same download |
| DMSans-Bold.ttf | Same download |
| SpaceMono-Regular.ttf | [Google Fonts - Space Mono](https://fonts.google.com/specimen/Space+Mono) |

---

## Step 6 — Run Locally

```bash
# Start the development server
npx expo start

# Press 'i' for iOS simulator (Mac only)
# Press 'a' for Android emulator
# Scan QR code with Expo Go app on your phone
```

---

## Step 7 — Build for Production (EAS)

### 7.1 — Login to Expo

```bash
eas login
# Create account at expo.dev if needed
```

### 7.2 — Configure EAS

```bash
eas build:configure
```

### 7.3 — Update eas.json

Edit `eas.json` and fill in your Apple credentials:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "YOUR_APP_STORE_CONNECT_ID",
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```

### 7.4 — Build iOS

```bash
eas build --platform ios --profile production
```
- This will prompt for your Apple Developer account
- EAS handles certificates and provisioning profiles automatically
- Build takes ~15 minutes on EAS servers

### 7.5 — Build Android

```bash
eas build --platform android --profile production
```
- Generates a signed `.aab` (Android App Bundle)

---

## Step 8 — Submit to App Stores

### Apple App Store

**Requirements:**
- Apple Developer Account ($99/year) at [developer.apple.com](https://developer.apple.com)
- App Store Connect listing with screenshots, description, keywords

```bash
eas submit --platform ios
```

**App Store Connect Setup:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Fill in:
   - Name: **Boon**
   - Bundle ID: `com.boonapp.boon`
   - SKU: `boon-app-v1`
4. Add screenshots (use Simulator to capture)
5. Add description, keywords, category: **Shopping**
6. Submit for review (typically 1-3 days)

### Google Play Store

**Requirements:**
- Google Play Developer Account ($25 one-time) at [play.google.com/console](https://play.google.com/console)

```bash
# Download service account key from Play Console → Setup → API access
# Save as google-service-account.json in project root
eas submit --platform android
```

**Play Console Setup:**
1. Create app → App name: **Boon**
2. Set up store listing: description, screenshots, icon
3. Content rating questionnaire
4. Release → Production → Create new release
5. Upload AAB (EAS does this automatically with `eas submit`)
6. Submit for review (typically 2-7 days)

---

## Step 9 — App Store Assets Needed

### Screenshots Required (iOS)
- 6.7" display (iPhone 15 Pro Max): 1290 × 2796px
- 6.5" display (iPhone 14 Plus): 1242 × 2688px  
- 5.5" display (iPhone 8 Plus): 1242 × 2208px
- iPad Pro 12.9": 2048 × 2732px

### Screenshots Required (Android)
- Phone: 1080 × 1920px minimum
- 7" tablet, 10" tablet

### App Icon
- iOS: 1024 × 1024px PNG (no alpha/transparency)
- Android: 512 × 512px PNG

**Tip:** Use [Previewed.app](https://previewed.app) or [AppMockUp](https://app-mockup.com) to create professional screenshots.

---

## Step 10 — OG Metadata Backend (Optional)

For the URL preview feature to work, deploy the Node.js backend:

```bash
cd backend
npm install
# Set up .env with your Firebase Admin SDK key
npm run start
```

Deploy to Railway, Render, or Fly.io and update `services/postService.ts`:
```typescript
const apiUrl = `https://YOUR_BACKEND_URL/og?url=${encodeURIComponent(url)}`;
```

---

## Environment Variables Checklist

```
✅ EXPO_PUBLIC_FIREBASE_API_KEY
✅ EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
✅ EXPO_PUBLIC_FIREBASE_PROJECT_ID
✅ EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
✅ EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
✅ EXPO_PUBLIC_FIREBASE_APP_ID
✅ EXPO_PUBLIC_OPENAI_API_KEY
```

---

## Quick Command Reference

```bash
npx expo start              # Start dev server
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator
eas build -p ios            # Build iOS
eas build -p android        # Build Android
eas submit -p ios           # Submit to App Store
eas submit -p android       # Submit to Play Store
eas build:list              # View all builds
```

---

## Support

- Expo Docs: [docs.expo.dev](https://docs.expo.dev)
- EAS Build: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- Firebase Docs: [firebase.google.com/docs](https://firebase.google.com/docs)
- App Store Review Guidelines: [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines)
