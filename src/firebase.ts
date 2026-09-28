
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPpLlgzozOlWbZc0Y-BJ5tdVgZegDSNg8",
  authDomain: "fama-eb239.firebaseapp.com",
  projectId: "fama-eb239",
  storageBucket: "fama-eb239.firebasestorage.app",
  messagingSenderId: "590138411352",
  appId: "1:590138411352:web:7c77af4bf5ff5b18193d2d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
