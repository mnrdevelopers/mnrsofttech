// firebase-config.js - With Authentication Version
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

// Initialize Firebase services
const auth = firebase.auth();
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

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User is signed in:", user.email);
        showAppContent();
        initializeApp();
    } else {
        console.log("User is signed out");
        showAuthScreen();
    }
});

// Show authentication screen
function showAuthScreen() {
    document.body.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <i class="fas fa-laptop-code fa-3x mb-3"></i>
                    <h2>MNR SoftTech Solutions</h2>
                    <p>Invoice Management System</p>
                </div>
                <div class="auth-body">
                    <form id="authForm">
                        <div class="mb-3">
                            <label for="authEmail" class="form-label">Email</label>
                            <input type="email" class="form-control" id="authEmail" required>
                        </div>
                        <div class="mb-3">
                            <label for="authPassword" class="form-label">Password</label>
                            <input type="password" class="form-control" id="authPassword" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 mb-3" id="loginBtn">
                            <i class="fas fa-sign-in-alt me-2"></i>Sign In
                        </button>
                        <div class="text-center">
                            <small class="text-muted">Contact admin for access</small>
                        </div>
                    </form>
                    <div id="authMessage" class="alert alert-danger mt-3" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;

    // Add auth event listeners
    document.getElementById('authForm').addEventListener('submit', handleAuth);
}

// Show main app content
function showAppContent() {
    document.body.innerHTML = `
        <!-- Your existing HTML content from index.html -->
        <!-- Copy the entire HTML from your index.html file here -->
    `;

    // Re-initialize the app
    initializeApp();
}

// Handle authentication
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const authMessage = document.getElementById('authMessage');

    try {
        setButtonLoading(loginBtn, true, 'Signing in...');
        authMessage.style.display = 'none';

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("User signed in:", userCredential.user);
        
    } catch (error) {
        console.error("Authentication error:", error);
        authMessage.textContent = getAuthErrorMessage(error);
        authMessage.style.display = 'block';
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

// Get user-friendly auth error messages
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later';
        default:
            return 'Authentication failed. Please try again';
    }
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        console.log("User signed out");
    }).catch((error) => {
        console.error("Logout error:", error);
    });
}

// Initialize app functionality
function initializeApp() {
    console.log("Initializing app...");
    
    // Add logout button to header
    addLogoutButton();
    
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

// Add logout button to header
function addLogoutButton() {
    const header = document.querySelector('header');
    if (header) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light btn-sm';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i> Logout';
        logoutBtn.onclick = logout;
        
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            logoContainer.style.display = 'flex';
            logoContainer.style.justifyContent = 'space-between';
            logoContainer.style.alignItems = 'center';
            
            const logoutContainer = document.createElement('div');
            logoutContainer.appendChild(logoutBtn);
            logoContainer.appendChild(logoutContainer);
        }
    }
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
