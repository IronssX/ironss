import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';
import { AuthProvider } from '@/context/AuthProvider';
import { LanguageProvider } from '@/context/LanguageProvider';
import './index.css';

const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const isPrivacyPolicyPage = pathname === '/privacy-policy';
const isTermsPage = pathname === '/terms';

if (isPrivacyPolicyPage) {
  document.title = 'Gizlilik Politikası - IRONSS';
} else if (isTermsPage) {
  document.title = 'Kullanım Şartları - IRONSS';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPrivacyPolicyPage ? (
      <PrivacyPolicyPage />
    ) : isTermsPage ? (
      <TermsPage />
    ) : (
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    )}
  </StrictMode>
);
