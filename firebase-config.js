// Firebase configuration
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
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firestore
const db = firebase.firestore();

// Test Firestore connection
db.collection('test').doc('connection').set({
    test: true,
    timestamp: new Date().toISOString()
}).then(() => {
    console.log("Firestore connection test successful");
}).catch((error) => {
    console.error("Firestore connection test failed:", error);
});
