/**
 * firebase-config.js — Inicialização do Firebase para o Corta Gastos Scanner
 * 
 * Reusa o mesmo projeto Firebase do Corta Gastos (organizaze).
 * Os dados escaneados serão salvos numa coleção separada no Firestore.
 */

const firebaseConfig = {
  apiKey: "AIzaSyAtEzGRS_7pUflOkkdCDXDiMIt8Tq8lHYg",
  authDomain: "organizaze.firebaseapp.com",
  projectId: "organizaze",
  storageBucket: "organizaze.firebasestorage.app",
  messagingSenderId: "655748179229",
  appId: "1:655748179229:web:c90ff6a136392cf1fa2df4",
  measurementId: "G-FJDXYDG123"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Persistência offline — funciona sem internet
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    console.warn("[Firebase] Erro ao habilitar persistência:", err);
  });

window.firebaseDB = db;
