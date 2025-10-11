// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Current user state
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Set default monthly period (current month)
    const firstDay = new Date();
    firstDay.setDate(1);
    const lastDay = new Date();
    lastDay.setMonth(lastDay.getMonth() + 1);
    lastDay.setDate(0);
    
    document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDay.toISOString().split('T')[0];
    
    // Populate month filter
    populateMonthFilter();
    
    // Initialize auth state listener
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Billing cycle change
    document.getElementById('billingCycle').addEventListener('change', handleBillingCycleChange);
    
    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Modal
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.querySelector('.close').addEventListener('click', hideLoginModal);
    
    // Invoice buttons
    document.getElementById('addItem').addEventListener('click', addNewItemRow);
    document.getElementById('addService').addEventListener('click', addNewServiceRow);
    document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoice);
    document.getElementById('previewBtn').addEventListener('click', generateInvoicePreview);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);
    document.getElementById('downloadJpgBtn').addEventListener('click', downloadAsJPEG);
    document.getElementById('printBtn').addEventListener('click', printInvoice);
    
    // Filter controls
    document.getElementById('billingCycleFilter').addEventListener('change', loadInvoices);
    document.getElementById('monthFilter').addEventListener('change', loadInvoices);
    
    // Remove item button event delegation
    document.getElementById('itemsContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const itemRow = e.target.closest('.item-row');
            if (document.querySelectorAll('.item-row').length > 1) {
                itemRow.remove();
            } else {
                itemRow.querySelectorAll('input').forEach(input => input.value = '');
                itemRow.querySelector('.item-qty').value = '1';
                itemRow.querySelector('.item-warranty').value = 'no-warranty';
                itemRow.querySelector('.custom-warranty-input').style.display = 'none';
            }
            generateInvoicePreview();
        }
    });
    
    // Remove service button event delegation
    document.getElementById('monthlyServicesContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-service') || e.target.closest('.remove-service')) {
            const serviceRow = e.target.closest('.monthly-service-row');
            if (document.querySelectorAll('.monthly-service-row').length > 1) {
                serviceRow.remove();
            } else {
                serviceRow.querySelectorAll('input').forEach(input => input.value = '');
            }
            generateInvoicePreview();
        }
    });
    
    // Warranty selection change handler
    document.getElementById('itemsContainer').addEventListener('change', function(e) {
        if (e.target.classList.contains('item-warranty')) {
            const customWarrantyInput = e.target.closest('.item-row').querySelector('.custom-warranty-input');
            if (e.target.value === 'custom') {
                customWarrantyInput.style.display = 'block';
            } else {
                customWarrantyInput.style.display = 'none';
            }
            generateInvoicePreview();
        }
    });
    
    // Auto-generate preview when inputs change
    document.getElementById('invoiceForm').addEventListener('input', function() {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }
        this.previewTimeout = setTimeout(generateInvoicePreview, 500);
    });
    
    // Add initial rows
    addNewItemRow();
    addNewServiceRow();
}

function handleBillingCycleChange() {
    const billingCycle = document.getElementById('billingCycle').value;
    const dailyFields = document.getElementById('dailyBillingFields');
    const monthlyFields = document.getElementById('monthlyBillingFields');
    
    if (billingCycle === 'monthly') {
        dailyFields.style.display = 'none';
        monthlyFields.style.display = 'block';
    } else {
        dailyFields.style.display = 'block';
        monthlyFields.style.display = 'none';
    }
    
    generateInvoicePreview();
}

function addNewItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
        <input type="text" class="item-desc" placeholder="Description" required>
        <input type="number" class="item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="item-price" placeholder="Price" min="0" step="0.01" required>
        <select class="item-warranty">
            <option value="no-warranty">No Warranty</option>
            <option value="7-days">7 Days</option>
            <option value="15-days">15 Days</option>
            <option value="1-month">1 Month</option>
            <option value="3-months">3 Months</option>
            <option value="6-months">6 Months</option>
            <option value="1-year">1 Year</option>
            <option value="custom">Custom</option>
        </select>
        <input type="text" class="custom-warranty-input" placeholder="Enter warranty details" style="display: none;">
        <button type="button" class="remove-item"><i class="fas fa-times"></i></button>
    `;
    itemsContainer.appendChild(newItemRow);
    newItemRow.querySelector('.item-desc').focus();
}

function addNewServiceRow() {
    const servicesContainer = document.getElementById('monthlyServicesContainer');
    const newServiceRow = document.createElement('div');
    newServiceRow.className = 'monthly-service-row';
    newServiceRow.innerHTML = `
        <input type="text" class="service-desc" placeholder="Service Description" required>
        <input type="number" class="service-price" placeholder="Monthly Price" min="0" step="0.01" required>
        <button type="button" class="remove-service"><i class="fas fa-times"></i></button>
    `;
    servicesContainer.appendChild(newServiceRow);
    newServiceRow.querySelector('.service-desc').focus();
}

function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentYear = new Date().getFullYear();
    
    // Add last 6 months and next 6 months
    for (let i = -6; i <= 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthName = months[month];
        const value = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${monthName} ${year}`;
        monthFilter.appendChild(option);
    }
}

// Auth functions (same as before)
function handleAuthStateChange(user) {
    currentUser = user;
    
    if (user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('invoiceForm').style.display = 'block';
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('historyContainer').style.display = 'block';
        
        loadInvoices();
        hideLoginModal();
    } else {
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('userEmail').textContent = '';
        document.getElementById('invoiceForm').style.display = 'none';
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('historyContainer').style.display = 'none';
    }
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    }
}

function logout() {
    auth.signOut();
}

async function saveInvoice() {
    if (!currentUser) {
        alert('Please login to save invoices');
        return;
    }
    
    const invoiceData = getInvoiceData();
    
    if (!invoiceData.customerName) {
        alert('Please fill in customer name');
        return;
    }
    
    if (invoiceData.billingCycle === 'daily' && !invoiceData.items.length) {
        alert('Please add at least one item for daily billing');
        return;
    }
    
    if (invoiceData.billingCycle === 'monthly' && !invoiceData.monthlyServices.length) {
        alert('Please add at least one service for monthly billing');
        return;
    }
    
    try {
        // Ensure all indexed fields are properly set
        const invoiceDate = invoiceData.invoiceDate;
        const month = invoiceDate ? invoiceDate.substring(0, 7) : ''; // YYYY-MM
        const year = invoiceDate ? invoiceDate.substring(0, 4) : '';  // YYYY
        
        const invoiceToSave = {
            ...invoiceData,
            userId: currentUser.uid,
            month: month,
            year: year,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validate required fields for indexing
        if (!invoiceToSave.userId) {
            throw new Error('User ID is required');
        }
        if (!invoiceToSave.billingCycle) {
            throw new Error('Billing cycle is required');
        }
        
        await db.collection('invoices').add(invoiceToSave);
        
        alert('Invoice saved successfully!');
        clearForm();
        loadInvoices();
    } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice: ' + error.message);
    }
}

function getInvoiceData() {
    const billingCycle = document.getElementById('billingCycle').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const notes = document.getElementById('notes').value;
    
    let items = [];
    let monthlyServices = [];
    let subtotal = 0;
    
    if (billingCycle === 'daily') {
        // Get daily items
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const description = row.querySelector('.item-desc').value;
            const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const warranty = row.querySelector('.item-warranty').value;
            const customWarranty = row.querySelector('.custom-warranty-input').value;
            const total = quantity * price;
            
            if (description) {
                items.push({
                    description,
                    quantity,
                    price,
                    warranty: warranty === 'custom' ? customWarranty : warranty,
                    total
                });
                subtotal += total;
            }
        });
    } else {
        // Get monthly services
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const serviceRows = document.querySelectorAll('.monthly-service-row');
        
        serviceRows.forEach(row => {
            const description = row.querySelector('.service-desc').value;
            const price = parseFloat(row.querySelector('.service-price').value) || 0;
            
            if (description) {
                monthlyServices.push({
                    description,
                    price,
                    total: price
                });
                subtotal += price;
            }
        });
    }
    
    return {
        billingCycle,
        invoiceNumber,
        invoiceDate,
        customerName,
        customerContact,
        customerAddress,
        notes,
        items,
        monthlyServices,
        startDate: billingCycle === 'monthly' ? document.getElementById('startDate').value : '',
        endDate: billingCycle === 'monthly' ? document.getElementById('endDate').value : '',
        subtotal,
        grandTotal: subtotal,
        status: 'draft'
    };
}

function clearForm() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    document.getElementById('monthlyServicesContainer').innerHTML = '';
    addNewItemRow();
    addNewServiceRow();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Set default monthly period
    const firstDay = new Date();
    firstDay.setDate(1);
    const lastDay = new Date();
    lastDay.setMonth(lastDay.getMonth() + 1);
    lastDay.setDate(0);
    
    document.getElementById('startDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('endDate').value = lastDay.toISOString().split('T')[0];
    
    generateInvoicePreview();
}

async function loadInvoices() {
    if (!currentUser) return;
    
    const invoicesList = document.getElementById('invoicesList');
    invoicesList.innerHTML = '<p>Loading invoices...</p>';
    
    const billingCycleFilter = document.getElementById('billingCycleFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    
    try {
        let query = db.collection('invoices');
        
        // Build query based on filters - these will use the composite indexes
        if (billingCycleFilter !== 'all' && monthFilter !== 'all') {
            // Filter by both billingCycle and month
            query = query
                .where('userId', '==', currentUser.uid)
                .where('billingCycle', '==', billingCycleFilter)
                .where('month', '==', monthFilter)
                .orderBy('createdAt', 'desc');
        } else if (billingCycleFilter !== 'all') {
            // Filter only by billingCycle
            query = query
                .where('userId', '==', currentUser.uid)
                .where('billingCycle', '==', billingCycleFilter)
                .orderBy('createdAt', 'desc');
        } else if (monthFilter !== 'all') {
            // Filter only by month
            query = query
                .where('userId', '==', currentUser.uid)
                .where('month', '==', monthFilter)
                .orderBy('createdAt', 'desc');
        } else {
            // No filters - just get all user invoices
            query = query
                .where('userId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc');
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            invoicesList.innerHTML = '<p>No invoices found. Create your first invoice!</p>';
            return;
        }
        
        invoicesList.innerHTML = '';
        snapshot.forEach(doc => {
            const invoice = { 
                id: doc.id, 
                ...doc.data(),
                // Convert Firestore timestamp to JavaScript Date
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
            };
            const invoiceElement = createInvoiceCard(invoice);
            invoicesList.appendChild(invoiceElement);
        });
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        
        // Show specific error message with index creation link
        if (error.code === 'failed-precondition') {
            invoicesList.innerHTML = `
                <div class="error-message">
                    <p><strong>Index Required:</strong> Please create the Firestore composite index.</p>
                    <p>Error: ${error.message}</p>
                    <p>Click the link in the browser console to create the index automatically, 
                    or create it manually in Firebase Console under Firestore > Indexes.</p>
                </div>
            `;
        } else {
            invoicesList.innerHTML = '<p>Error loading invoices: ' + error.message + '</p>';
        }
    }
}

function createInvoiceCard(invoice) {
    const card = document.createElement('div');
    card.className = 'invoice-card';
    
    const formattedDate = invoice.invoiceDate ? 
        new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : 
        'No date';
    
    const badgeClass = invoice.billingCycle === 'monthly' ? 'badge-monthly' : 'badge-daily';
    const badgeText = invoice.billingCycle === 'monthly' ? 'Monthly' : 'Daily';
    
    let periodInfo = '';
    if (invoice.billingCycle === 'monthly' && invoice.startDate && invoice.endDate) {
        const start = new Date(invoice.startDate).toLocaleDateString('en-IN');
        const end = new Date(invoice.endDate).toLocaleDateString('en-IN');
        periodInfo = `<div class="period-info">Period: ${start} to ${end}</div>`;
    }
    
    card.innerHTML = `
        <div class="invoice-card-header">
            <span class="invoice-number">${invoice.invoiceNumber || 'No number'}</span>
            <span class="billing-cycle-badge ${badgeClass}">${badgeText}</span>
            <span class="invoice-date">${formattedDate}</span>
        </div>
        <div class="invoice-customer">${invoice.customerName || 'No customer'}</div>
        ${periodInfo}
        <div class="invoice-total">₹${invoice.grandTotal?.toFixed(2) || '0.00'}</div>
        <div class="invoice-actions">
            <button class="btn-small btn-edit" onclick="loadInvoiceForEdit('${invoice.id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small btn-delete" onclick="deleteInvoice('${invoice.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

async function loadInvoiceForEdit(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            alert('Invoice not found');
            return;
        }
        
        const invoice = doc.data();
        
        // Set billing cycle first
        document.getElementById('billingCycle').value = invoice.billingCycle || 'daily';
        handleBillingCycleChange();
        
        // Populate common fields
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        document.getElementById('invoiceDate').value = invoice.invoiceDate || '';
        document.getElementById('customerName').value = invoice.customerName || '';
        document.getElementById('customerContact').value = invoice.customerContact || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('notes').value = invoice.notes || '';
        
        if (invoice.billingCycle === 'monthly') {
            // Populate monthly billing fields
            document.getElementById('startDate').value = invoice.startDate || '';
            document.getElementById('endDate').value = invoice.endDate || '';
            
            // Clear and populate services
            document.getElementById('monthlyServicesContainer').innerHTML = '';
            if (invoice.monthlyServices && invoice.monthlyServices.length > 0) {
                invoice.monthlyServices.forEach(service => {
                    addNewServiceRow();
                    const rows = document.querySelectorAll('.monthly-service-row');
                    const currentRow = rows[rows.length - 1];
                    
                    currentRow.querySelector('.service-desc').value = service.description || '';
                    currentRow.querySelector('.service-price').value = service.price || 0;
                });
            } else {
                addNewServiceRow();
            }
        } else {
            // Clear and populate daily items
            document.getElementById('itemsContainer').innerHTML = '';
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach((item, index) => {
                    addNewItemRow();
                    const rows = document.querySelectorAll('.item-row');
                    const currentRow = rows[rows.length - 1];
                    
                    currentRow.querySelector('.item-desc').value = item.description || '';
                    currentRow.querySelector('.item-qty').value = item.quantity || 1;
                    currentRow.querySelector('.item-price').value = item.price || 0;
                    
                    if (item.warranty && item.warranty !== 'no-warranty') {
                        if (['7-days', '15-days', '1-month', '3-months', '6-months', '1-year'].includes(item.warranty)) {
                            currentRow.querySelector('.item-warranty').value = item.warranty;
                        } else {
                            currentRow.querySelector('.item-warranty').value = 'custom';
                            currentRow.querySelector('.custom-warranty-input').value = item.warranty;
                            currentRow.querySelector('.custom-warranty-input').style.display = 'block';
                        }
                    }
                });
            } else {
                addNewItemRow();
            }
        }
        
        generateInvoicePreview();
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        alert('Error loading invoice: ' + error.message);
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        await db.collection('invoices').doc(invoiceId).delete();
        loadInvoices();
    } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Error deleting invoice: ' + error.message);
    }
}

function generateInvoicePreview() {
    const billingCycle = document.getElementById('billingCycle').value;
    const invoiceData = getInvoiceData();
    
    const invoiceHTML = createInvoiceHTML(invoiceData);
    const previewContainer = document.getElementById('invoicePreview');
    previewContainer.innerHTML = invoiceHTML;
}

function createInvoiceHTML(invoiceData) {
    const formattedDate = invoiceData.invoiceDate ? 
        new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';
    
    let itemsHTML = '';
    let periodInfo = '';
    
    if (invoiceData.billingCycle === 'monthly') {
        // Monthly billing template
        const startDate = invoiceData.startDate ? 
            new Date(invoiceData.startDate).toLocaleDateString('en-IN') : '';
        const endDate = invoiceData.endDate ? 
            new Date(invoiceData.endDate).toLocaleDateString('en-IN') : '';
        
        periodInfo = `
            <div class="invoice-period">
                <strong>Billing Period:</strong> ${startDate} to ${endDate}
            </div>
        `;
        
        itemsHTML = `
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Service Description</th>
                        <th class="text-right">Monthly Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.monthlyServices.map(service => `
                        <tr>
                            <td>${service.description}</td>
                            <td class="text-right">₹${service.price.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        // Daily billing template
        itemsHTML = `
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.items.map(item => `
                        <tr>
                            <td>
                                ${item.description}
                                ${item.warranty && item.warranty !== 'no-warranty' ? 
                                    `<span class="warranty-badge">
                                        Warranty: ${item.warranty.replace('-', ' ').replace(/(^|\s)\S/g, l => l.toUpperCase())}
                                    </span>` : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td>₹${item.price.toFixed(2)}</td>
                            <td class="text-right">₹${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    return `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">
                    <div class="invoice-number">Invoice #${invoiceData.invoiceNumber || '---'}</div>
                    <div class="invoice-date">Date: ${formattedDate}</div>
                    <div class="billing-cycle">${invoiceData.billingCycle === 'monthly' ? 'Monthly Billing' : 'One-Time Billing'}</div>
                </div>
            </div>
            
            <div class="invoice-company">
                <div class="company-name">MNR SoftTech Solutions</div>
                <div class="company-details">
                    Computer Software & Hardware Services<br>
                    Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                    Phone: +91 7416006394 (Whatsapp only)
                </div>
            </div>
            
            <div class="invoice-customer">
                <div class="customer-title">BILL TO:</div>
                <div class="customer-details">
                    ${invoiceData.customerName || 'Customer Name'}<br>
                    ${invoiceData.customerContact ? 'Phone: ' + invoiceData.customerContact + '<br>' : ''}
                    ${invoiceData.customerAddress || 'Address not provided'}
                </div>
            </div>
            
            ${periodInfo}
            ${itemsHTML}
            
            <div class="invoice-totals">
                <div class="invoice-totals-row invoice-grand-total">
                    <span class="invoice-totals-label">Total Amount:</span>
                    <span class="invoice-totals-value">₹${invoiceData.grandTotal.toFixed(2)}</span>
                </div>
            </div>
            
            ${invoiceData.billingCycle === 'daily' ? `
                <div class="warranty-disclaimer">
                    <h3>Warranty Terms</h3>
                    <p>Warranty covers manufacturing defects only. Does not cover:</p>
                    <ul>
                        <li>Physical damage or liquid damage</li>
                        <li>Unauthorized repairs or modifications</li>
                        <li>Software issues not related to hardware</li>
                    </ul>
                    <p>Original invoice required for all warranty claims.</p>
                </div>
            ` : `
                <div class="warranty-disclaimer">
                    <h3>Monthly Service Terms</h3>
                    <p>This is a recurring monthly service invoice. Services are billed in advance.</p>
                    <ul>
                        <li>Payment due upon receipt</li>
                        <li>Late payments may incur fees</li>
                        <li>Services may be suspended for non-payment</li>
                    </ul>
                </div>
            `}
            
            ${invoiceData.notes ? `
                <div class="invoice-notes">
                    <div class="invoice-notes-title">Notes:</div>
                    <div class="invoice-notes-content">${invoiceData.notes}</div>
                </div>
            ` : ''}
            
            <div style="margin-top: 3rem; text-align: center; color: #666; font-size: 0.9rem;">
                Thank you for your business!<br>
                MNR SoftTech Solutions
            </div>
        </div>
    `;
}

// Keep the existing download and print functions (they remain the same)
function downloadAsPDF() {
    generateInvoicePreview();
    const element = document.getElementById('invoicePreview');
    const opt = {
        margin: 10,
        filename: `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

function downloadAsJPEG() {
    generateInvoicePreview();
    const element = document.getElementById('invoicePreview');
    
    html2canvas(element).then(canvas => {
        const link = document.createElement('a');
        link.download = `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    });
}

function printInvoice() {
    generateInvoicePreview();
    
    setTimeout(() => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MNR SoftTech Solutions - Invoice</title>
                <style>
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                        }
                        .invoice-template {
                            width: 210mm;
                            min-height: 297mm;
                            margin: 0 auto;
                            padding: 15mm;
                            box-sizing: border-box;
                        }
                        .button-group, footer, header {
                            display: none !important;
                        }
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                    }
                    body {
                        visibility: hidden;
                    }
                    .invoice-template {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                </style>
            </head>
            <body>
                ${document.getElementById('invoicePreview').innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }, 100);
}
