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

// Security Rules (to be set in Firebase Console)
const securityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access only to authenticated users
    match /invoices/{invoice} {
      allow read, write: if request.auth != null;
    }
    match /customers/{customer} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`;

// Firestore settings with enhanced security
db.settings({
    ignoreUndefinedProperties: true
});

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User is signed in:", user.email);
        initializeApp();
    } else {
        console.log("User is signed out");
        showLoginScreen();
    }
});

// Initialize app after authentication
function initializeApp() {
    console.log("Initializing secured application...");
    
    // Initialize all app components
    if (typeof initializeDashboard === 'function') initializeDashboard();
    if (typeof setupInvoicesTab === 'function') setupInvoicesTab();
    if (typeof initializeConsolidationTab === 'function') initializeConsolidationTab();
    if (typeof initializeBulkPayments === 'function') initializeBulkPayments();
    if (typeof initializeCustomersTab === 'function') initializeCustomersTab();
    
    showToast('Application loaded securely!', 'success');
}
