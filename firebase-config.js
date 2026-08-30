// Importation des SDK Firebase v10 via CDN ES Modules (ultra-léger, sans bundler requis)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Remplacez les valeurs ci-dessous par votre propre configuration Firebase Console
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-app.firebaseapp.com",
  projectId: "votre-app-id",
  storageBucket: "votre-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
