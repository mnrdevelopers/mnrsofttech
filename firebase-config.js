// firebase-config.js - No Authentication Version
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
        firebase.app();
        console.log("Firebase already initialized");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firestore only (no Auth)
const db = firebase.firestore();

// Firestore settings
db.settings({
    ignoreUndefinedProperties: true
});

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed:", err);
      if (err.code == 'failed-precondition') {
          console.log('Persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
          console.log('Persistence not supported');
      }
  });

// Initialize app immediately (no auth required)
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing app...");
    initializeApp();
});

// Initialize app functionality
function initializeApp() {
    console.log("Initializing app...");
    
    // Initialize all app components
    if (typeof initializeDashboard === 'function') {
        initializeDashboard();
    }
    
    if (typeof setupInvoicesTab === 'function') {
        setupInvoicesTab();
    }
    
    if (typeof initializeConsolidationTab === 'function') {
        initializeConsolidationTab();
    }
    
    if (typeof initializeBulkPayments === 'function') {
        initializeBulkPayments();
    }
    
    if (typeof initializeCustomersTab === 'function') {
        initializeCustomersTab();
    }
    
    // Show success message
    setTimeout(() => {
        showToast('Application loaded successfully!', 'success');
    }, 1000);
}

// Utility function to parse Firebase dates safely
function parseFirebaseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        return new Date(dateValue);
    } else if (dateValue instanceof Date) {
        return dateValue;
    } else {
        return new Date();
    }
}

// Test Firestore connection
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
        return false;
    }
}
