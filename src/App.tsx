import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsConditions } from './pages/TermsConditions';

export function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'privacy' | 'terms'>('dashboard');

  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'terms') {
    return <TermsConditions onBack={() => setCurrentPage('dashboard')} />;
  }

  return (
    <Dashboard
      onOpenPrivacy={() => setCurrentPage('privacy')}
      onOpenTerms={() => setCurrentPage('terms')}
    />
  );
}

export default App;
