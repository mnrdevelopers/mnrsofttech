// Add this to your main script.js or create a version.js
const APP_VERSION = '1.0.1';
const VERSION_KEY = 'mnr-invoice-version';

// Check version on app start
function checkVersion() {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== APP_VERSION) {
        console.log(`App updated from ${storedVersion} to ${APP_VERSION}`);
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        
        // Clear specific caches if needed
        if (storedVersion) {
            handleVersionUpgrade(storedVersion, APP_VERSION);
        }
    } else {
        console.log(`App version ${APP_VERSION} is current`);
    }
}

function handleVersionUpgrade(oldVersion, newVersion) {
    console.log(`Upgrading from ${oldVersion} to ${newVersion}`);
    
    // Perform any data migrations here
    if (oldVersion === '1.0.0' && newVersion === '1.0.1') {
        // Example: Migrate data structure
        migrateDataStructure();
    }
    
    // Force service worker update
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.update();
        });
    }
}

function migrateDataStructure() {
    // Implement data migration logic here
    console.log('Migrating data structure...');
}
