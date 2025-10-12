// Global variable to track current editing invoice
let currentEditingInvoiceId = null;

// Utility function to parse Firebase dates safely
function parseFirebaseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firebase Timestamp
        return dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        // ISO string
        return new Date(dateValue);
    } else if (dateValue instanceof Date) {
        // Already a Date object
        return dateValue;
    } else {
        // Fallback
        return new Date();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded successfully');
    
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Add item button
    document.getElementById('addItem').addEventListener('click', addNewItemRow);

    // Payment type change handler
    document.getElementById('paymentType').addEventListener('change', function() {
        const monthlyFields = document.getElementById('monthlyBillingFields');
        if (this.value === 'monthly') {
            monthlyFields.style.display = 'block';
            // Set next billing date to next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            document.getElementById('nextBillingDate').value = nextMonth.toISOString().split('T')[0];
        } else {
            monthlyFields.style.display = 'none';
        }
        generateInvoicePreview();
    });

    // Payment status change handler
    document.getElementById('paymentStatus').addEventListener('change', function() {
        const partialFields = document.getElementById('partialPaymentFields');
        if (this.value === 'partial') {
            partialFields.style.display = 'block';
        } else {
            partialFields.style.display = 'none';
        }
        generateInvoicePreview();
    });

    // Initialize dashboard
    initializeDashboard();

    // Clear form when switching to generate tab
    document.getElementById('generate-tab').addEventListener('shown.bs.tab', function() {
        clearForm();
    });
});

// Clear form function
function clearForm() {
    currentEditingInvoiceId = null;
    document.getElementById('invoiceForm').reset();
    
    // Clear items container except first row
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    addNewItemRow();
    
    // Set today's date
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
    
    // Reset display fields
    document.getElementById('monthlyBillingFields').style.display = 'none';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    generateInvoicePreview();
}

// Remove item button event delegation
document.getElementById('itemsContainer').addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
        const itemRow = e.target.closest('.item-row');
        if (document.querySelectorAll('.item-row').length > 1) {
            itemRow.remove();
        } else {
            // If it's the last row, just clear the values
            itemRow.querySelectorAll('input').forEach(input => {
                if (input.type !== 'number' || input.classList.contains('item-qty')) {
                    input.value = '';
                }
            });
            itemRow.querySelector('.item-qty').value = '1';
            itemRow.querySelector('.item-warranty').value = 'no-warranty';
            itemRow.querySelector('.custom-warranty-input').style.display = 'none';
            itemRow.querySelector('.custom-warranty-input').value = '';
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
            customWarrantyInput.value = '';
        }
        generateInvoicePreview();
    }
});

// Save invoice button
document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoiceToFirebase);

// Preview button
document.getElementById('previewBtn').addEventListener('click', generateInvoicePreview);

// Download PDF button
document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);

// Download JPEG button
document.getElementById('downloadJpgBtn').addEventListener('click', downloadAsJPEG);

// Print button
document.getElementById('printBtn').addEventListener('click', function() {
    printInvoice(true); // true for A4 format
});

// Auto-generate preview when inputs change
document.getElementById('invoiceForm').addEventListener('input', function() {
    // Throttle the preview generation to avoid performance issues
    if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
    }
    this.previewTimeout = setTimeout(generateInvoicePreview, 500);
});

// Add initial item row
addNewItemRow();

function addNewItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
        <input type="text" class="form-control item-desc" placeholder="Description" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="form-control item-price" placeholder="Price" min="0" step="0.01" required>
        <select class="form-select item-warranty">
            <option value="no-warranty">No Warranty</option>
            <option value="7-days">7 Days</option>
            <option value="15-days">15 Days</option>
            <option value="1-month">1 Month</option>
            <option value="3-months">3 Months</option>
            <option value="6-months">6 Months</option>
            <option value="1-year">1 Year</option>
            <option value="custom">Custom</option>
        </select>
        <input type="text" class="form-control custom-warranty-input" placeholder="Enter warranty details" style="display: none;">
        <button type="button" class="btn btn-danger remove-item"><i class="fas fa-times"></i></button>
    `;
    itemsContainer.appendChild(newItemRow);
    
    // Focus on the new description field
    newItemRow.querySelector('.item-desc').focus();
    
    return newItemRow;
}

function collectInvoiceData() {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const notes = document.getElementById('notes').value;
    const paymentType = document.getElementById('paymentType').value;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const billingCycle = document.getElementById('billingCycle').value;
    const nextBillingDate = document.getElementById('nextBillingDate').value;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    
    // Get all items
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    let subtotal = 0;
    
    itemRows.forEach(row => {
        const description = row.querySelector('.item-desc').value;
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const warranty = row.querySelector('.item-warranty').value;
        const customWarranty = row.querySelector('.custom-warranty-input').value;
        
        if (description && price > 0) {
            const total = quantity * price;
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
    
    const grandTotal = subtotal;
    const balanceDue = grandTotal - amountPaid;
    
    return {
        invoiceNumber,
        invoiceDate,
        customerName,
        customerContact,
        customerAddress,
        notes,
        items,
        subtotal,
        grandTotal,
        paymentType,
        paymentStatus,
        billingCycle: paymentType === 'monthly' ? parseInt(billingCycle) : null,
        nextBillingDate: paymentType === 'monthly' ? nextBillingDate : null,
        amountPaid,
        balanceDue,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

async function saveInvoiceToFirebase() {
    try {
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber) {
            alert('Please enter an invoice number');
            return;
        }
        
        if (!invoiceData.customerName) {
            alert('Please enter customer name');
            return;
        }
        
        if (invoiceData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }
        
        // Check if invoice number already exists (for new invoices)
        if (!currentEditingInvoiceId) {
            const querySnapshot = await db.collection('invoices')
                .where('invoiceNumber', '==', invoiceData.invoiceNumber)
                .get();
            
            if (!querySnapshot.empty) {
                alert('Invoice number already exists. Please use a different invoice number.');
                return;
            }
        }

        // Ensure dates are stored properly
        const invoiceToSave = {
            ...invoiceData,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0]
        };

        console.log('Saving invoice:', invoiceToSave);
        
        // Save to Firestore - use auto-generated IDs for better management
        let docRef;
        if (currentEditingInvoiceId) {
            // Update existing invoice
            docRef = db.collection('invoices').doc(currentEditingInvoiceId);
            invoiceToSave.updatedAt = new Date().toISOString();
        } else {
            // Create new invoice with auto-generated ID
            docRef = db.collection('invoices').doc();
            invoiceToSave.createdAt = new Date().toISOString();
            invoiceToSave.updatedAt = new Date().toISOString();
        }
        
        await docRef.set(invoiceToSave);
        
        alert(currentEditingInvoiceId ? 'Invoice updated successfully!' : 'Invoice saved successfully!');
        
        // Clear form and refresh
        clearForm();
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice: ' + error.message);
    }
}

async function loadInvoiceForEdit(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            showAlert('Invoice not found', 'warning');
            return;
        }
        
        const invoice = doc.data();
        currentEditingInvoiceId = invoiceId;
        
        // Populate form fields
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        
        // Handle date field
        const invoiceDateInput = document.getElementById('invoiceDate');
        if (invoice.invoiceDate) {
            let dateValue = invoice.invoiceDate;
            
            // Parse Firebase date properly
            const parsedDate = parseFirebaseDate(dateValue);
            invoiceDateInput.value = parsedDate.toISOString().split('T')[0];
        } else {
            invoiceDateInput.value = '';
        }
        
        document.getElementById('customerName').value = invoice.customerName || '';
        document.getElementById('customerContact').value = invoice.customerContact || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('notes').value = invoice.notes || '';
        document.getElementById('paymentType').value = invoice.paymentType || 'one-time';
        document.getElementById('paymentStatus').value = invoice.paymentStatus || 'unpaid';
        document.getElementById('billingCycle').value = invoice.billingCycle || '1';
        
        // Handle next billing date
        if (invoice.nextBillingDate) {
            const nextBillingDate = parseFirebaseDate(invoice.nextBillingDate);
            document.getElementById('nextBillingDate').value = nextBillingDate.toISOString().split('T')[0];
        } else {
            document.getElementById('nextBillingDate').value = '';
        }
        
        document.getElementById('amountPaid').value = invoice.amountPaid || '';
        
        // Show/hide fields based on payment type
        const monthlyFields = document.getElementById('monthlyBillingFields');
        const partialFields = document.getElementById('partialPaymentFields');
        monthlyFields.style.display = invoice.paymentType === 'monthly' ? 'block' : 'none';
        partialFields.style.display = invoice.paymentStatus === 'partial' ? 'block' : 'none';
        
        // Clear existing items
        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '';
        
        // Add items
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item, index) => {
                const newRow = addNewItemRow();
                populateItemRow(newRow, item);
            });
        } else {
            // Add one empty row if no items
            addNewItemRow();
        }
        
        // Generate preview
        generateInvoicePreview();
        
        // Switch to generate tab
        const generateTab = new bootstrap.Tab(document.getElementById('generate-tab'));
        generateTab.show();
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showAlert('Error loading invoice: ' + error.message, 'danger');
    }
}

function populateItemRow(row, item) {
    if (!row || !item) return;
    
    const descInput = row.querySelector('.item-desc');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const warrantySelect = row.querySelector('.item-warranty');
    const customWarrantyInput = row.querySelector('.custom-warranty-input');
    
    if (descInput) descInput.value = item.description || '';
    if (qtyInput) qtyInput.value = item.quantity || 1;
    if (priceInput) priceInput.value = item.price || 0;
    
    if (warrantySelect && customWarrantyInput) {
        if (item.warranty && !['no-warranty', '7-days', '15-days', '1-month', '3-months', '6-months', '1-year'].includes(item.warranty)) {
            warrantySelect.value = 'custom';
            customWarrantyInput.style.display = 'block';
            customWarrantyInput.value = item.warranty || '';
        } else {
            warrantySelect.value = item.warranty || 'no-warranty';
            customWarrantyInput.style.display = 'none';
            customWarrantyInput.value = '';
        }
    }
}

function generateInvoicePreview() {
    const invoiceData = collectInvoiceData();
    const { invoiceNumber, invoiceDate, customerName, customerContact, customerAddress, 
            notes, items, grandTotal, paymentType, paymentStatus, billingCycle, 
            nextBillingDate, amountPaid, balanceDue } = invoiceData;
    
    // Format date
    let formattedDate = 'Date not set';
    try {
        if (invoiceDate) {
            const date = new Date(invoiceDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
    } catch (error) {
        console.warn('Preview date formatting error:', error);
        formattedDate = 'Invalid Date';
    }
    
    // Payment status badge
    const paymentBadges = {
        'unpaid': '<span class="badge bg-danger">Unpaid</span>',
        'paid': '<span class="badge bg-success">Paid</span>',
        'partial': '<span class="badge bg-warning">Partial</span>'
    };
    
    const paymentBadge = paymentBadges[paymentStatus] || '';
    
    // Generate HTML for the invoice
    const invoiceHTML = `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="invoice-title">INVOICE ${paymentBadge}</div>
                <div class="invoice-meta">
                    <div class="invoice-number">Invoice #${invoiceNumber || '---'}</div>
                    <div class="invoice-date">Date: ${formattedDate}</div>
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
                    ${customerName || 'Customer Name'}<br>
                    ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                    ${customerAddress || 'Address not provided'}
                </div>
            </div>
            
            ${paymentType === 'monthly' ? `
                <div class="monthly-billing-info">
                    <strong>Monthly Billing Plan</strong><br>
                    Billing Cycle: ${billingCycle} Month(s)<br>
                    ${nextBillingDate ? `Next Billing: ${new Date(nextBillingDate).toLocaleDateString('en-IN')}` : ''}
                </div>
            ` : ''}
            
            ${items.length > 0 ? `
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
                        ${items.map(item => `
                            <tr>
                                <td>
                                    ${item.description}
                                    ${item.warranty && item.warranty !== 'no-warranty' ? 
                                        `<span class="warranty-badge">
                                            Warranty: ${formatWarrantyText(item.warranty)}
                                        </span>` : ''}
                                </td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price.toFixed(2)}</td>
                                <td class="text-right">₹${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <div class="invoice-totals-row">
                        <span class="invoice-totals-label">Subtotal:</span>
                        <span class="invoice-totals-value">₹${grandTotal.toFixed(2)}</span>
                    </div>
                    ${amountPaid > 0 ? `
                        <div class="invoice-totals-row">
                            <span class="invoice-totals-label">Amount Paid:</span>
                            <span class="invoice-totals-value" style="color: #2e7d32;">₹${amountPaid.toFixed(2)}</span>
                        </div>
                        <div class="invoice-totals-row">
                            <span class="invoice-totals-label">Balance Due:</span>
                            <span class="invoice-totals-value" style="color: #c62828;">₹${balanceDue.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="invoice-totals-row invoice-grand-total">
                        <span class="invoice-totals-label">${amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                        <span class="invoice-totals-value">₹${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            ` : '<p style="text-align: center; padding: 2rem; color: #666;">No items added</p>'}
            
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
            
            ${notes ? `
                <div class="invoice-notes">
                    <div class="invoice-notes-title">Notes:</div>
                    <div class="invoice-notes-content">${notes}</div>
                </div>
            ` : ''}
            
            <div style="margin-top: 3rem; text-align: center; color: #666; font-size: 0.9rem;">
                Thank you for your business!<br>
                MNR SoftTech Solutions
            </div>
        </div>
    `;
    
    // Update the preview
    const previewContainer = document.getElementById('invoicePreview');
    if (previewContainer) {
        previewContainer.innerHTML = invoiceHTML;
    }
}

// Dashboard Functions
function initializeDashboard() {
    updateDashboard();
}

function formatWarrantyText(warranty) {
    if (!warranty) return '';
    return warranty.replace(/-/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase());
}

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
    
    // Generate PDF
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

function printInvoice(a4Format = true) {
    generateInvoicePreview();
    
    // Wait for the preview to generate
    setTimeout(() => {
        const printContent = document.getElementById('invoicePreview').innerHTML;
        const printWindow = window.open('', '_blank');
        
        const printStyles = a4Format ? `
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
                }
                body {
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    font-family: Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.4;
                }
                .invoice-template {
                    width: 100%;
                    min-height: 277mm;
                    padding: 0;
                    border: none;
                    box-shadow: none;
                }
                .invoice-header {
                    margin-bottom: 20mm;
                }
                .invoice-table {
                    font-size: 10pt;
                }
                .invoice-table th,
                .invoice-table td {
                    padding: 6px 4px;
                }
                .warranty-badge {
                    font-size: 8pt;
                    padding: 1px 4px;
                }
            </style>
        ` : '';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MNR SoftTech Solutions - Invoice</title>
                ${printStyles}
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        background: white;
                    }
                    .button-group, footer, header, .nav-tabs, .container > :not(.invoice-template) {
                        display: none !important;
                    }
                    .invoice-template {
                        visibility: visible !important;
                        position: relative !important;
                        left: 0 !important;
                        top: 0 !important;
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }, 100);
}

// Helper functions for other files
function formatInvoiceDateForDisplay(invoice) {
    if (invoice.invoiceDate) {
        const date = parseFirebaseDate(invoice.invoiceDate);
        return date.toLocaleDateString('en-IN');
    } else if (invoice.createdAt) {
        const date = parseFirebaseDate(invoice.createdAt);
        return date.toLocaleDateString('en-IN');
    }
    return 'N/A';
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add alert to the top of the main content
    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Add the missing function
function editCurrentInvoice() {
    if (deleteInvoiceId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('viewInvoiceModal'));
        modal.hide();
        loadInvoiceForEdit(deleteInvoiceId);
    }
}
