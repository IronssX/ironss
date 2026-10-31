import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { AuthProvider } from '@/context/AuthProvider';
import { LanguageProvider } from '@/context/LanguageProvider';
import './index.css';

const isPrivacyPolicyPage =
  window.location.pathname.replace(/\/+$/, '') === '/privacy-policy';

if (isPrivacyPolicyPage) {
  document.title = 'Gizlilik Politikası - IRONSS';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPrivacyPolicyPage ? (
      <PrivacyPolicyPage />
    ) : (
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    )}
  </StrictMode>
);
