// firebase-config.js - Complete Authentication System
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
      if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
          console.log('Persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
          // The current browser doesn't support all of the features required
          console.log('Persistence not supported');
      }
  });

// Global auth state variable
let isAuthenticated = false;

// Authentication state observer - UPDATED FOR SEPARATE AUTH PAGE
auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? "User logged in" : "User logged out");
    console.log("Current page:", window.location.pathname);
    
    if (user) {
        // User is signed in
        isAuthenticated = true;
        console.log("User email:", user.email);
        
        // If we're on auth page, redirect to app
        if (isAuthPage()) {
            console.log("Redirecting to app from auth page");
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // We're on the main app page, initialize app
            initializeAppOnMainPage();
        }
        
    } else {
        // User is signed out
        isAuthenticated = false;
        console.log("User signed out");
        
        // If we're on main app page, redirect to auth
        if (isMainAppPage()) {
            console.log("Redirecting to auth from app page");
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 500);
        } else {
            // We're on auth page, ensure it's visible
            ensureAuthPageVisible();
        }
    }
});

// Check if current page is auth page
function isAuthPage() {
    return window.location.pathname.includes('auth.html') || 
           window.location.search.includes('auth=true');
}

// Check if current page is main app page
function isMainAppPage() {
    return window.location.pathname.includes('index.html') || 
           window.location.pathname === '/' || 
           window.location.pathname.endsWith('/') ||
           !window.location.pathname.includes('auth.html');
}

// Initialize app on main page
function initializeAppOnMainPage() {
    console.log("Initializing app on main page");
    
    // Show app content
    const mainElement = document.querySelector('main');
    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');
    
    if (mainElement) mainElement.style.display = 'block';
    if (headerElement) headerElement.style.display = 'block';
    if (footerElement) footerElement.style.display = 'block';
    
    // Add logout button
    addLogoutButton();
    
    // Initialize app functionality
    initializeAppFunctionality();
}

// Ensure auth page is visible
function ensureAuthPageVisible() {
    console.log("Ensuring auth page is visible");
    // Auth page should already be visible, but we can add any additional setup here
}

// Add logout button to main app
function addLogoutButton() {
    // Remove existing logout button first
    removeLogoutButton();
    
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
        // Auth state observer will handle the redirect to auth page
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error signing out: ' + error.message, 'error');
        hideLoading();
    }
}

// Initialize app functionality
function initializeAppFunctionality() {
    console.log("Initializing app functionality...");
    
    // Initialize all app modules
    const initFunctions = [
        'initializeDashboard',
        'setupInvoicesTab', 
        'initializeConsolidationTab',
        'initializeBulkPayments',
        'initializeCustomersTab'
    ];
    
    initFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            try {
                window[funcName]();
                console.log(`✓ Initialized ${funcName}`);
            } catch (error) {
                console.error(`Error initializing ${funcName}:`, error);
            }
        } else {
            console.warn(`Function ${funcName} not found`);
        }
    });
    
    // Set current year in footer
    try {
        document.getElementById('currentYear').textContent = new Date().getFullYear();
    } catch (error) {
        console.warn('Could not set current year in footer');
    }
    
    // Show success message
    setTimeout(() => {
        showToast('Welcome back! Application loaded successfully.', 'success');
    }, 1000);
}

// Auth form handling for auth page
function setupAuthPage() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
        console.log("Auth form setup complete");
    }
}

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
        showAuthLoading();
        hideAuthError();
        
        console.log("Attempting login...");
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login successful:", userCredential.user.email);
        
        // Auth state observer will handle the redirect
        
    } catch (error) {
        console.error("Login error:", error);
        showAuthError(getAuthErrorMessage(error));
        setAuthButtonLoading(submitBtn, false);
        hideAuthLoading();
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

// Show auth loading
function showAuthLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('d-none');
    }
}

// Hide auth loading
function hideAuthLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('d-none');
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

// Enhanced Loading Functions
function showLoading(message = 'Processing...') {
    // Remove existing loading overlay if any
    hideLoading();
    
    const loadingHTML = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Enhanced Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.remove();
        }
    });

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon ${getToastIcon(type)}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    return toast;
}

function getToastIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Enhanced Alert function (for backward compatibility)
function showAlert(message, type = 'info') {
    showToast(message, type, 5000);
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

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking page type...");
    
    if (isAuthPage()) {
        console.log("Setting up auth page...");
        setupAuthPage();
        
        // Focus on email field
        setTimeout(() => {
            const authEmail = document.getElementById('authEmail');
            if (authEmail) authEmail.focus();
        }, 500);
    } else if (isMainAppPage()) {
        console.log("Setting up main app page...");
        // Auth state observer will handle the rest
    }
});

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        db,
        auth,
        checkAuth,
        showToast,
        showLoading,
        hideLoading
    };
}
