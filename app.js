import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");

const userAvatar = document.getElementById("user-avatar");
const userDisplayName = document.getElementById("user-display-name");
const logoutBtn = document.getElementById("logout-btn");

const messagesContainer = document.getElementById("messages-container");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let currentUser = null;
let unsubscribeMessages = null;

// --- TAB SWITCHING ---
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  hideError();
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  hideError();
});

function showError(msg) {
  authError.textContent = msg;
  authError.classList.remove("hidden");
}

function hideError() {
  authError.textContent = "";
  authError.classList.add("hidden");
}

// --- AUTHENTICATION ---
// Inscription
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    registerForm.reset();
  } catch (err) {
    showError(formatAuthError(err.code));
  }
});

// Connexion
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (err) {
    showError(formatAuthError(err.code));
  }
});

// Déconnexion
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Erreur de déconnexion :", err);
  }
});

// Ecouteur d'état d'authentification
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authSection.classList.add("hidden");
    chatSection.classList.remove("hidden");
    const name = user.displayName || user.email.split("@")[0];
    userDisplayName.textContent = name;
    userAvatar.textContent = name.charAt(0).toUpperCase();
    loadMessages();
  } else {
    chatSection.classList.add("hidden");
    authSection.classList.remove("hidden");
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }
    messagesContainer.innerHTML = '<div id="loading-spinner" class="spinner">Chargement des messages...</div>';
  }
});

// --- MESSAGERIE FIRESTORE TEMPS RÉEL ---
function loadMessages() {
  const messagesRef = collection(db, "messages");
  // Limiter aux 50 derniers messages triés par date d'envoi
  const q = query(messagesRef, orderBy("createdAt", "asc"), limit(50));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    if (snapshot.empty) {
      messagesContainer.innerHTML = '<div class="spinner">Aucun message pour le moment. Soyez le premier !</div>';
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      renderMessage(data);
    });

    // Défilement automatique vers le bas
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, (error) => {
    console.error("Erreur Firestore :", error);
    messagesContainer.innerHTML = '<div class="spinner">Erreur de chargement des messages.</div>';
  });
}

function renderMessage(data) {
  const isOwn = currentUser && currentUser.uid === data.senderId;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isOwn ? "own" : "other"}`;

  const senderSpan = document.createElement("div");
  senderSpan.className = "sender";
  senderSpan.textContent = data.senderName || "Anonyme";

  const textSpan = document.createElement("div");
  textSpan.className = "text";
  textSpan.textContent = data.text;

  const timeSpan = document.createElement("span");
  timeSpan.className = "time";
  if (data.createdAt) {
    const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
    timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    timeSpan.textContent = "À l'instant";
  }

  if (!isOwn) {
    messageDiv.appendChild(senderSpan);
  }
  messageDiv.appendChild(textSpan);
  messageDiv.appendChild(timeSpan);

  messagesContainer.appendChild(messageDiv);
}

// Envoi d'un message
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  messageInput.value = "";

  try {
    await addDoc(collection(db, "messages"), {
      text: text,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email.split("@")[0],
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Erreur lors de l'envoi :", err);
    alert("Impossible d'envoyer le message.");
  }
});

// --- PWA SERVICE WORKER ENREGISTREMENT ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("Service Worker enregistré :", reg.scope))
      .catch((err) => console.error("Erreur enregistrement SW :", err));
  });
}

// Helper pour traducteur d'erreurs Firebase Auth
function formatAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Cet email est déjà utilisé.";
    case "auth/invalid-email":
      return "Format d'email invalide.";
    case "auth/weak-password":
      return "Le mot de passe doit faire au moins 6 caractères.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect.";
    default:
      return "Une erreur est survenue (" + code + ").";
  }
}
