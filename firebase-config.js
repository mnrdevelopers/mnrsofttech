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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } else {
        firebase.app(); // if already initialized, use that one
        console.log("Firebase already initialized");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firestore
const db = firebase.firestore();

// Firestore settings for better error handling
db.settings({
    ignoreUndefinedProperties: true
});

// Enable offline persistence (optional but recommended)
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed:", err);
  });

// Utility function to parse Firebase dates safely
function parseFirebaseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firebase Timestamp
        return dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        // ISO string
        return new Date(dateValue);
    } else if (dateValue instanceof Date) {
        // Already a Date object
        return dateValue;
    } else {
        // Fallback
        return new Date();
    }
}

// Test Firestore connection (remove this after testing)
async function testFirebaseConnection() {
    try {
        const testDocRef = db.collection('test').doc('connection');
        await testDocRef.set({
            test: true,
            timestamp: new Date().toISOString()
        });
        console.log("Firestore connection test successful");
        return true;
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        alert("Firebase connection failed. Please check:\n1. Firestore rules\n2. Internet connection\n3. Firebase configuration\n\nError: " + error.message);
        return false;
    }
}

// Run test on load
setTimeout(testFirebaseConnection, 1000);
