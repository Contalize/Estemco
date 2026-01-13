import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  console.log('--- DEBUG: LOADED ENV ---');
  console.log('VITE_FIREBASE_API_KEY:', env.VITE_FIREBASE_API_KEY);
  console.log('-------------------------');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify("AIzaSyDojE_OlqBqATiT4hHxlJMKoVUzKDAjetM"),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify("estemco-4cb55.firebaseapp.com"),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify("estemco-4cb55"),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify("estemco-4cb55.firebasestorage.app"),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify("1062357915034"),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify("1:1062357915034:web:f9e7267f0506660d68d623"),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify("G-RJ73SHVL5M"),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
