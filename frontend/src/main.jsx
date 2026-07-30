import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MotionConfig } from 'framer-motion';
import './index.css';
import App from './App.jsx';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isBot = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool/i.test(navigator.userAgent || '');

const Root = googleClientId
  ? () => (
    <GoogleOAuthProvider clientId={googleClientId}>
      <MotionConfig reducedMotion={isBot ? "always" : "user"}>
        <App />
      </MotionConfig>
    </GoogleOAuthProvider>
  )
  : () => (
    <MotionConfig reducedMotion={isBot ? "always" : "user"}>
      <App />
    </MotionConfig>
  );

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
