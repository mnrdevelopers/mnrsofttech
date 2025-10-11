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

// Global Variables
let currentUser = null;
let invoices = [];
let currentEditingInvoice = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const invoiceForm = document.getElementById('invoiceForm');
const loginPrompt = document.getElementById('loginPrompt');

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateCurrentYear();
});

function initializeApp() {
    // Check authentication state
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            userEmail.textContent = user.email;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'flex';
            invoiceForm.style.display = 'block';
            loginPrompt.style.display = 'none';
            loadInvoices();
            loadBillerDetails();
            loadStatistics();
        } else {
            currentUser = null;
            userEmail.textContent = '';
            loginBtn.style.display = 'flex';
            logoutBtn.style.display = 'none';
            invoiceForm.style.display = 'none';
            loginPrompt.style.display = 'block';
        }
    });
}

function setupEventListeners() {
    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Auth
    loginBtn.addEventListener('click', showLoginModal);
    logoutBtn.addEventListener('click', handleLogout);
    loginForm.addEventListener('submit', handleLogin);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });

    // Invoice Form
    document.getElementById('billingCycle').addEventListener('change', toggleBillingPeriod);
    document.getElementById('addItem').addEventListener('click', addNewItem);
    document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoice);
    document.getElementById('previewBtn').addEventListener('click', previewInvoice);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPdf);
    document.getElementById('downloadJpgBtn').addEventListener('click', downloadJpg);
    document.getElementById('printBtn').addEventListener('click', printInvoice);

    // Real-time calculations
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-qty') || 
            e.target.classList.contains('item-price') ||
            e.target.id === 'taxPercent') {
            calculateTotals();
        }
        
        if (e.target.classList.contains('item-warranty')) {
            toggleCustomWarranty(e.target);
        }
    });

    // Invoices Tab
    document.getElementById('billingCycleFilter').addEventListener('change', filterInvoices);
    document.getElementById('statusFilter').addEventListener('change', filterInvoices);
    document.getElementById('monthFilter').addEventListener('change', filterInvoices);
    document.getElementById('exportBtn').addEventListener('click', exportInvoices);

    // Statistics Tab
    document.getElementById('refreshStats').addEventListener('click', loadStatistics);
    document.getElementById('statsPeriod').addEventListener('change', loadStatistics);

    // Biller Details
    document.getElementById('billerForm').addEventListener('submit', saveBillerDetails);
    
    // Update biller preview in real-time
    const billerInputs = ['companyName', 'companyTagline', 'companyAddress', 'companyPhone', 
                         'companyEmail', 'companyWebsite', 'companyGST', 'bankDetails', 'termsConditions'];
    billerInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateBillerPreview);
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function switchTab(tabName) {
    // Update navigation buttons
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Show selected tab
    tabContents.forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName + 'Tab');
    });

    // Load data for specific tabs
    if (tabName === 'invoices') {
        loadInvoices();
    } else if (tabName === 'stats') {
        loadStatistics();
    }
}

// Authentication Functions
function showLoginModal() {
    loginModal.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginModal.style.display = 'none';
        loginForm.reset();
        loginError.style.display = 'none';
    } catch (error) {
        loginError.textContent = error.message;
        loginError.style.display = 'block';
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Invoice Management Functions
function toggleBillingPeriod() {
    const billingCycle = document.getElementById('billingCycle').value;
    const billingPeriodFields = document.getElementById('billingPeriodFields');
    
    if (billingCycle !== 'daily') {
        billingPeriodFields.style.display = 'block';
        
        // Set default dates based on billing cycle
        const today = new Date();
        const startDate = new Date(today);
        
        switch(billingCycle) {
            case 'weekly':
                startDate.setDate(today.getDate() - 7);
                break;
            case 'monthly':
                startDate.setMonth(today.getMonth() - 1);
                break;
            case 'quarterly':
                startDate.setMonth(today.getMonth() - 3);
                break;
            case 'yearly':
                startDate.setFullYear(today.getFullYear() - 1);
                break;
        }
        
        document.getElementById('startDate').valueAsDate = startDate;
        document.getElementById('endDate').valueAsDate = today;
    } else {
        billingPeriodFields.style.display = 'none';
    }
}

function addNewItem() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
        <input type="text" class="item-desc" placeholder="Item/service description" required>
        <input type="number" class="item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="item-price" placeholder="0.00" min="0" step="0.01" required>
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
        <input type="text" class="custom-warranty-input" placeholder="Enter warranty" style="display: none;">
        <div class="item-total">₹0.00</div>
        <button type="button" class="remove-item btn-danger">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    itemsContainer.appendChild(newItemRow);
    
    // Add event listeners for the new row
    newItemRow.querySelector('.remove-item').addEventListener('click', function() {
        itemsContainer.removeChild(newItemRow);
        calculateTotals();
    });
    
    newItemRow.querySelector('.item-warranty').addEventListener('change', function() {
        toggleCustomWarranty(this);
    });
}

function toggleCustomWarranty(selectElement) {
    const customInput = selectElement.parentElement.querySelector('.custom-warranty-input');
    if (selectElement.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
}

function calculateTotals() {
    let subtotal = 0;
    const itemRows = document.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const total = qty * price;
        
        row.querySelector('.item-total').textContent = `₹${total.toFixed(2)}`;
        subtotal += total;
    });
    
    const taxPercent = parseFloat(document.getElementById('taxPercent').value) || 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const grandTotal = subtotal + taxAmount;
    
    document.getElementById('subtotalAmount').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `₹${taxAmount.toFixed(2)}`;
    document.getElementById('grandTotalAmount').textContent = `₹${grandTotal.toFixed(2)}`;
}

async function saveInvoice() {
    if (!currentUser) {
        alert('Please login to save invoices');
        return;
    }

    const invoiceData = collectInvoiceData();
    
    try {
        if (currentEditingInvoice) {
            // Update existing invoice
            await db.collection('invoices').doc(currentEditingInvoice).update(invoiceData);
            alert('Invoice updated successfully!');
        } else {
            // Create new invoice
            await db.collection('invoices').add({
                ...invoiceData,
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });
            alert('Invoice saved successfully!');
        }
        
        resetInvoiceForm();
        loadInvoices();
    } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice: ' + error.message);
    }
}

function collectInvoiceData() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const warrantySelect = row.querySelector('.item-warranty');
        let warranty = warrantySelect.value;
        
        if (warranty === 'custom') {
            warranty = row.querySelector('.custom-warranty-input').value;
        }
        
        items.push({
            description: row.querySelector('.item-desc').value,
            quantity: parseFloat(row.querySelector('.item-qty').value),
            price: parseFloat(row.querySelector('.item-price').value),
            warranty: warranty,
            total: parseFloat(row.querySelector('.item-qty').value) * parseFloat(row.querySelector('.item-price').value)
        });
    });

    const subtotal = parseFloat(document.getElementById('subtotalAmount').textContent.replace('₹', ''));
    const taxAmount = parseFloat(document.getElementById('taxAmount').textContent.replace('₹', ''));
    const grandTotal = parseFloat(document.getElementById('grandTotalAmount').textContent.replace('₹', ''));

    return {
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        billingCycle: document.getElementById('billingCycle').value,
        customerName: document.getElementById('customerName').value,
        customerContact: document.getElementById('customerContact').value,
        customerAddress: document.getElementById('customerAddress').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        items: items,
        subtotal: subtotal,
        taxPercent: parseFloat(document.getElementById('taxPercent').value) || 0,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        notes: document.getElementById('notes').value,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };
}

function resetInvoiceForm() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceDate').valueAsDate = new Date();
    document.getElementById('itemsContainer').innerHTML = '';
    addNewItem(); // Add one empty item row
    calculateTotals();
    currentEditingInvoice = null;
    document.getElementById('saveInvoiceBtn').innerHTML = '<i class="fas fa-save"></i> Save Invoice';
}

async function loadInvoices() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('invoices')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        invoices = [];
        snapshot.forEach(doc => {
            invoices.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayInvoices();
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function displayInvoices(filteredInvoices = null) {
    const invoicesList = document.getElementById('invoicesList');
    const dataToDisplay = filteredInvoices || invoices;
    
    invoicesList.innerHTML = '';

    if (dataToDisplay.length === 0) {
        invoicesList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No invoices found</td></tr>';
        return;
    }

    dataToDisplay.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoiceNumber}</td>
            <td>${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
            <td>${invoice.customerName}</td>
            <td>${invoice.billingCycle}</td>
            <td>₹${invoice.grandTotal.toFixed(2)}</td>
            <td><span class="status-badge status-${invoice.status || 'pending'}">${invoice.status || 'pending'}</span></td>
            <td>
                <button class="btn-secondary view-invoice" data-id="${invoice.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-primary edit-invoice" data-id="${invoice.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-danger delete-invoice" data-id="${invoice.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        invoicesList.appendChild(row);
    });

    // Add event listeners for action buttons
    document.querySelectorAll('.view-invoice').forEach(btn => {
        btn.addEventListener('click', () => viewInvoice(btn.dataset.id));
    });
    
    document.querySelectorAll('.edit-invoice').forEach(btn => {
        btn.addEventListener('click', () => editInvoice(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-invoice').forEach(btn => {
        btn.addEventListener('click', () => deleteInvoice(btn.dataset.id));
    });
}

function filterInvoices() {
    const billingCycleFilter = document.getElementById('billingCycleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;

    let filtered = invoices;

    if (billingCycleFilter !== 'all') {
        filtered = filtered.filter(inv => inv.billingCycle === billingCycleFilter);
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(inv => (inv.status || 'pending') === statusFilter);
    }

    if (monthFilter) {
        filtered = filtered.filter(inv => {
            const invoiceDate = new Date(inv.invoiceDate);
            const filterDate = new Date(monthFilter + '-01');
            return invoiceDate.getFullYear() === filterDate.getFullYear() && 
                   invoiceDate.getMonth() === filterDate.getMonth();
        });
    }

    displayInvoices(filtered);
}

async function viewInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const modal = document.getElementById('viewInvoiceModal');
    const content = document.getElementById('viewInvoiceContent');
    
    content.innerHTML = generateInvoiceHTML(invoice);
    modal.style.display = 'block';

    // Add print functionality for the view modal
    document.getElementById('printViewBtn').onclick = () => printInvoiceContent(content);
}

async function editInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Switch to invoice tab
    switchTab('invoice');
    
    // Populate form with invoice data
    document.getElementById('invoiceNumber').value = invoice.invoiceNumber;
    document.getElementById('invoiceDate').value = invoice.invoiceDate;
    document.getElementById('billingCycle').value = invoice.billingCycle;
    document.getElementById('customerName').value = invoice.customerName;
    document.getElementById('customerContact').value = invoice.customerContact || '';
    document.getElementById('customerAddress').value = invoice.customerAddress || '';
    document.getElementById('startDate').value = invoice.startDate || '';
    document.getElementById('endDate').value = invoice.endDate || '';
    document.getElementById('taxPercent').value = invoice.taxPercent || 0;
    document.getElementById('notes').value = invoice.notes || '';

    // Clear existing items and add invoice items
    document.getElementById('itemsContainer').innerHTML = '';
    invoice.items.forEach((item, index) => {
        if (index === 0) {
            // Use existing first row
            const firstRow = document.querySelector('.item-row');
            firstRow.querySelector('.item-desc').value = item.description;
            firstRow.querySelector('.item-qty').value = item.quantity;
            firstRow.querySelector('.item-price').value = item.price;
            firstRow.querySelector('.item-warranty').value = item.warranty;
            
            if (item.warranty && !firstRow.querySelector('.item-warranty').querySelector(`option[value="${item.warranty}"]`)) {
                firstRow.querySelector('.item-warranty').value = 'custom';
                firstRow.querySelector('.custom-warranty-input').value = item.warranty;
                firstRow.querySelector('.custom-warranty-input').style.display = 'block';
            }
        } else {
            addNewItem();
            const newRow = document.querySelector('.item-row:last-child');
            newRow.querySelector('.item-desc').value = item.description;
            newRow.querySelector('.item-qty').value = item.quantity;
            newRow.querySelector('.item-price').value = item.price;
            newRow.querySelector('.item-warranty').value = item.warranty;
            
            if (item.warranty && !newRow.querySelector('.item-warranty').querySelector(`option[value="${item.warranty}"]`)) {
                newRow.querySelector('.item-warranty').value = 'custom';
                newRow.querySelector('.custom-warranty-input').value = item.warranty;
                newRow.querySelector('.custom-warranty-input').style.display = 'block';
            }
        }
    });

    // Update totals and set editing state
    calculateTotals();
    currentEditingInvoice = invoiceId;
    document.getElementById('saveInvoiceBtn').innerHTML = '<i class="fas fa-save"></i> Update Invoice';
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
        await db.collection('invoices').doc(invoiceId).delete();
        loadInvoices();
        alert('Invoice deleted successfully!');
    } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Error deleting invoice: ' + error.message);
    }
}

// Export and Print Functions
function previewInvoice() {
    const invoiceData = collectInvoiceData();
    const previewContent = document.getElementById('invoicePreview');
    
    previewContent.innerHTML = generateInvoiceHTML(invoiceData);
}

function generateInvoiceHTML(invoiceData) {
    // This function generates the HTML for invoice preview and viewing
    // Implementation would create a professional invoice layout
    return `
        <div class="invoice-template">
            <div class="invoice-header">
                <h2>INVOICE</h2>
                <div class="invoice-meta">
                    <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
                    <p><strong>Date:</strong> ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="invoice-details">
                <div class="biller-info">
                    <h3>${document.getElementById('companyName')?.value || 'MNR SoftTech Solutions'}</h3>
                    <p>${document.getElementById('companyTagline')?.value || 'Computer Software & Hardware Services'}</p>
                </div>
                <div class="customer-info">
                    <h3>Bill To:</h3>
                    <p><strong>${invoiceData.customerName}</strong></p>
                    <p>${invoiceData.customerContact || ''}</p>
                    <p>${invoiceData.customerAddress || ''}</p>
                </div>
            </div>
            <table class="invoice-items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Warranty</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.price.toFixed(2)}</td>
                            <td>${item.warranty}</td>
                            <td>₹${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Subtotal:</strong></td>
                        <td><strong>₹${invoiceData.subtotal.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Tax (${invoiceData.taxPercent}%):</strong></td>
                        <td><strong>₹${invoiceData.taxAmount.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Grand Total:</strong></td>
                        <td><strong>₹${invoiceData.grandTotal.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            ${invoiceData.notes ? `<div class="invoice-notes"><strong>Notes:</strong> ${invoiceData.notes}</div>` : ''}
        </div>
    `;
}

async function downloadPdf() {
    const element = document.getElementById('invoicePreview');
    const opt = {
        margin: 1,
        filename: `invoice-${document.getElementById('invoiceNumber').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

async function downloadJpg() {
    const element = document.getElementById('invoicePreview');
    const canvas = await html2canvas(element);
    const image = canvas.toDataURL('image/jpeg', 1.0);
    
    const link = document.createElement('a');
    link.download = `invoice-${document.getElementById('invoiceNumber').value}.jpg`;
    link.href = image;
    link.click();
}

function printInvoice() {
    const printContent = document.getElementById('invoicePreview').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload(); // Reload to restore functionality
}

function printInvoiceContent(contentElement) {
    const printContent = contentElement.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

// Statistics Functions
async function loadStatistics() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('invoices')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const allInvoices = [];
        snapshot.forEach(doc => {
            allInvoices.push({
                id: doc.id,
                ...doc.data()
            });
        });

        updateStatisticsCards(allInvoices);
        updateCharts(allInvoices);
        updateRecentInvoices(allInvoices);
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateStatisticsCards(invoices) {
    const totalIncome = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalInvoices = invoices.length;
    const pendingAmount = invoices
        .filter(inv => (inv.status || 'pending') === 'pending')
        .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const avgInvoice = totalInvoices > 0 ? totalIncome / totalInvoices : 0;

    document.getElementById('totalIncome').textContent = `₹${totalIncome.toFixed(2)}`;
    document.getElementById('totalInvoices').textContent = totalInvoices;
    document.getElementById('pendingAmount').textContent = `₹${pendingAmount.toFixed(2)}`;
    document.getElementById('avgInvoice').textContent = `₹${avgInvoice.toFixed(2)}`;
}

function updateCharts(invoices) {
    // Income Trend Chart
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    const monthlyData = calculateMonthlyData(invoices);
    
    new Chart(incomeCtx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Monthly Income',
                data: monthlyData.amounts,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Income Trend'
                }
            }
        }
    });

    // Invoice Types Chart
    const typeCtx = document.getElementById('typeChart').getContext('2d');
    const typeData = calculateTypeData(invoices);
    
    new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: typeData.labels,
            datasets: [{
                data: typeData.counts,
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12',
                    '#9b59b6'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function calculateMonthlyData(invoices) {
    // Group invoices by month and calculate totals
    const monthlyTotals = {};
    
    invoices.forEach(invoice => {
        const date = new Date(invoice.invoiceDate);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyTotals[monthYear]) {
            monthlyTotals[monthYear] = 0;
        }
        
        monthlyTotals[monthYear] += invoice.grandTotal || 0;
    });
    
    // Get last 6 months
    const labels = [];
    const amounts = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        
        labels.push(monthName);
        amounts.push(monthlyTotals[monthYear] || 0);
    }
    
    return { labels, amounts };
}

function calculateTypeData(invoices) {
    const typeCounts = {};
    
    invoices.forEach(invoice => {
        const type = invoice.billingCycle || 'monthly';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return {
        labels: Object.keys(typeCounts),
        counts: Object.values(typeCounts)
    };
}

function updateRecentInvoices(invoices) {
    const recentInvoicesList = document.getElementById('recentInvoicesList');
    const recentInvoices = invoices
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, 5);
    
    if (recentInvoices.length === 0) {
        recentInvoicesList.innerHTML = '<p>No recent invoices</p>';
        return;
    }
    
    recentInvoicesList.innerHTML = recentInvoices.map(invoice => `
        <div class="recent-invoice-item">
            <div class="invoice-info">
                <strong>${invoice.invoiceNumber}</strong>
                <span>${invoice.customerName}</span>
            </div>
            <div class="invoice-amount">
                ₹${invoice.grandTotal.toFixed(2)}
                <span class="status-badge status-${invoice.status || 'pending'}">${invoice.status || 'pending'}</span>
            </div>
        </div>
    `).join('');
}

// Biller Details Functions
async function loadBillerDetails() {
    if (!currentUser) return;

    try {
        const doc = await db.collection('billerDetails').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            // Populate form fields
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element) element.value = data[key];
            });
            updateBillerPreview();
        }
    } catch (error) {
        console.error('Error loading biller details:', error);
    }
}

async function saveBillerDetails(e) {
    e.preventDefault();
    if (!currentUser) return;

    const billerData = {
        companyName: document.getElementById('companyName').value,
        companyTagline: document.getElementById('companyTagline').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyWebsite: document.getElementById('companyWebsite').value,
        companyGST: document.getElementById('companyGST').value,
        bankDetails: document.getElementById('bankDetails').value,
        termsConditions: document.getElementById('termsConditions').value,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('billerDetails').doc(currentUser.uid).set(billerData, { merge: true });
        alert('Biller details saved successfully!');
    } catch (error) {
        console.error('Error saving biller details:', error);
        alert('Error saving biller details: ' + error.message);
    }
}

function updateBillerPreview() {
    document.getElementById('previewCompanyName').textContent = document.getElementById('companyName').value;
    document.getElementById('previewTagline').textContent = document.getElementById('companyTagline').value;
    document.getElementById('previewAddress').textContent = document.getElementById('companyAddress').value;
    
    const phone = document.getElementById('companyPhone').value;
    const email = document.getElementById('companyEmail').value;
    document.getElementById('previewContact').textContent = `Phone: ${phone} | Email: ${email}`;
    
    const website = document.getElementById('companyWebsite').value;
    document.getElementById('previewWebsite').textContent = website ? `Website: ${website}` : '';
    
    const gst = document.getElementById('companyGST').value;
    document.getElementById('previewGST').textContent = gst ? `GST: ${gst}` : '';
    
    const bankDetails = document.getElementById('bankDetails').value;
    document.getElementById('previewBankDetails').innerHTML = bankDetails ? `<strong>Bank Details:</strong><br>${bankDetails.replace(/\n/g, '<br>')}` : '';
    
    const terms = document.getElementById('termsConditions').value;
    document.getElementById('previewTerms').innerHTML = terms ? `<strong>Terms & Conditions:</strong><br>${terms.replace(/\n/g, '<br>')}` : '';
}

// Export Invoices to Excel/CSV
function exportInvoices() {
    const dataToExport = invoices.map(invoice => ({
        'Invoice Number': invoice.invoiceNumber,
        'Date': new Date(invoice.invoiceDate).toLocaleDateString(),
        'Customer': invoice.customerName,
        'Billing Cycle': invoice.billingCycle,
        'Subtotal': invoice.subtotal,
        'Tax': invoice.taxAmount,
        'Grand Total': invoice.grandTotal,
        'Status': invoice.status || 'pending'
    }));

    // Convert to CSV
    const csv = convertToCSV(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return csv;
}

// Utility Functions
function updateCurrentYear() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// Initialize first item row
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for the first remove button
    const firstRemoveBtn = document.querySelector('.remove-item');
    if (firstRemoveBtn) {
        firstRemoveBtn.addEventListener('click', function() {
            const itemsContainer = document.getElementById('itemsContainer');
            if (itemsContainer.children.length > 1) {
                itemsContainer.removeChild(this.parentElement);
                calculateTotals();
            }
        });
    }
    
    // Set current date as default
    document.getElementById('invoiceDate').valueAsDate = new Date();
    
    // Initialize billing cycle
    toggleBillingPeriod();
});
