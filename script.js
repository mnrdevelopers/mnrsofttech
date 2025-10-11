// Firebase configuration
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

let currentUser = null;
let currentEditingInvoice = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    
    auth.onAuthStateChanged(handleAuthStateChange);
    setupEventListeners();
    loadBillers();
    loadStats();
}

function setupEventListeners() {
    // Auth
    document.getElementById('loginBtn').addEventListener('click', () => new bootstrap.Modal(document.getElementById('loginModal')).show());
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Invoice Actions
    document.getElementById('addItem').addEventListener('click', addNewItemRow);
    document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoice);
    document.getElementById('updateInvoiceBtn').addEventListener('click', updateInvoice);
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);
    document.getElementById('printBtn').addEventListener('click', printInvoice);
    
    // Search and Filters
    document.getElementById('searchInvoices').addEventListener('input', loadInvoices);
    document.getElementById('statusFilter').addEventListener('change', loadInvoices);
    document.getElementById('dateFilter').addEventListener('change', loadInvoices);
    
    // Biller Management
    document.getElementById('billerForm').addEventListener('submit', saveBiller);
    document.getElementById('billerSelect').addEventListener('change', loadBillerDetails);
    
    // Auto-preview
    document.getElementById('invoiceForm').addEventListener('input', debounce(generateInvoicePreview, 500));
    
    addNewItemRow();
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('d-none');
    });
    
    if (sectionName === 'invoice-form') {
        document.getElementById('invoice-form-section').classList.remove('d-none');
        resetForm();
    } else if (sectionName === 'invoices-list') {
        document.getElementById('invoices-list-section').classList.remove('d-none');
        loadInvoices();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Item Management
function addNewItemRow() {
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control form-control-sm item-desc" placeholder="Item description" required></td>
        <td><input type="number" class="form-control form-control-sm item-qty" value="1" min="1" required></td>
        <td><input type="number" class="form-control form-control-sm item-price" placeholder="0.00" min="0" step="0.01" required></td>
        <td>
            <select class="form-select form-select-sm item-warranty">
                <option value="no-warranty">No Warranty</option>
                <option value="7-days">7 Days</option>
                <option value="15-days">15 Days</option>
                <option value="1-month">1 Month</option>
                <option value="3-months">3 Months</option>
                <option value="6-months">6 Months</option>
                <option value="1-year">1 Year</option>
            </select>
        </td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="removeItem(this)"><i class="fas fa-times"></i></button></td>
    `;
    container.appendChild(row);
}

function removeItem(button) {
    const rows = document.querySelectorAll('#itemsContainer tr');
    if (rows.length > 1) {
        button.closest('tr').remove();
    }
}

// Auth Functions
function handleAuthStateChange(user) {
    currentUser = user;
    if (user) {
        document.getElementById('loginBtn').classList.add('d-none');
        document.getElementById('logoutBtn').classList.remove('d-none');
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('loginModal').classList.remove('show');
        document.body.classList.remove('modal-open');
        document.querySelector('.modal-backdrop')?.remove();
        loadStats();
        loadInvoices();
    } else {
        document.getElementById('loginBtn').classList.remove('d-none');
        document.getElementById('logoutBtn').classList.add('d-none');
        document.getElementById('userEmail').textContent = '';
        showSection('invoice-form');
    }
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
        errorElement.classList.remove('d-none');
    }
}

function logout() {
    auth.signOut();
}

// Invoice CRUD Operations
async function saveInvoice() {
    if (!validateForm()) return;
    
    const invoiceData = getInvoiceData();
  try {
    await db.collection('invoices').add({
        ...invoiceData,
        userId: currentUser.uid,
        status: 'unpaid',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showToast('Invoice saved successfully!', 'success');
    resetForm();
    loadStats();
    loadInvoices();
} catch (error) {
    handleFirebaseError(error, 'saving invoice');
}

async function updateInvoice() {
    if (!currentEditingInvoice || !validateForm()) return;
    
    const invoiceData = getInvoiceData();
    try {
        await db.collection('invoices').doc(currentEditingInvoice).update({
            ...invoiceData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Invoice updated successfully!', 'success');
        resetForm();
        loadStats();
        loadInvoices();
    } catch (error) {
        showToast('Error updating invoice: ' + error.message, 'error');
    }
}

async function loadInvoices() {
    if (!currentUser) return;
    
    const searchTerm = document.getElementById('searchInvoices').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    try {
        let query = db.collection('invoices').where('userId', '==', currentUser.uid);
        const snapshot = await query.get();
        
        let invoices = [];
        snapshot.forEach(doc => {
            invoices.push({ id: doc.id, ...doc.data() });
        });
        
        // Apply filters
        invoices = invoices.filter(invoice => {
            let match = true;
            
            if (searchTerm) {
                match = match && (
                    invoice.invoiceNumber?.toLowerCase().includes(searchTerm) ||
                    invoice.customerName?.toLowerCase().includes(searchTerm)
                );
            }
            
            if (statusFilter !== 'all') {
                match = match && invoice.status === statusFilter;
            }
            
            if (dateFilter !== 'all') {
                const invoiceDate = new Date(invoice.invoiceDate);
                const today = new Date();
                
                switch (dateFilter) {
                    case 'today':
                        match = match && invoiceDate.toDateString() === today.toDateString();
                        break;
                    case 'week':
                        const weekAgo = new Date(today.setDate(today.getDate() - 7));
                        match = match && invoiceDate >= weekAgo;
                        break;
                    case 'month':
                        match = match && invoiceDate.getMonth() === today.getMonth() && 
                                 invoiceDate.getFullYear() === today.getFullYear();
                        break;
                }
            }
            
            return match;
        });
        
        displayInvoicesTable(invoices);
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function displayInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No invoices found</td></tr>';
        return;
    }
    
    tbody.innerHTML = invoices.map(invoice => `
        <tr>
            <td><strong>${invoice.invoiceNumber || 'N/A'}</strong></td>
            <td>${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
            <td>${invoice.customerName}</td>
            <td><strong>₹${invoice.grandTotal?.toFixed(2) || '0.00'}</strong></td>
            <td><span class="status-badge status-${invoice.status || 'unpaid'}">${invoice.status || 'unpaid'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewInvoice('${invoice.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editInvoice('${invoice.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteInvoice('${invoice.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewInvoice(invoiceId) {
    const doc = await db.collection('invoices').doc(invoiceId).get();
    if (doc.exists) {
        const invoice = doc.data();
        generateInvoicePreview(invoice);
        new bootstrap.Modal(document.getElementById('previewModal')).show();
    }
}

async function editInvoice(invoiceId) {
    const doc = await db.collection('invoices').doc(invoiceId).get();
    if (doc.exists) {
        const invoice = doc.data();
        currentEditingInvoice = invoiceId;
        
        // Populate form
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        document.getElementById('invoiceDate').value = invoice.invoiceDate || '';
        document.getElementById('customerName').value = invoice.customerName || '';
        document.getElementById('customerContact').value = invoice.customerContact || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('notes').value = invoice.notes || '';
        
        // Populate items
        document.getElementById('itemsContainer').innerHTML = '';
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                addNewItemRow();
                const rows = document.querySelectorAll('#itemsContainer tr');
                const lastRow = rows[rows.length - 1];
                
                lastRow.querySelector('.item-desc').value = item.description || '';
                lastRow.querySelector('.item-qty').value = item.quantity || 1;
                lastRow.querySelector('.item-price').value = item.price || 0;
                lastRow.querySelector('.item-warranty').value = item.warranty || 'no-warranty';
            });
        } else {
            addNewItemRow();
        }
        
        document.getElementById('saveInvoiceBtn').classList.add('d-none');
        document.getElementById('updateInvoiceBtn').classList.remove('d-none');
        showSection('invoice-form');
        
        generateInvoicePreview();
    }
}

async function deleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            await db.collection('invoices').doc(invoiceId).delete();
            showToast('Invoice deleted successfully!', 'success');
            loadInvoices();
            loadStats();
        } catch (error) {
            showToast('Error deleting invoice: ' + error.message, 'error');
        }
    }
}

// Stats and Analytics
async function loadStats() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('invoices')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let todayIncome = 0;
        let weekIncome = 0;
        let monthIncome = 0;
        let totalIncome = 0;
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            const invoiceDate = new Date(invoice.invoiceDate);
            const amount = invoice.grandTotal || 0;
            
            totalIncome += amount;
            
            if (invoiceDate >= todayStart) {
                todayIncome += amount;
            }
            if (invoiceDate >= weekStart) {
                weekIncome += amount;
            }
            if (invoiceDate >= monthStart) {
                monthIncome += amount;
            }
        });
        
        document.getElementById('todayIncome').textContent = '₹' + todayIncome.toFixed(2);
        document.getElementById('weekIncome').textContent = '₹' + weekIncome.toFixed(2);
        document.getElementById('monthIncome').textContent = '₹' + monthIncome.toFixed(2);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Biller Management
async function loadBillers() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('billers').where('userId', '==', currentUser.uid).get();
        const select = document.getElementById('billerSelect');
        const list = document.getElementById('billersList');
        
        select.innerHTML = '<option value="">-- Select Biller --</option>';
        list.innerHTML = '';
        
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-muted">No billers saved yet.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const biller = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = biller.name;
            select.appendChild(option);
            
            const billerElement = document.createElement('div');
            billerElement.className = 'd-flex justify-content-between align-items-center mb-2 p-2 border rounded';
            billerElement.innerHTML = `
                <div>
                    <strong>${biller.name}</strong>
                    <br><small class="text-muted">${biller.email || 'No email'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="editBiller('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBiller('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(billerElement);
        });
    } catch (error) {
        console.error('Error loading billers:', error);
    }
}

async function loadBillerDetails(billerId) {
    const doc = await db.collection('billers').doc(billerId).get();
    if (doc.exists) {
        const biller = doc.data();
        // Auto-fill customer details if needed
        document.getElementById('customerName').value = biller.name;
        document.getElementById('customerContact').value = biller.phone || '';
        document.getElementById('customerAddress').value = biller.address || '';
    }
}

async function saveBiller(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const billerId = document.getElementById('billerId').value;
    const billerData = {
        name: document.getElementById('billerName').value,
        email: document.getElementById('billerEmail').value,
        phone: document.getElementById('billerPhone').value,
        address: document.getElementById('billerAddress').value,
        userId: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (billerId) {
            await db.collection('billers').doc(billerId).update(billerData);
        } else {
            billerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('billers').add(billerData);
        }
        
        showToast('Biller saved successfully!', 'success');
        document.getElementById('billerForm').reset();
        document.getElementById('billerId').value = '';
        bootstrap.Modal.getInstance(document.getElementById('billerModal')).hide();
        loadBillers();
    } catch (error) {
        showToast('Error saving biller: ' + error.message, 'error');
    }
}

async function editBiller(billerId) {
    const doc = await db.collection('billers').doc(billerId).get();
    if (doc.exists) {
        const biller = doc.data();
        document.getElementById('billerId').value = billerId;
        document.getElementById('billerName').value = biller.name;
        document.getElementById('billerEmail').value = biller.email || '';
        document.getElementById('billerPhone').value = biller.phone || '';
        document.getElementById('billerAddress').value = biller.address || '';
        
        new bootstrap.Modal(document.getElementById('billerModal')).show();
    }
}

async function deleteBiller(billerId) {
    if (confirm('Are you sure you want to delete this biller?')) {
        try {
            await db.collection('billers').doc(billerId).delete();
            showToast('Biller deleted successfully!', 'success');
            loadBillers();
        } catch (error) {
            showToast('Error deleting biller: ' + error.message, 'error');
        }
    }
}

// Utility Functions
function getInvoiceData() {
    const items = [];
    let subtotal = 0;
    
    document.querySelectorAll('#itemsContainer tr').forEach(row => {
        const description = row.querySelector('.item-desc').value;
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const warranty = row.querySelector('.item-warranty').value;
        const total = quantity * price;
        
        if (description && description.trim() !== '') {
            items.push({ description, quantity, price, warranty, total });
            subtotal += total;
        }
    });
    
    return {
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        customerName: document.getElementById('customerName').value,
        customerContact: document.getElementById('customerContact').value,
        customerAddress: document.getElementById('customerAddress').value,
        notes: document.getElementById('notes').value,
        items,
        subtotal,
        grandTotal: subtotal,
        // Add default billing cycle to avoid errors
        billingCycle: 'daily',
        monthlyServices: [] // Add empty array to prevent errors
    };
}

function validateForm() {
    const customerName = document.getElementById('customerName').value;
    const items = document.querySelectorAll('#itemsContainer tr');
    let hasValidItems = false;
    
    items.forEach(row => {
        const description = row.querySelector('.item-desc').value;
        if (description) hasValidItems = true;
    });
    
    if (!customerName) {
        showToast('Please enter customer name', 'error');
        return false;
    }
    
    if (!hasValidItems) {
        showToast('Please add at least one item', 'error');
        return false;
    }
    
    return true;
}

function resetForm() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('saveInvoiceBtn').classList.remove('d-none');
    document.getElementById('updateInvoiceBtn').classList.add('d-none');
    currentEditingInvoice = null;
    addNewItemRow();
    generateInvoicePreview();
}

function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
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
    
    // Always use the daily billing template since we don't have monthly billing in form
    itemsHTML = `
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Warranty</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoiceData.items.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>
                            ${item.warranty && item.warranty !== 'no-warranty' ? 
                                `<span class="warranty-badge">
                                    ${item.warranty.replace('-', ' ').replace(/(^|\s)\S/g, l => l.toUpperCase())}
                                </span>` : 'No Warranty'}
                        </td>
                        <td class="text-right">₹${item.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    return `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="row">
                    <div class="col-6">
                        <div class="invoice-title">INVOICE</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="invoice-number"><strong>Invoice #:</strong> ${invoiceData.invoiceNumber || '---'}</div>
                        <div class="invoice-date"><strong>Date:</strong> ${formattedDate}</div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-6">
                    <div class="card">
                        <div class="card-header bg-light">
                            <strong>From:</strong>
                        </div>
                        <div class="card-body">
                            <strong>MNR SoftTech Solutions</strong><br>
                            Computer Software & Hardware Services<br>
                            Email: mnrdeveloper11@gmail.com<br>
                            Phone: +91 7416006394
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card">
                        <div class="card-header bg-light">
                            <strong>Bill To:</strong>
                        </div>
                        <div class="card-body">
                            <strong>${invoiceData.customerName || 'Customer Name'}</strong><br>
                            ${invoiceData.customerContact ? 'Phone: ' + invoiceData.customerContact + '<br>' : ''}
                            ${invoiceData.customerAddress || 'Address not provided'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4">
                ${itemsHTML}
            </div>
            
            <div class="row mt-4">
                <div class="col-8"></div>
                <div class="col-4">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <strong>Subtotal:</strong>
                                <span>₹${invoiceData.subtotal.toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <strong>Total Amount:</strong>
                                <span class="invoice-grand-total">₹${invoiceData.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${invoiceData.notes ? `
                <div class="mt-4">
                    <div class="card">
                        <div class="card-header bg-light">
                            <strong>Notes:</strong>
                        </div>
                        <div class="card-body">
                            ${invoiceData.notes}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="mt-5 pt-4 border-top text-center">
                <p class="text-muted">
                    Thank you for your business!<br>
                    <strong>MNR SoftTech Solutions</strong>
                </p>
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

function showPreview() {
    if (!validateForm()) {
        showToast('Please fill in all required fields before previewing', 'error');
        return;
    }
    
    generateInvoicePreview();
    new bootstrap.Modal(document.getElementById('previewModal')).show();
}

// Add this utility function for better error handling
function handleFirebaseError(error, operation) {
    console.error(`Error during ${operation}:`, error);
    let message = `Error ${operation}: `;
    
    switch (error.code) {
        case 'permission-denied':
            message += 'You do not have permission to perform this operation.';
            break;
        case 'unauthenticated':
            message += 'Please login to continue.';
            break;
        case 'not-found':
            message += 'Requested data not found.';
            break;
        default:
            message += error.message;
    }
    
    showToast(message, 'error');
 }
}
