// firebase-config.js - Fixed Version
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
    console.log("✅ Firebase initialized successfully");
  } else {
    firebase.app();
    console.log("✅ Firebase already initialized");
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// REMOVED deprecated settings to fix warnings
// db.settings({
//   ignoreUndefinedProperties: true
// });

// Enable offline persistence with error handling
db.enablePersistence()
  .catch((err) => {
    console.log("Persistence failed:", err);
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code == 'unimplemented') {
      console.log('Browser does not support persistence');
    }
  });

// Global auth state
let isAuthenticated = false;
let authModal = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 DOM loaded, setting up authentication...");
  initializeAuthSystem();
});

function initializeAuthSystem() {
  console.log("🛠️ Initializing authentication system...");
  
  // Initialize auth modal
  initializeAuthModal();
  
  // Set up auth form
  setupAuthForm();
  
  // Set up auth state observer
  setupAuthObserver();
  
  // Initially hide app content
  hideAppContent();
}

function initializeAuthModal() {
  const authModalElement = document.getElementById('authModal');
  if (!authModalElement) {
    console.error("❌ Auth modal element not found");
    return;
  }

  try {
    authModal = new bootstrap.Modal(authModalElement, {
      backdrop: 'static',
      keyboard: false
    });
    console.log("✅ Auth modal initialized");
    
    // Show modal immediately
    setTimeout(() => {
      authModal.show();
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error initializing auth modal:", error);
  }
}

function setupAuthForm() {
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
    console.log("✅ Auth form event listener added");
  } else {
    console.error("❌ Auth form not found");
  }
}

function setupAuthObserver() {
  auth.onAuthStateChanged((user) => {
    console.log("🔄 Auth state changed:", user ? "User signed in" : "User signed out");
    
    if (user) {
      // User is signed in
      isAuthenticated = true;
      console.log("✅ User authenticated:", user.email);
      handleSuccessfulLogin();
    } else {
      // User is signed out
      isAuthenticated = false;
      console.log("❌ User not authenticated");
      handleLogout();
    }
  }, (error) => {
    console.error("❌ Auth state observer error:", error);
  });
}

function handleAuthSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const submitBtn = document.getElementById('authSubmitBtn');
  
  if (!email || !password) {
    showAuthError('Please fill in all fields');
    return;
  }

  // Simple credentials check for demo
  if (email === 'admin@mnr.com' && password === 'admin123') {
    // Simulate successful login
    handleSuccessfulLogin();
    return;
  }

  // Try Firebase authentication
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("✅ Firebase login successful");
      handleSuccessfulLogin();
    })
    .catch((error) => {
      console.error("❌ Firebase login failed:", error);
      showAuthError('Invalid credentials. Use admin@mnr.com / admin123 for demo');
    });
}

function handleSuccessfulLogin() {
  console.log("🎉 Handling successful login...");
  
  // Hide auth modal
  if (authModal) {
    authModal.hide();
  }
  
  // Show app content
  showAppContent();
  
  // Add logout button
  addLogoutButton();
  
  // Initialize app functionality
  initializeApp();
  
  showToast('Welcome to MNR SoftTech Solutions!', 'success');
}

function handleLogout() {
  console.log("👋 Handling logout...");
  
  // Sign out from Firebase
  auth.signOut().catch(error => {
    console.error("Logout error:", error);
  });
  
  // Show auth modal
  if (authModal) {
    authModal.show();
  }
  
  // Hide app content
  hideAppContent();
  
  // Remove logout button
  removeLogoutButton();
}

function showAppContent() {
  const mainElement = document.querySelector('main');
  const headerElement = document.querySelector('header');
  const footerElement = document.querySelector('footer');
  
  if (mainElement) mainElement.style.display = 'block';
  if (headerElement) headerElement.style.display = 'flex';
  if (footerElement) footerElement.style.display = 'block';
  
  console.log("✅ App content shown");
}

function hideAppContent() {
  const mainElement = document.querySelector('main');
  const headerElement = document.querySelector('header');
  const footerElement = document.querySelector('footer');
  
  if (mainElement) mainElement.style.display = 'none';
  if (headerElement) headerElement.style.display = 'none';
  if (footerElement) footerElement.style.display = 'none';
  
  console.log("✅ App content hidden");
}

function addLogoutButton() {
  removeLogoutButton(); // Remove existing first
  
  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logoutBtn';
  logoutBtn.className = 'btn btn-outline-light btn-sm ms-auto';
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
  logoutBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
      handleLogout();
    }
  });
  
  const logoContainer = document.querySelector('.logo-container');
  if (logoContainer) {
    logoContainer.appendChild(logoutBtn);
    console.log("✅ Logout button added");
  }
}

function removeLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.remove();
    console.log("✅ Logout button removed");
  }
}

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
  }
}

function hideAuthError() {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.classList.add('d-none');
  }
}

function initializeApp() {
  console.log("🛠️ Initializing application...");
  
  // Initialize all app modules
  setTimeout(() => {
    if (typeof setupInvoicesTab === 'function') {
      setupInvoicesTab();
    }
    
    if (typeof initializeDashboard === 'function') {
      initializeDashboard();
    }
    
    if (typeof initializeCustomersTab === 'function') {
      initializeCustomersTab();
    }
    
    if (typeof initializeConsolidationTab === 'function') {
      initializeConsolidationTab();
    }
    
    if (typeof initializeBulkPayments === 'function') {
      initializeBulkPayments();
    }
    
    console.log("✅ All app modules initialized");
  }, 500);
}

// Make functions globally available
window.db = db;
window.auth = auth;
window.handleLogout = handleLogout;
window.isAuthenticated = () => isAuthenticated;
