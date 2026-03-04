import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCLeycrTiRBGj0xCoL9ckvbAUOVfZWBUaI",
  authDomain: "studio-6840747069-75a4c.firebaseapp.com",
  projectId: "studio-6840747069-75a4c",
  storageBucket: "studio-6840747069-75a4c.firebasestorage.app",
  messagingSenderId: "44307931083",
  appId: "1:44307931083:web:93f925901c1a1abe75e04e",
  measurementId: "G-X59T0W4QR6"
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
