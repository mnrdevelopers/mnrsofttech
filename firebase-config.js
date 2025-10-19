// firebase-config.js - Enhanced with Authentication
const firebaseConfig = {
  apiKey: "AIzaSyCsgmsgUpMgb5Pw8xA_R3i9ybt6iEpNQ64",
  authDomain: "mnr-soft-tech-invoice.firebaseapp.com",
  projectId: "mnr-soft-tech-invoice",
  storageBucket: "mnr-soft-tech-invoice.firebasestorage.app",
  messagingSenderId: "846761019349",
  appId: "1:846761019349:web:98adfefb8ac2b44f115f5c",
  measurementId: "G-HTGPVDVPCR"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully with authentication");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore settings with better error handling
db.settings({
    ignoreUndefinedProperties: true,
    merge: true
});

// Enable offline persistence (optional)
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed:", err);
  });

console.log("Firebase services initialized");
