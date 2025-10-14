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
        showToast('Please select customer, month, and year', 'warning');
        return;
    }
    
    try {
        showLoading('Loading daily invoices...', 'dots');
        
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
        
    } catch (error) {
        console.error('Error loading daily invoices:', error);
        showToast('Error loading daily invoices: ' + error.message, 'error');
    } finally {
        hideLoading();
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

async function generateConsolidatedInvoice() {
    const selectedInvoices = await getSelectedInvoices();
    
    if (selectedInvoices.length === 0) {
        showAlert('Please select at least one invoice to consolidate', 'warning');
        return;
    }
    
    await previewConsolidatedInvoice();
}

async function getSelectedInvoices() {
    const checkboxes = document.querySelectorAll('#dailyInvoicesBody .invoice-checkbox:checked');
    const selectedInvoices = [];
    
    for (const checkbox of checkboxes) {
        const invoiceId = checkbox.value;
        
        try {
            // Fetch the complete invoice data from Firestore
            const doc = await db.collection('invoices').doc(invoiceId).get();
            
            if (doc.exists) {
                const invoice = doc.data();
                const row = checkbox.closest('tr');
                const invoiceNumber = row.cells[1].textContent;
                const date = row.cells[2].textContent;
                const amount = parseFloat(checkbox.dataset.amount);
                
                selectedInvoices.push({
                    id: invoiceId,
                    invoiceNumber,
                    date,
                    amount,
                    items: invoice.items || [],
                    customerContact: invoice.customerContact || '',
                    customerAddress: invoice.customerAddress || '',
                    notes: invoice.notes || ''
                });
            }
        } catch (error) {
            console.error('Error fetching invoice details:', error);
        }
    }
    
    return selectedInvoices;
}

async function previewConsolidatedInvoice() {
    const selectedInvoices = await getSelectedInvoices();
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (selectedInvoices.length === 0) return;
    
    // Calculate totals and collect all services
    const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const monthName = new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
    
    // Generate consolidated invoice number
    const consolidatedNumber = `CON-${year}${month.toString().padStart(2, '0')}-${customer.substring(0, 3).toUpperCase()}`;
    
    // Get customer contact and address from first invoice (assuming they're the same)
    const firstInvoice = selectedInvoices[0];
    const customerContact = firstInvoice.customerContact || '';
    const customerAddress = firstInvoice.customerAddress || '';
    
    // Count total services across all invoices
    const totalServices = selectedInvoices.reduce((sum, invoice) => sum + (invoice.items ? invoice.items.length : 0), 0);
    
    const previewHTML = `
        <div class="invoice-template" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background: white; box-sizing: border-box;">
            <div class="invoice-header" style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
                <div class="invoice-title" style="font-size: 28px; color: #2c3e50; font-weight: bold;">CONSOLIDATED INVOICE <span class="badge bg-warning">Monthly</span></div>
                <div class="invoice-meta" style="text-align: right;">
                    <div class="invoice-number" style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">Invoice #${consolidatedNumber}</div>
                    <div class="invoice-date" style="color: #666; font-size: 14px;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
                </div>
            </div>
            
            <div class="invoice-company" style="margin-bottom: 30px;">
                <div class="company-name" style="font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">MNR SoftTech Solutions</div>
                <div class="company-details" style="color: #666; line-height: 1.5; font-size: 14px;">
                    Computer Software & Hardware Services<br>
                    Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                    Phone: +91 7416006394 (Whatsapp only)
                </div>
            </div>
            
            <div class="invoice-customer" style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 4px solid #3498db;">
                <div class="customer-title" style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 16px;">BILL TO:</div>
                <div class="customer-details" style="color: #333; line-height: 1.5; font-size: 14px;">
                    ${customer}<br>
                    ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                    ${customerAddress || 'Address not provided'}<br>
                    <strong>Billing Period:</strong> ${monthName} ${year}
                </div>
            </div>
            
            <div style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                <strong style="color: #856404;">Monthly Service Summary</strong><br>
                <span style="color: #856404; font-size: 14px;">
                    This invoice consolidates ${selectedInvoices.length} daily invoices with ${totalServices} individual services for ${monthName} ${year}
                </span>
            </div>
            
            <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">Invoice #</th>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">Service Description</th>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Qty</th>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 100px;">Price</th>
                        <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 120px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${selectedInvoices.map(invoice => `
                        ${invoice.items && invoice.items.length > 0 ? 
                            invoice.items.map(item => `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">${invoice.date}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">${invoice.invoiceNumber}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">
                                        ${item.description}
                                        ${item.warranty && item.warranty !== 'no-warranty' ? 
                                            `<span style="display: inline-block; padding: 2px 8px; background-color: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 500;">
                                                Warranty: ${formatWarrantyText(item.warranty)}
                                            </span>` : ''}
                                    </td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">${item.quantity}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.price.toFixed(2)}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.total.toFixed(2)}</td>
                                </tr>
                            `).join('')
                            : `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">${invoice.date}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">${invoice.invoiceNumber}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; color: #666;">No service details available</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">-</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">-</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${invoice.amount.toFixed(2)}</td>
                                </tr>
                            `
                        }
                    `).join('')}
                    <tr style="background-color: #f8f9fa;">
                        <td colspan="5" style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 1px solid #ddd;">Monthly Total (${selectedInvoices.length} invoices, ${totalServices} services):</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 1px solid #ddd;">₹${totalAmount.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="invoice-totals" style="margin-left: auto; width: 300px; border-top: 2px solid #3498db; padding-top: 15px;">
                <div class="invoice-totals-row invoice-grand-total" style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <span class="invoice-totals-label" style="font-size: 16px; font-weight: bold;">Amount Due:</span>
                    <span class="invoice-totals-value" style="font-size: 16px; font-weight: bold; color: #3498db;">₹${totalAmount.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="warranty-disclaimer" style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px;">Service Terms</h3>
                <p style="margin-bottom: 8px; font-size: 14px;">This consolidated invoice includes all daily services provided during ${monthName} ${year}. Payment is due within 15 days of invoice date.</p>
                <p style="margin: 0; font-size: 14px;">For detailed service descriptions, please refer to individual daily invoices.</p>
            </div>
            
            <div class="invoice-notes" style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                <div class="invoice-notes-title" style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Notes:</div>
                <div class="invoice-notes-content" style="color: #666; font-size: 14px; line-height: 1.5;">
                    Thank you for your continued business! This consolidated invoice provides a detailed breakdown of all services provided during ${monthName} ${year}.<br>
                    Individual daily invoices are available upon request.
                </div>
            </div>
            
            <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px; padding-top: 20px; border-top: 1px solid #eee;">
                Consolidated Invoice Generated on ${new Date().toLocaleDateString('en-IN')}<br>
                <strong>MNR SoftTech Solutions</strong>
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
    
    // Ensure element is properly styled for PDF
    const originalDisplay = element.style.display;
    const originalWidth = element.style.width;
    element.style.display = 'block';
    element.style.width = '210mm';
    
    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        // Restore original styles
        element.style.display = originalDisplay;
        element.style.width = originalWidth;
    });
}

async function printConsolidatedInvoice() {
    const selectedInvoices = await getSelectedInvoices();
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (selectedInvoices.length === 0) {
        showAlert('No invoices selected for printing', 'warning');
        return;
    }
    
    const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const monthName = new Date(2000, month - 1).toLocaleString('en-IN', { month: 'long' });
    const consolidatedNumber = `CON-${year}${month.toString().padStart(2, '0')}-${customer.substring(0, 3).toUpperCase()}`;
    
    // Get customer contact and address from first invoice
    const firstInvoice = selectedInvoices[0];
    const customerContact = firstInvoice.customerContact || '';
    const customerAddress = firstInvoice.customerAddress || '';
    
    // Count total services
    const totalServices = selectedInvoices.reduce((sum, invoice) => sum + (invoice.items ? invoice.items.length : 0), 0);
    
    const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>MNR SoftTech Solutions - Consolidated Invoice ${consolidatedNumber}</title>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: white;
            color: #333;
            line-height: 1.4;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            background: white;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3498db;
        }
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-number {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 16px;
        }
        .invoice-date {
            color: #666;
            font-size: 14px;
        }
        .company-info {
            margin-bottom: 25px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .company-details {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        .customer-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #3498db;
        }
        .customer-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #2c3e50;
            font-size: 16px;
        }
        .customer-details {
            color: #333;
            line-height: 1.5;
            font-size: 14px;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .invoice-table th {
            background: #2c3e50;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .invoice-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .invoice-totals {
            margin-left: auto;
            width: 300px;
            border-top: 2px solid #3498db;
            padding-top: 15px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .grand-total {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            font-size: 16px;
            font-weight: bold;
        }
        .warranty-section {
            margin: 25px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
        }
        .notes-section {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 14px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .payment-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #ffc107;
            color: #212529;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
            font-weight: 500;
        }
        .warranty-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 8px;
            font-weight: 500;
        }
        .total-amount {
            color: #3498db !important;
            font-weight: bold;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                width: 100%;
                margin: 0;
                padding: 15mm;
                border: none;
                box-shadow: none;
            }
            @page {
                size: A4;
                margin: 15mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="invoice-title">
                CONSOLIDATED INVOICE 
                <span class="payment-badge">Monthly</span>
            </div>
            <div class="invoice-meta">
                <div class="invoice-number">Invoice #${consolidatedNumber}</div>
                <div class="invoice-date">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
        </div>
        
        <div class="company-info">
            <div class="company-name">MNR SoftTech Solutions</div>
            <div class="company-details">
                Computer Software & Hardware Services<br>
                Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                Phone: +91 7416006394 (Whatsapp only)
            </div>
        </div>
        
        <div class="customer-info">
            <div class="customer-title">BILL TO:</div>
            <div class="customer-details">
                ${customer}<br>
                ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                ${customerAddress || 'Address not provided'}<br>
                <strong>Billing Period:</strong> ${monthName} ${year}
            </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <strong>Monthly Service Summary</strong><br>
            This invoice consolidates ${selectedInvoices.length} daily invoices with ${totalServices} individual services for ${monthName} ${year}
        </div>
        
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Service Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${selectedInvoices.map(invoice => `
                    ${invoice.items && invoice.items.length > 0 ? 
                        invoice.items.map(item => `
                            <tr>
                                <td>${invoice.date}</td>
                                <td>${invoice.invoiceNumber}</td>
                                <td>
                                    ${item.description}
                                    ${item.warranty && item.warranty !== 'no-warranty' ? 
                                        `<span class="warranty-badge">Warranty: ${formatWarrantyText(item.warranty)}</span>` : ''}
                                </td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">₹${item.price.toFixed(2)}</td>
                                <td class="text-right">₹${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')
                        : `
                            <tr>
                                <td>${invoice.date}</td>
                                <td>${invoice.invoiceNumber}</td>
                                <td style="color: #666;">No service details available</td>
                                <td class="text-center">-</td>
                                <td class="text-right">-</td>
                                <td class="text-right">₹${invoice.amount.toFixed(2)}</td>
                            </tr>
                        `
                    }
                `).join('')}
                <tr style="background-color: #f8f9fa;">
                    <td colspan="5" style="text-align: right; font-weight: bold; padding: 12px;">Monthly Total (${selectedInvoices.length} invoices, ${totalServices} services):</td>
                    <td class="text-right" style="font-weight: bold; padding: 12px;">₹${totalAmount.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="invoice-totals">
            <div class="totals-row grand-total">
                <span>Amount Due:</span>
                <span class="total-amount">₹${totalAmount.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="warranty-section">
            <h3 style="margin-top: 0; color: #2c3e50;">Service Terms</h3>
            <p>This consolidated invoice includes all daily services provided during ${monthName} ${year}. Payment is due within 15 days of invoice date.</p>
            <p>For detailed service descriptions, please refer to individual daily invoices.</p>
        </div>
        
        <div class="notes-section">
            <div style="font-weight: bold; margin-bottom: 8px;">Notes:</div>
            <div style="color: #666;">
                Thank you for your continued business! This consolidated invoice provides a detailed breakdown of all services provided during ${monthName} ${year}.<br>
                Individual daily invoices are available upon request.
            </div>
        </div>
        
        <div class="footer">
            Consolidated Invoice Generated on ${new Date().toLocaleDateString('en-IN')}<br>
            <strong>MNR SoftTech Solutions</strong>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 1000);
            }, 500);
        };
    </script>
</body>
</html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
}

async function saveConsolidatedInvoice() {
    const selectedInvoices = await getSelectedInvoices(); // Add await here
    const customer = document.getElementById('consolidateCustomer').value;
    const month = document.getElementById('consolidateMonth').value;
    const year = document.getElementById('consolidateYear').value;
    
    if (selectedInvoices.length === 0) {
        showToast('No invoices selected', 'warning');
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
            customerContact: selectedInvoices[0]?.customerContact || '',
            customerAddress: selectedInvoices[0]?.customerAddress || '',
            notes: `Consolidated monthly invoice for ${monthName} ${year}. Includes ${selectedInvoices.length} daily service invoices.`,
            items: selectedInvoices.flatMap(inv => inv.items || []),
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
        
        showToast('Consolidated invoice saved successfully!', 'success');
        
        // Refresh dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving consolidated invoice:', error);
        showToast('Error saving consolidated invoice: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Add this function to ensure proper tab loading
function ensureConsolidationTabLoaded() {
    const tab = document.getElementById('consolidate-tab');
    const tabContent = document.getElementById('consolidate');
    
    if (tab && tabContent) {
        // Force reflow to ensure proper rendering
        tabContent.style.display = 'block';
        setTimeout(() => {
            tabContent.style.display = '';
        }, 100);
    }
}

// Call this when the tab is shown
document.getElementById('consolidate-tab').addEventListener('shown.bs.tab', function() {
    ensureConsolidationTabLoaded();
    loadCustomersForConsolidation();
    populateMonthYearDropdowns();
});
