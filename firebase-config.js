// firebase-config.js - Fixed version
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

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore settings
db.settings({
    ignoreUndefinedProperties: true
});

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed:", err);
  });

// Global auth state variable
let isAuthenticated = false;

// Authentication state observer - SIMPLIFIED
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
});

// Handle successful login
function handleSuccessfulLogin() {
    // Hide auth modal
    const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
    if (authModal) {
        authModal.hide();
    }
    
    // Show app content
    document.querySelector('main').style.display = 'block';
    document.querySelector('header').style.display = 'block';
    document.querySelector('footer').style.display = 'block';
    
    // Add logout button
    addLogoutButton();
    
    // Initialize app functionality
    initializeApp();
}

// Handle logout
function handleLogout() {
    // Show auth modal
    showAuthModal();
    
    // Hide app content
    document.querySelector('main').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    
    // Remove logout button
    removeLogoutButton();
}

// Show auth modal
function showAuthModal() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeAuthModal();
        });
    } else {
        initializeAuthModal();
    }
}

function initializeAuthModal() {
    const authModalElement = document.getElementById('authModal');
    if (!authModalElement) return;
    
    const authModal = new bootstrap.Modal(authModalElement, {
        backdrop: 'static',
        keyboard: false
    });
    
    authModal.show();
    
    // Clear form and focus
    setTimeout(() => {
        const authForm = document.getElementById('authForm');
        if (authForm) authForm.reset();
        
        const authEmail = document.getElementById('authEmail');
        if (authEmail) authEmail.focus();
        
        hideAuthError();
    }, 500);
}

// Add logout button
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
    }
}

// Remove logout button
function removeLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.remove();
    }
}

// Handle user-initiated logout
async function handleUserLogout() {
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

// Initialize app after login
function initializeApp() {
    console.log("Initializing app...");
    
    // Initialize your tabs and functionality here
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
    
    // Show success message
    setTimeout(() => {
        showToast('Welcome back! Application loaded successfully.', 'success');
    }, 1000);
}

// Auth form handling
document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
});

// Handle auth form submission
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const submitBtn = document.getElementById('authSubmitBtn');
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    try {
        setAuthButtonLoading(submitBtn, true);
        hideAuthError();
        
        console.log("Attempting login...");
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login successful:", userCredential.user.email);
        
        // The auth state observer will handle the rest
        
    } catch (error) {
        console.error("Login error:", error);
        showAuthError(getAuthErrorMessage(error));
        setAuthButtonLoading(submitBtn, false);
    }
}

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    const errorMessage = document.getElementById('authErrorMessage');
    
    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.classList.remove('d-none');
        
        errorDiv.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            errorDiv.style.animation = '';
        }, 500);
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
        default:
            return 'Login failed. Please check your credentials.';
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

// Test Firestore connection
async function testFirebaseConnection() {
    try {
        // Only test if authenticated
        if (isAuthenticated) {
            const testDocRef = db.collection('test').doc('connection');
            await testDocRef.set({
                test: true,
                timestamp: new Date().toISOString()
            });
            console.log("Firestore connection test successful");
        }
        return true;
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        return false;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking auth state...");
    // Auth state observer will handle the rest
});
