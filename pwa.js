// PWA Initialization and Utilities
class PWAHelper {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
        this.updateAvailable = false;
        this.registration = null;
        
        this.init();
    }
    
    init() {
        this.registerServiceWorker();
        this.addInstallPrompt();
        this.detectStandaloneMode();
        this.addOnlineOfflineListeners();
        this.checkForUpdates();
    }
    
    // Register Service Worker with update handling
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', this.registration);
                
                this.setupUpdateHandling();
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    // Setup update handling
    setupUpdateHandling() {
        // Listen for claiming of control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Controller changed, reloading page...');
            this.showUpdateNotification('App updated successfully! Reloading...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        });
        
        // Listen for waiting service worker
        if (this.registration.waiting) {
            this.updateAvailable = true;
            this.showUpdatePrompt();
        }
        
        // Track installing service worker
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;
            console.log('New service worker found:', newWorker);
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    this.updateAvailable = true;
                    this.showUpdatePrompt();
                }
            });
        });
        
        // Periodically check for updates
        setInterval(() => {
            this.checkForUpdates();
        }, 60 * 60 * 1000); // Check every hour
    }
    
    // Check for updates
    async checkForUpdates() {
        if (this.registration) {
            try {
                await this.registration.update();
                console.log('Checked for updates');
            } catch (error) {
                console.error('Update check failed:', error);
            }
        }
    }
    
    // Add install prompt
    addInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.deferredPrompt = null;
            this.hideInstallPrompt();
            showToast('App installed successfully!', 'success');
        });
    }
    
    // Show install prompt
    showInstallPrompt() {
        // Remove existing prompt
        this.hideInstallPrompt();
        
        const promptHTML = `
            <div class="install-prompt" id="installPrompt">
                <div class="d-flex align-items-center">
                    <i class="fas fa-download fa-2x text-primary me-3"></i>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">Install MNR Invoices</h6>
                        <p class="mb-0 text-muted">Install app for better experience</p>
                    </div>
                    <button class="btn btn-primary btn-sm me-2" onclick="pwaHelper.installApp()">
                        Install
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="pwaHelper.hideInstallPrompt()">
                        Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideInstallPrompt();
        }, 10000);
    }
    
    // Hide install prompt
    hideInstallPrompt() {
        const prompt = document.getElementById('installPrompt');
        if (prompt) {
            prompt.remove();
        }
    }
    
    // Show update prompt
    showUpdatePrompt() {
        // Remove existing prompts
        this.hideUpdatePrompt();
        
        const updateHTML = `
            <div class="install-prompt" id="updatePrompt">
                <div class="d-flex align-items-center">
                    <i class="fas fa-sync-alt fa-2x text-warning me-3"></i>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">Update Available</h6>
                        <p class="mb-0 text-muted">New version is ready to install</p>
                    </div>
                    <button class="btn btn-warning btn-sm me-2" onclick="pwaHelper.updateApp()">
                        Update Now
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="pwaHelper.hideUpdatePrompt()">
                        Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', updateHTML);
        
        // Also show a toast notification
        this.showUpdateNotification('New update available!', 'info');
    }
    
    // Hide update prompt
    hideUpdatePrompt() {
        const prompt = document.getElementById('updatePrompt');
        if (prompt) {
            prompt.remove();
        }
    }
    
    // Update app
    async updateApp() {
        if (this.registration && this.registration.waiting) {
            // Send skip waiting message to service worker
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            this.showUpdateNotification('Updating app...', 'info');
            
            // Reload page when new service worker takes control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }
    
    // Show update notification
    showUpdateNotification(message, type = 'info') {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log('Update notification:', message);
            // Fallback notification
            this.fallbackNotification(message, type);
        }
    }
    
    // Fallback notification
    fallbackNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Install app
    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallPrompt();
        }
    }
    
    // Detect standalone mode
    detectStandaloneMode() {
        if (this.isStandalone) {
            document.body.classList.add('pwa-standalone');
            console.log('Running in standalone mode');
        }
    }
    
    // Add online/offline listeners
    addOnlineOfflineListeners() {
        window.addEventListener('online', () => {
            console.log('App is online');
            this.showUpdateNotification('Connection restored', 'success');
            this.syncOfflineData();
            this.checkForUpdates(); // Check for updates when coming online
        });
        
        window.addEventListener('offline', () => {
            console.log('App is offline');
            this.showUpdateNotification('You are currently offline', 'warning');
        });
    }
    
    // Sync offline data when coming online
    async syncOfflineData() {
        // Implement your offline data sync logic here
        console.log('Syncing offline data...');
    }
    
    // Check if update is available
    isUpdateAvailable() {
        return this.updateAvailable;
    }
    
    // Force check for updates (can be called from UI)
    async forceUpdateCheck() {
        this.showUpdateNotification('Checking for updates...', 'info');
        await this.checkForUpdates();
    }
    
    // Share functionality
    async shareInvoice(invoiceData) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Invoice ${invoiceData.invoiceNumber}`,
                    text: `Invoice from MNR SoftTech Solutions`,
                    url: window.location.href,
                });
                console.log('Invoice shared successfully');
            } catch (error) {
                console.log('Error sharing invoice:', error);
            }
        } else {
            console.log('Web Share API not supported');
            this.fallbackShare(invoiceData);
        }
    }
    
    // Fallback share method
    fallbackShare(invoiceData) {
        showToast('Share feature not supported on this device', 'info');
    }
}

// Initialize PWA
const pwaHelper = new PWAHelper();

// Export for global access
window.pwaHelper = pwaHelper;

// Add update check button to your UI (optional)
function addUpdateButtonToUI() {
    const updateButton = document.createElement('button');
    updateButton.className = 'btn btn-outline-info btn-sm ms-2';
    updateButton.innerHTML = '<i class="fas fa-sync-alt"></i> Check for Updates';
    updateButton.onclick = () => pwaHelper.forceUpdateCheck();
    
    // Add to header or somewhere in your UI
    const header = document.querySelector('header .logo-container');
    if (header) {
        header.appendChild(updateButton);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add update button after a delay
    setTimeout(addUpdateButtonToUI, 3000);
});
