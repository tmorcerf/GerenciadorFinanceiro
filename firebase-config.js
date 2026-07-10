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

// Habilita persistência offline para economizar leituras
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    console.warn("Erro ao habilitar persistência do Firestore:", err);
  });

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

window.firebaseDB = db;
window.firebaseAuth = auth;
window.firebaseProvider = provider;
