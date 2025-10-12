// Monthly Invoice Consolidation
document.addEventListener('DOMContentLoaded', function() {
    initializeConsolidationTab();
});

function initializeConsolidationTab() {
    // Initialize when tab is shown
    document.getElementById('consolidate-tab').addEventListener('shown.bs.tab', function() {
        loadCustomersForConsolidation();
        populateMonthYearDropdowns();
    });

    // Load invoices button
    document.getElementById('loadInvoicesBtn').addEventListener('click', loadDailyInvoices);

    // Select all invoices checkbox
    document.getElementById('selectAllInvoices').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#dailyInvoicesBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateConsolidationSummary();
    });

    // Generate consolidated invoice
    document.getElementById('generateConsolidatedBtn').addEventListener('click', generateConsolidatedInvoice);
    
    // Preview consolidated invoice
    document.getElementById('previewConsolidatedBtn').addEventListener('click', previewConsolidatedInvoice);
    
    // Download consolidated PDF
    document.getElementById('downloadConsolidatedPdf').addEventListener('click', downloadConsolidatedPDF);
    
    // Print consolidated invoice
    document.getElementById('printConsolidated').addEventListener('click', printConsolidatedInvoice);
    
    // Save consolidated invoice
    document.getElementById('saveConsolidatedBtn').addEventListener('click', saveConsolidatedInvoice);
}

async function loadCustomersForConsolidation() {
    try {
        const snapshot = await db.collection('invoices').get();
        const customers = new Set();
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            if (invoice.customerName) {
                customers.add(invoice.customerName);
            }
        });
        
        const customerSelect = document.getElementById('consolidateCustomer');
        customerSelect.innerHTML = '<option value="">-- Select Customer --</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer;
            option.textContent = customer;
            customerSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showAlert('Error loading customers: ' + error.message, 'danger');
    }
}

function populateMonthYearDropdowns() {
    const monthSelect = document.getElementById('consolidateMonth');
    const yearSelect = document.getElementById('consolidateYear');
    
    // Populate months
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    monthSelect.innerHTML = '<option value="">-- Select Month --</option>';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    // Populate years (current year and previous 2 years)
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">-- Select Year --</option>';
    
    for (let year = currentYear; year >= currentYear - 2; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

async function loadDailyInvoices() {
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (!customer || !month || !year) {
        showAlert('Please select customer, month, and year', 'warning');
        return;
    }
    
    try {
        showLoading('Loading daily invoices...');
        
        const snapshot = await db.collection('invoices')
            .where('customerName', '==', customer)
            .get();
        
        const dailyInvoices = [];
        const selectedMonth = parseInt(month);
        const selectedYear = parseInt(year);
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt);
            
            // Check if invoice is from selected month and year
            if (invoiceDate.getMonth() + 1 === selectedMonth && invoiceDate.getFullYear() === selectedYear) {
                dailyInvoices.push({
                    id: doc.id,
                    ...invoice,
                    originalDate: invoiceDate
                });
            }
        });
        
        // Sort by date
        dailyInvoices.sort((a, b) => a.originalDate - b.originalDate);
        
        displayDailyInvoices(dailyInvoices);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading daily invoices:', error);
        hideLoading();
        showAlert('Error loading daily invoices: ' + error.message, 'danger');
    }
}

function displayDailyInvoices(invoices) {
    const tbody = document.getElementById('dailyInvoicesBody');
    const resultsDiv = document.getElementById('consolidationResults');
    
    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i><br>
                    No invoices found for selected period
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = invoices.map(invoice => `
            <tr>
                <td>
                    <input type="checkbox" class="invoice-checkbox" value="${invoice.id}" 
                           data-amount="${invoice.grandTotal}" checked 
                           onchange="updateConsolidationSummary()">
                </td>
                <td>${invoice.invoiceNumber}</td>
                <td>${invoice.originalDate.toLocaleDateString('en-IN')}</td>
                <td>
                    <small>${invoice.items ? invoice.items.map(item => item.description).join(', ') : 'No items'}</small>
                </td>
                <td>₹${invoice.grandTotal.toFixed(2)}</td>
                <td>
                    <span class="badge ${getPaymentStatusBadgeClass(invoice.paymentStatus)}">
                        ${getPaymentStatusText(invoice.paymentStatus)}
                    </span>
                </td>
            </tr>
        `).join('');
    }
    
    resultsDiv.style.display = 'block';
    updateConsolidationSummary();
}

function updateConsolidationSummary() {
    const checkboxes = document.querySelectorAll('#dailyInvoicesBody .invoice-checkbox:checked');
    const summaryDiv = document.getElementById('consolidationSummary');
    
    if (checkboxes.length === 0) {
        summaryDiv.innerHTML = '<p class="text-muted">Select invoices to see summary</p>';
        return;
    }
    
    let totalAmount = 0;
    let serviceCount = 0;
    const services = new Set();
    
    checkboxes.forEach(checkbox => {
        totalAmount += parseFloat(checkbox.dataset.amount);
        
        // Find the invoice row to get service count
        const row = checkbox.closest('tr');
        const serviceText = row.cells[3].textContent;
        if (serviceText && serviceText !== 'No items') {
            serviceCount++;
            services.add(serviceText);
        }
    });
    
    summaryDiv.innerHTML = `
        <div class="mb-3">
            <h6>Consolidation Summary</h6>
            <hr class="my-2">
        </div>
        <div class="row text-center">
            <div class="col-6">
                <div class="border rounded p-2 bg-light">
                    <div class="h5 mb-1">${checkboxes.length}</div>
                    <small class="text-muted">Invoices</small>
                </div>
            </div>
            <div class="col-6">
                <div class="border rounded p-2 bg-light">
                    <div class="h5 mb-1">₹${totalAmount.toFixed(2)}</div>
                    <small class="text-muted">Total Amount</small>
                </div>
            </div>
        </div>
        <div class="mt-3">
            <small class="text-muted">Selected invoices will be combined into one monthly invoice.</small>
        </div>
    `;
}

function generateConsolidatedInvoice() {
    const selectedInvoices = getSelectedInvoices();
    
    if (selectedInvoices.length === 0) {
        showAlert('Please select at least one invoice to consolidate', 'warning');
        return;
    }
    
    previewConsolidatedInvoice();
}

function getSelectedInvoices() {
    const checkboxes = document.querySelectorAll('#dailyInvoicesBody .invoice-checkbox:checked');
    const selectedInvoices = [];
    
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const invoiceId = checkbox.value;
        const invoiceNumber = row.cells[1].textContent;
        const date = row.cells[2].textContent;
        const amount = parseFloat(checkbox.dataset.amount);
        
        selectedInvoices.push({
            id: invoiceId,
            invoiceNumber,
            date,
            amount
        });
    });
    
    return selectedInvoices;
}

function previewConsolidatedInvoice() {
    const selectedInvoices = getSelectedInvoices();
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (selectedInvoices.length === 0) return;
    
    // Calculate totals
    const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const monthName = new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
    
    // Generate consolidated invoice number
    const consolidatedNumber = `CON-${year}${month.toString().padStart(2, '0')}-${customer.substring(0, 3).toUpperCase()}`;
    
    const previewHTML = `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="invoice-title">CONSOLIDATED MONTHLY INVOICE</div>
                <div class="invoice-meta">
                    <div class="invoice-number">Invoice #${consolidatedNumber}</div>
                    <div class="invoice-date">Date: ${new Date().toLocaleDateString('en-IN')}</div>
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
                    ${customer}<br>
                    Billing Period: ${monthName} ${year}
                </div>
            </div>
            
            <div class="monthly-billing-info">
                <strong>Monthly Service Summary</strong><br>
                This invoice consolidates ${selectedInvoices.length} daily service invoices for ${monthName} ${year}
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Original Invoice #</th>
                        <th>Service Description</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${selectedInvoices.map(invoice => `
                        <tr>
                            <td>${invoice.date}</td>
                            <td>${invoice.invoiceNumber}</td>
                            <td>Daily Computer Services & Support</td>
                            <td class="text-right">₹${invoice.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr style="background-color: #f8f9fa;">
                        <td colspan="3" class="text-right"><strong>Monthly Total:</strong></td>
                        <td class="text-right"><strong>₹${totalAmount.toFixed(2)}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="invoice-totals">
                <div class="invoice-totals-row invoice-grand-total">
                    <span class="invoice-totals-label">Amount Due:</span>
                    <span class="invoice-totals-value">₹${totalAmount.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="warranty-disclaimer">
                <h3>Service Terms</h3>
                <p>This consolidated invoice includes all daily services provided during ${monthName} ${year}. Payment is due within 15 days of invoice date.</p>
                <p>For detailed service descriptions, please refer to individual daily invoices.</p>
            </div>
            
            <div class="invoice-notes">
                <div class="invoice-notes-title">Notes:</div>
                <div class="invoice-notes-content">
                    Thank you for your continued business! This consolidated invoice simplifies your monthly billing process.
                    Individual daily invoices are available upon request.
                </div>
            </div>
            
            <div style="margin-top: 3rem; text-align: center; color: #666; font-size: 0.9rem;">
                Consolidated Invoice Generated on ${new Date().toLocaleDateString('en-IN')}<br>
                MNR SoftTech Solutions
            </div>
        </div>
    `;
    
    document.getElementById('consolidatedInvoicePreview').innerHTML = previewHTML;
    document.getElementById('consolidatedPreview').style.display = 'block';
    
    // Scroll to preview
    document.getElementById('consolidatedPreview').scrollIntoView({ behavior: 'smooth' });
}

function downloadConsolidatedPDF() {
    const element = document.getElementById('consolidatedInvoicePreview');
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    const monthName = new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
    const filename = `Monthly_Invoice_${customer}_${monthName}_${year}.pdf`;
    
    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

function printConsolidatedInvoice() {
    const printContent = document.getElementById('consolidatedInvoicePreview').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Consolidated Monthly Invoice</title>
            <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print {
                    body { margin: 0; padding: 0; }
                    @page { size: A4; margin: 15mm; }
                }
            </style>
        </head>
        <body>${printContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

async function saveConsolidatedInvoice() {
    const selectedInvoices = getSelectedInvoices();
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (selectedInvoices.length === 0) {
        showAlert('No invoices selected', 'warning');
        return;
    }
    
    try {
        showLoading('Saving consolidated invoice...');
        
        const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        const monthName = new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
        const consolidatedNumber = `CON-${year}${month.toString().padStart(2, '0')}-${customer.substring(0, 3).toUpperCase()}`;
        
        // Create consolidated invoice data
        const consolidatedInvoice = {
            invoiceNumber: consolidatedNumber,
            invoiceDate: new Date().toISOString().split('T')[0],
            customerName: customer,
            customerContact: '',
            customerAddress: '',
            notes: `Consolidated monthly invoice for ${monthName} ${year}. Includes ${selectedInvoices.length} daily service invoices.`,
            items: [{
                description: `Monthly Computer Services - ${monthName} ${year}`,
                quantity: 1,
                price: totalAmount,
                warranty: 'no-warranty',
                total: totalAmount
            }],
            subtotal: totalAmount,
            grandTotal: totalAmount,
            paymentType: 'monthly',
            paymentStatus: 'unpaid',
            amountPaid: 0,
            balanceDue: totalAmount,
            isConsolidated: true,
            originalInvoices: selectedInvoices.map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                date: inv.date,
                amount: inv.amount
            })),
            billingPeriod: `${monthName} ${year}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to Firestore
        await db.collection('invoices').doc(consolidatedNumber).set(consolidatedInvoice);
        
        hideLoading();
        showAlert('Consolidated invoice saved successfully!', 'success');
        
        // Refresh dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving consolidated invoice:', error);
        hideLoading();
        showAlert('Error saving consolidated invoice: ' + error.message, 'danger');
    }
}
