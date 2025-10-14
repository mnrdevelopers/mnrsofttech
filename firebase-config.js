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

// Global auth state variable
let isAuthenticated = false;
let authModalInitialized = false;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing auth...");
    initializeAuthSystem();
});

function initializeAuthSystem() {
    console.log("Initializing auth system...");
    
    // Set up auth state observer
    setupAuthStateObserver();
    
    // Set up auth form handler
    setupAuthFormHandler();
}

function setupAuthStateObserver() {
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
        // Even if there's an error, show auth modal
        handleLogout();
    });
}

function setupAuthFormHandler() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
        console.log("Auth form handler set up");
    } else {
        console.error("Auth form not found");
        // Retry after a short delay
        setTimeout(setupAuthFormHandler, 1000);
    }
}

// Handle successful login
function handleSuccessfulLogin() {
    console.log("Handling successful login");
    
    // Hide auth modal
    hideAuthModal();
    
    // Show app content
    showAppContent();
    
    // Add logout button
    addLogoutButton();
    
    // Initialize app functionality
    initializeApp();
}

// Handle logout
function handleLogout() {
    console.log("Handling logout");
    
    // Hide app content first
    hideAppContent();
    
    // Remove logout button
    removeLogoutButton();
    
    // Show auth modal
    showAuthModal();
}

// Show auth modal - FIXED VERSION
function showAuthModal() {
    console.log("Showing auth modal");
    
    // Ensure DOM is ready
    if (document.readyState !== 'complete') {
        console.log("DOM not ready, waiting...");
        setTimeout(showAuthModal, 100);
        return;
    }
    
    const authModalElement = document.getElementById('authModal');
    if (!authModalElement) {
        console.error("Auth modal element not found!");
        // Try to create it dynamically if missing
        createAuthModal();
        return;
    }
    
    try {
        let authModal = bootstrap.Modal.getInstance(authModalElement);
        
        if (!authModal) {
            authModal = new bootstrap.Modal(authModalElement, {
                backdrop: 'static',
                keyboard: false
            });
            console.log("New auth modal instance created");
        }
        
        // Show the modal
        authModal.show();
        console.log("Auth modal shown");
        
        // Clear form and focus
        setTimeout(() => {
            const authForm = document.getElementById('authForm');
            if (authForm) authForm.reset();
            
            const authEmail = document.getElementById('authEmail');
            if (authEmail) {
                authEmail.focus();
                authEmail.value = ''; // Clear any cached values
            }
            
            hideAuthError();
        }, 500);
        
    } catch (error) {
        console.error("Error showing auth modal:", error);
        // Fallback: show basic auth form
        showFallbackAuth();
    }
}

// Hide auth modal
function hideAuthModal() {
    console.log("Hiding auth modal");
    
    const authModalElement = document.getElementById('authModal');
    if (!authModalElement) return;
    
    try {
        const authModal = bootstrap.Modal.getInstance(authModalElement);
        if (authModal) {
            authModal.hide();
        }
    } catch (error) {
        console.error("Error hiding auth modal:", error);
    }
}

// Show app content
function showAppContent() {
    console.log("Showing app content");
    
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    if (main) main.style.display = 'block';
    if (header) header.style.display = 'block';
    if (footer) footer.style.display = 'block';
}

// Hide app content
function hideAppContent() {
    console.log("Hiding app content");
    
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    if (main) main.style.display = 'none';
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
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
        console.log("Logout button added");
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
    console.log("Auth form submitted");
    
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
        
        console.log("Attempting login with email:", email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login successful:", userCredential.user.email);
        
    } catch (error) {
        console.error("Login error:", error);
        showAuthError(getAuthErrorMessage(error));
        setAuthButtonLoading(submitBtn, false);
        
        // Shake the modal for visual feedback
        const authModalElement = document.getElementById('authModal');
        if (authModalElement) {
            authModalElement.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                authModalElement.style.animation = '';
            }, 500);
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
        console.log("Auth error shown:", message);
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

// Initialize app after login
function initializeApp() {
    console.log("Initializing app functionality...");
    
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

// Emergency fallback if modal doesn't work
function showFallbackAuth() {
    console.log("Using fallback auth");
    
    // Create a simple overlay for auth
    const fallbackAuth = document.createElement('div');
    fallbackAuth.id = 'fallbackAuth';
    fallbackAuth.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    fallbackAuth.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3>Sign In Required</h3>
            <form id="fallbackAuthForm">
                <div class="mb-3">
                    <label>Email:</label>
                    <input type="email" class="form-control" id="fallbackEmail" required>
                </div>
                <div class="mb-3">
                    <label>Password:</label>
                    <input type="password" class="form-control" id="fallbackPassword" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Sign In</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(fallbackAuth);
    
    // Handle fallback form submission
    document.getElementById('fallbackAuthForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('fallbackEmail').value;
        const password = document.getElementById('fallbackPassword').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                fallbackAuth.remove();
            })
            .catch(error => {
                alert('Login failed: ' + error.message);
            });
    });
}

// Check if user is authenticated
function checkAuth() {
    return isAuthenticated;
}

// Force show auth modal (for testing)
window.showAuth = function() {
    showAuthModal();
};

// Force logout (for testing)
window.forceLogout = function() {
    auth.signOut();
};

console.log("Firebase config loaded successfully");
