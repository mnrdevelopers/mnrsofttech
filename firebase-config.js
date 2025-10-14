// firebase-config.js - Fixed Authentication Version
const firebaseConfig = {
  apiKey: "AIzaSyCsgmsgUpMgb5Pw8xA_R3i9ybt6iEpNQ64",
  authDomain: "mnr-soft-tech-invoice.firebaseapp.com",
  projectId: "mnr-soft-tech-invoice",
  storageBucket: "mnr-soft-tech-invoice.firebasestorage.app",
  messagingSenderId: "846761019349",
  appId: "1:846761019349:web:98adfefb8ac2b44f115f5c",
  measurementId: "G-HTGPVDVPCR"
};

// Global variables
let db, auth;
let isAuthenticated = false;
let authModal = null;

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } else {
        firebase.app();
        console.log("Firebase already initialized");
    }
    
    // Initialize Firestore and Auth after Firebase is ready
    db = firebase.firestore();
    auth = firebase.auth();

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

} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing authentication...");
    initializeAuthentication();
});

function initializeAuthentication() {
    // Set up auth form handler
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
        console.log("Auth form event listener added");
    } else {
        console.error("Auth form not found");
    }

    // Initialize auth modal
    initializeAuthModal();

    // Set up auth state observer
    setupAuthStateObserver();
}

function setupAuthStateObserver() {
    if (!auth) {
        console.error("Auth not initialized");
        return;
    }

    auth.onAuthStateChanged((user) => {
        console.log("Auth state changed:", user ? "User logged in" : "User logged out");
        
        if (user) {
            // User is signed in
            isAuthenticated = true;
            console.log("User email:", user.email);
            handleSuccessfulLogin();
        } else {
            // User is signed out
            isAuthenticated = false;
            handleLogout();
        }
    }, (error) => {
        console.error("Auth state observer error:", error);
    });
}

function initializeAuthModal() {
    const authModalElement = document.getElementById('authModal');
    if (!authModalElement) {
        console.error("Auth modal element not found");
        return;
    }

    try {
        authModal = new bootstrap.Modal(authModalElement, {
            backdrop: 'static',
            keyboard: false
        });
        console.log("Auth modal initialized");
    } catch (error) {
        console.error("Error initializing auth modal:", error);
    }
}

function showAuthModal() {
    if (!authModal) {
        console.error("Auth modal not initialized");
        return;
    }

    try {
        authModal.show();
        
        // Clear form and focus after modal is shown
        setTimeout(() => {
            const authForm = document.getElementById('authForm');
            if (authForm) authForm.reset();
            
            const authEmail = document.getElementById('authEmail');
            if (authEmail) {
                authEmail.focus();
            }
            
            hideAuthError();
        }, 300);
    } catch (error) {
        console.error("Error showing auth modal:", error);
    }
}

function hideAuthModal() {
    if (!authModal) {
        console.error("Auth modal not initialized");
        return;
    }

    try {
        authModal.hide();
    } catch (error) {
        console.error("Error hiding auth modal:", error);
    }
}

// Handle successful login
function handleSuccessfulLogin() {
    console.log("Handling successful login...");
    
    // Hide auth modal
    hideAuthModal();
    
    // Show app content with a small delay to ensure smooth transition
    setTimeout(() => {
        const mainElement = document.querySelector('main');
        const headerElement = document.querySelector('header');
        const footerElement = document.querySelector('footer');
        
        if (mainElement) mainElement.style.display = 'block';
        if (headerElement) headerElement.style.display = 'block';
        if (footerElement) footerElement.style.display = 'block';
        
        // Add logout button
        addLogoutButton();
        
        // Initialize app functionality
        initializeApp();
        
        showToast('Welcome! Application loaded successfully.', 'success');
    }, 500);
}

// Handle logout
function handleLogout() {
    console.log("Handling logout...");
    
    // Show auth modal
    showAuthModal();
    
    // Hide app content
    const mainElement = document.querySelector('main');
    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');
    
    if (mainElement) mainElement.style.display = 'none';
    if (headerElement) headerElement.style.display = 'none';
    if (footerElement) footerElement.style.display = 'none';
    
    // Remove logout button
    removeLogoutButton();
}

// Add logout button to header
function addLogoutButton() {
    removeLogoutButton(); // Remove existing first
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-outline-light btn-sm ms-auto';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
    logoutBtn.addEventListener('click', handleUserLogout);
    
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.appendChild(logoutBtn);
        console.log("Logout button added");
    } else {
        console.error("Logo container not found for logout button");
    }
}

// Remove logout button
function removeLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.remove();
        console.log("Logout button removed");
    }
}

// Handle user-initiated logout
async function handleUserLogout() {
    if (!auth) {
        console.error("Auth not initialized for logout");
        return;
    }

    try {
        showLoading('Signing out...');
        await auth.signOut();
        showToast('You have been signed out successfully', 'info');
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error signing out: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Handle auth form submission
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    if (!auth) {
        console.error("Auth not initialized for login");
        showAuthError('Authentication system not ready. Please refresh the page.');
        return;
    }

    const email = document.getElementById('authEmail')?.value;
    const password = document.getElementById('authPassword')?.value;
    const submitBtn = document.getElementById('authSubmitBtn');
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }

    try {
        setAuthButtonLoading(submitBtn, true);
        hideAuthError();
        
        console.log("Attempting login with email:", email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login successful for:", userCredential.user.email);
        
        // The auth state observer will handle the rest via handleSuccessfulLogin()
        
    } catch (error) {
        console.error("Login error:", error);
        showAuthError(getAuthErrorMessage(error));
        setAuthButtonLoading(submitBtn, false);
        
        // Re-focus on email field for correction
        const authEmail = document.getElementById('authEmail');
        if (authEmail) {
            authEmail.focus();
        }
    }
}

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    const errorMessage = document.getElementById('authErrorMessage');
    
    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.classList.remove('d-none');
        
        // Add shake animation
        errorDiv.style.animation = 'none';
        setTimeout(() => {
            errorDiv.style.animation = 'shake 0.5s ease-in-out';
        }, 10);
    } else {
        console.error("Auth error elements not found");
    }
}

// Hide auth error
function hideAuthError() {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.classList.add('d-none');
    }
}

// Set auth button loading state
function setAuthButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Sign In';
    }
}

// Get auth error messages
function getAuthErrorMessage(error) {
    if (!error || !error.code) {
        return 'An unexpected error occurred. Please try again.';
    }
    
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is not enabled.';
        default:
            return 'Login failed: ' + (error.message || 'Unknown error');
    }
}

// Initialize app after login
function initializeApp() {
    console.log("Initializing application functionality...");
    
    // Initialize dashboard if function exists
    if (typeof initializeDashboard === 'function') {
        console.log("Initializing dashboard...");
        initializeDashboard();
    }
    
    // Initialize invoices tab if function exists
    if (typeof setupInvoicesTab === 'function') {
        console.log("Initializing invoices tab...");
        setupInvoicesTab();
    }
    
    // Initialize consolidation tab if function exists
    if (typeof initializeConsolidationTab === 'function') {
        console.log("Initializing consolidation tab...");
        initializeConsolidationTab();
    }
    
    // Initialize bulk payments if function exists
    if (typeof initializeBulkPayments === 'function') {
        console.log("Initializing bulk payments...");
        initializeBulkPayments();
    }
    
    // Initialize customers if function exists
    if (typeof initializeCustomersTab === 'function') {
        console.log("Initializing customers tab...");
        initializeCustomersTab();
    }
}

// Check if user is authenticated
function checkAuth() {
    return isAuthenticated;
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

// Test Firestore connection (for debugging)
async function testFirebaseConnection() {
    if (!db || !isAuthenticated) {
        console.log("Firestore test skipped - not authenticated or db not ready");
        return false;
    }

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

// Make db and auth available globally
window.db = db;
window.auth = auth;
window.checkAuth = checkAuth;
window.handleUserLogout = handleUserLogout;
