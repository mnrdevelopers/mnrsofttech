// PWA Initialization and Utilities
class PWAHelper {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true;
        
        this.init();
    }
    
    init() {
        this.registerServiceWorker();
        this.addInstallPrompt();
        this.detectStandaloneMode();
        this.addOnlineOfflineListeners();
    }
    
    // Register Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New service worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
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
            showToast('Connection restored', 'success');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            console.log('App is offline');
            showToast('You are currently offline', 'warning');
        });
    }
    
    // Sync offline data when coming online
    async syncOfflineData() {
        // Implement your offline data sync logic here
        console.log('Syncing offline data...');
    }
    
    // Show update notification
    showUpdateNotification() {
        const updateHTML = `
            <div class="install-prompt" id="updatePrompt">
                <div class="d-flex align-items-center">
                    <i class="fas fa-sync-alt fa-2x text-warning me-3"></i>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">Update Available</h6>
                        <p class="mb-0 text-muted">New version is ready</p>
                    </div>
                    <button class="btn btn-warning btn-sm me-2" onclick="pwaHelper.updateApp()">
                        Update
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="pwaHelper.hideUpdatePrompt()">
                        Later
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', updateHTML);
    }
    
    // Hide update prompt
    hideUpdatePrompt() {
        const prompt = document.getElementById('updatePrompt');
        if (prompt) {
            prompt.remove();
        }
    }
    
    // Update app
    updateApp() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            });
        }
    }
    
    // Check if app is installed
    isAppInstalled() {
        return this.isStandalone || this.deferredPrompt === null;
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
            // Fallback: copy to clipboard or show share options
            this.fallbackShare(invoiceData);
        }
    }
    
    // Fallback share method
    fallbackShare(invoiceData) {
        // Implement fallback sharing options
        showToast('Share feature not supported on this device', 'info');
    }
}

// Initialize PWA
const pwaHelper = new PWAHelper();

// Export for global access
window.pwaHelper = pwaHelper;
