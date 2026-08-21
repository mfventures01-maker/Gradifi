import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { offlineStorage } from './services/offlineStorageService';
import { offlineSyncService } from './services/offlineSyncService';

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.warn('[SW] Service Worker registration failed:', error);
      });
  });
}

// Initialize offline storage
offlineStorage.initialize()
  .then(() => {
    console.log('✅ Offline storage initialized');
    offlineSyncService.registerListeners();
    
    // Initial sync if online
    if (navigator.onLine) {
      offlineSyncService.syncAll().then(result => {
        console.log(`✅ Initial sync: ${result.synced} items synced`);
      });
    }
  })
  .catch(error => {
    console.warn('⚠️ Offline storage not available:', error);
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
