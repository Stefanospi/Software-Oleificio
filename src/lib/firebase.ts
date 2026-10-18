import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBfrSBgfuF9rz8ase2QjDOGU0Jd0OIjmX4",
  authDomain: "oleificio-30b84.firebaseapp.com",
  projectId: "oleificio-30b84",
  storageBucket: "oleificio-30b84.firebasestorage.app",
  messagingSenderId: "131550245358",
  appId: "1:131550245358:web:56a2440cb87716ada49eff",
  measurementId: "G-L2G63Z4XX4"
};

// Inizializza Firebase solo se non è già stato inizializzato
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
