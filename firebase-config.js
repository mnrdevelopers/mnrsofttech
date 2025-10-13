// firebase-config.js - Updated with popup auth
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

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log("User is signed in:", user.email);
        hideAuthModal();
        showAppContent();
    } else {
        // User is signed out
        console.log("User is signed out");
        showAuthModal();
        hideAppContent();
    }
});

// Show auth modal
function showAuthModal() {
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    authModal.show();
    
    // Clear any previous errors
    hideAuthError();
    
    // Focus on email field
    setTimeout(() => {
        document.getElementById('authEmail').focus();
    }, 500);
}

// Hide auth modal
function hideAuthModal() {
    const authModal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
    if (authModal) {
        authModal.hide();
    }
}

// Show app content
function showAppContent() {
    document.querySelector('main').style.display = 'block';
    document.querySelector('header').style.display = 'block';
    document.querySelector('footer').style.display = 'block';
    addLogoutButton();
}

// Hide app content
function hideAppContent() {
    document.querySelector('main').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    removeLogoutButton();
}

// Add logout button to header
function addLogoutButton() {
    // Remove existing logout button if any
    removeLogoutButton();
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-outline-light btn-sm ms-auto';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
    logoutBtn.addEventListener('click', handleLogout);
    
    // Add to header
    const logoContainer = document.querySelector('.logo-container');
    logoContainer.appendChild(logoutBtn);
}

// Remove logout button
function removeLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.remove();
    }
}

// Handle authentication form submission
document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
});

// Handle authentication
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const submitBtn = document.getElementById('authSubmitBtn');
    
    try {
        setAuthButtonLoading(submitBtn, true);
        hideAuthError();
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Authentication successful:", userCredential.user.email);
        
        // Show success message
        showToast('Welcome back!', 'success');
        
    } catch (error) {
        console.error("Authentication error:", error);
        showAuthError(getAuthErrorMessage(error));
    } finally {
        setAuthButtonLoading(submitBtn, false);
    }
}

// Handle logout
async function handleLogout() {
    try {
        showLoading('Signing out...');
        await auth.signOut();
        showToast('You have been signed out', 'info');
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error signing out: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    const errorMessage = document.getElementById('authErrorMessage');
    
    errorMessage.textContent = message;
    errorDiv.classList.remove('d-none');
    
    // Shake animation for error
    errorDiv.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        errorDiv.style.animation = '';
    }, 500);
}

// Hide auth error
function hideAuthError() {
    const errorDiv = document.getElementById('authError');
    errorDiv.classList.add('d-none');
}

// Set auth button loading state
function setAuthButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Sign In';
    }
}

// Get user-friendly auth error messages
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

// Initialize on load
setTimeout(testFirebaseConnection, 1000);
