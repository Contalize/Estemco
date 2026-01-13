
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// CONFIGURAÇÃO PHOENIX PARA PERFORMANCE MÁXIMA
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Inicializa Firestore com persistência offline (Cache LRU)
// Isso é crucial para a estratégia "Cache First"
const db = getFirestore(app);

try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistência falhou: Múltiplas abas abertas.');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistência não suportada neste navegador.');
        }
    });
} catch (e) {
    console.log("Persistência já habilitada ou erro secundário.");
}

const auth = getAuth(app);
const storage = getStorage(app);
import { getAnalytics } from "firebase/analytics";
const analytics = getAnalytics(app);

import { GoogleAuthProvider } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

export { db, auth, storage, analytics, googleProvider };
