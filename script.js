// Main application functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentUser = null;
    
    // DOM elements
    const addItemBtn = document.getElementById('addItem');
    const itemsContainer = document.getElementById('itemsContainer');
    const previewBtn = document.getElementById('previewBtn');
    const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadJpgBtn = document.getElementById('downloadJpgBtn');
    const printBtn = document.getElementById('printBtn');
    const invoicePreview = document.getElementById('invoicePreview');
    const invoicesLink = document.getElementById('invoicesLink');
    const businessSettingsLink = document.getElementById('businessSettingsLink');
    const backToDashboard = document.getElementById('backToDashboard');
    const backToDashboardFromSettings = document.getElementById('backToDashboardFromSettings');
    const dashboardView = document.getElementById('dashboardView');
    const invoicesView = document.getElementById('invoicesView');
    const businessSettingsView = document.getElementById('businessSettingsView');
    const businessSettingsForm = document.getElementById('businessSettingsForm');
    const invoicesTableBody = document.getElementById('invoicesTableBody');
    const noInvoicesMessage = document.getElementById('noInvoicesMessage');
    
    // Set current date as default
    document.getElementById('invoiceDate').valueAsDate = new Date();
    
    // Generate a default invoice number
    generateInvoiceNumber();
    
    // Event listeners
    addItemBtn.addEventListener('click', addItemRow);
    previewBtn.addEventListener('click', generatePreview);
    saveInvoiceBtn.addEventListener('click', saveInvoice);
    downloadPdfBtn.addEventListener('click', downloadPdf);
    downloadJpgBtn.addEventListener('click', downloadJpg);
    printBtn.addEventListener('click', printInvoice);
    
    invoicesLink.addEventListener('click', showInvoicesView);
    businessSettingsLink.addEventListener('click', showBusinessSettingsView);
    backToDashboard.addEventListener('click', showDashboardView);
    backToDashboardFromSettings.addEventListener('click', showDashboardView);
    
    businessSettingsForm.addEventListener('submit', saveBusinessSettings);
    
    // Initialize warranty select change handlers
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('item-warranty')) {
            handleWarrantyChange(e.target);
        }
        
        if (e.target.classList.contains('item-qty') || 
            e.target.classList.contains('item-price') || 
            e.target.classList.contains('item-desc')) {
            generatePreview();
        }
    });
    
    // Get current user
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
        }
    });
    
    // Functions
    function addItemRow() {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row mb-3 p-3 border rounded';
        itemRow.innerHTML = `
            <div class="row g-2">
                <div class="col-md-5">
                    <input type="text" class="form-control item-desc" placeholder="Description" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control item-price" placeholder="Price" min="0" step="0.01" required>
                </div>
                <div class="col-md-2">
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
                </div>
                <div class="col-md-1">
                    <button type="button" class="btn btn-danger remove-item w-100">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="row mt-2 custom-warranty-row d-none">
                <div class="col-md-11 offset-md-1">
                    <input type="text" class="form-control custom-warranty-input" placeholder="Enter warranty details">
                </div>
            </div>
        `;
        
        itemsContainer.appendChild(itemRow);
        
        // Add event listener to remove button
        const removeBtn = itemRow.querySelector('.remove-item');
        removeBtn.addEventListener('click', function() {
            itemRow.remove();
            generatePreview();
        });
        
        // Enable all remove buttons if there's more than one item
        const removeButtons = document.querySelectorAll('.remove-item');
        if (removeButtons.length > 1) {
            removeButtons.forEach(btn => btn.disabled = false);
        }
        
        // Add change event for warranty select
        const warrantySelect = itemRow.querySelector('.item-warranty');
        warrantySelect.addEventListener('change', function() {
            handleWarrantyChange(this);
        });
        
        generatePreview();
    }
    
    function handleWarrantyChange(selectElement) {
        const itemRow = selectElement.closest('.item-row');
        const customWarrantyRow = itemRow.querySelector('.custom-warranty-row');
        
        if (selectElement.value === 'custom') {
            customWarrantyRow.classList.remove('d-none');
        } else {
            customWarrantyRow.classList.add('d-none');
        }
        
        generatePreview();
    }
    
    function generateInvoiceNumber() {
        const prefix = document.getElementById('settingsInvoicePrefix').value || 'INV';
        const timestamp = new Date().getTime().toString().slice(-6);
        const invoiceNumber = `${prefix}-${timestamp}`;
        document.getElementById('invoiceNumber').value = invoiceNumber;
    }
    
    function getInvoiceData() {
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const invoiceDate = document.getElementById('invoiceDate').value;
        const customerName = document.getElementById('customerName').value;
        const customerContact = document.getElementById('customerContact').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const notes = document.getElementById('notes').value;
        
        const items = [];
        const itemRows = document.querySelectorAll('.item-row');
        
        itemRows.forEach(row => {
            const description = row.querySelector('.item-desc').value;
            const quantity = parseInt(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const warranty = row.querySelector('.item-warranty').value;
            const customWarranty = row.querySelector('.custom-warranty-input')?.value || '';
            
            if (description && quantity > 0 && price > 0) {
                items.push({
                    description,
                    quantity,
                    price,
                    warranty: warranty === 'custom' ? customWarranty : warranty,
                    total: quantity * price
                });
            }
        });
        
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxRate = 0; // You can add tax calculation if needed
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        
        return {
            invoiceNumber,
            invoiceDate,
            customerName,
            customerContact,
            customerEmail,
            customerAddress,
            items,
            subtotal,
            taxRate,
            taxAmount,
            total,
            notes
        };
    }
    
    function generatePreview() {
        const invoiceData = getInvoiceData();
        const businessName = document.getElementById('settingsBusinessName').value || 'Your Business Name';
        const businessContact = document.getElementById('settingsBusinessContact').value || 'Your Contact Info';
        const businessAddress = document.getElementById('settingsBusinessAddress').value || 'Your Business Address';
        const businessTax = document.getElementById('settingsBusinessTax').value || '';
        
        let itemsHtml = '';
        invoiceData.items.forEach(item => {
            let warrantyBadge = '';
            if (item.warranty && item.warranty !== 'no-warranty') {
                warrantyBadge = `<span class="warranty-badge">${item.warranty.replace('-', ' ')}</span>`;
            }
            
            itemsHtml += `
                <tr>
                    <td>${item.description} ${warrantyBadge}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price.toFixed(2)}</td>
                    <td>₹${item.total.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Check if there are items with warranty
        const hasWarranty = invoiceData.items.some(item => 
            item.warranty && item.warranty !== 'no-warranty'
        );
        
        let warrantyDisclaimer = '';
        if (hasWarranty) {
            warrantyDisclaimer = `
                <div class="warranty-disclaimer">
                    <h3>Warranty Information</h3>
                    <p>This invoice includes items with warranty coverage. Please retain this document as proof of purchase for warranty claims.</p>
                    <ul>
                        <li>Warranty period begins from the date of purchase</li>
                        <li>Original invoice must be presented for warranty service</li>
                        <li>Warranty covers manufacturing defects only</li>
                        <li>Warranty does not cover damage from misuse or accidents</li>
                    </ul>
                </div>
            `;
        }
        
        const invoiceHtml = `
            <div class="invoice-template">
                <div class="invoice-header">
                    <div>
                        <div class="invoice-title">INVOICE</div>
                    </div>
                    <div class="invoice-meta">
                        <div class="invoice-number">Invoice #: ${invoiceData.invoiceNumber}</div>
                        <div class="invoice-date">Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="invoice-company">
                            <div class="company-name">${businessName}</div>
                            <div class="company-details">
                                ${businessContact}<br>
                                ${businessAddress.replace(/\n/g, '<br>')}
                                ${businessTax ? `<br>GST: ${businessTax}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="invoice-customer">
                            <div class="customer-title">Bill To:</div>
                            <div>
                                <strong>${invoiceData.customerName}</strong><br>
                                ${invoiceData.customerContact ? `${invoiceData.customerContact}<br>` : ''}
                                ${invoiceData.customerEmail ? `${invoiceData.customerEmail}<br>` : ''}
                                ${invoiceData.customerAddress ? invoiceData.customerAddress.replace(/\n/g, '<br>') : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="d-flex justify-content-end">
                    <div class="invoice-totals">
                        <div class="invoice-totals-row">
                            <div class="invoice-totals-label">Subtotal:</div>
                            <div class="invoice-totals-value">₹${invoiceData.subtotal.toFixed(2)}</div>
                        </div>
                        ${invoiceData.taxRate > 0 ? `
                        <div class="invoice-totals-row">
                            <div class="invoice-totals-label">Tax (${invoiceData.taxRate}%):</div>
                            <div class="invoice-totals-value">₹${invoiceData.taxAmount.toFixed(2)}</div>
                        </div>
                        ` : ''}
                        <div class="invoice-totals-row invoice-grand-total">
                            <div class="invoice-totals-label">Total:</div>
                            <div class="invoice-totals-value">₹${invoiceData.total.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                
                ${warrantyDisclaimer}
                
                ${invoiceData.notes ? `
                <div class="invoice-notes">
                    <div class="invoice-notes-title">Notes:</div>
                    <div>${invoiceData.notes}</div>
                </div>
                ` : ''}
            </div>
        `;
        
        invoicePreview.innerHTML = invoiceHtml;
    }
    
    function saveInvoice() {
        if (!currentUser) {
            showAlert('Please log in to save invoices', 'danger');
            return;
        }
        
        const invoiceData = getInvoiceData();
        
        // Validate required fields
        if (!invoiceData.invoiceNumber || !invoiceData.customerName || invoiceData.items.length === 0) {
            showAlert('Please fill in all required fields and add at least one item', 'danger');
            return;
        }
        
        showLoading(true);
        
        // Add user ID and timestamp
        invoiceData.userId = currentUser.uid;
        invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Save to Firestore
        db.collection('invoices').add(invoiceData)
            .then((docRef) => {
                showLoading(false);
                showAlert('Invoice saved successfully!', 'success');
                loadTodayInvoices(currentUser.uid);
                generateInvoiceNumber(); // Generate new invoice number for next invoice
            })
            .catch((error) => {
                showLoading(false);
                console.error('Error saving invoice:', error);
                showAlert('Error saving invoice. Please try again.', 'danger');
            });
    }
    
    function downloadPdf() {
        const invoiceElement = invoicePreview.querySelector('.invoice-template');
        
        if (!invoiceElement) {
            showAlert('Please generate an invoice preview first', 'warning');
            return;
        }
        
        showLoading(true);
        
        const options = {
            margin: 10,
            filename: `invoice-${document.getElementById('invoiceNumber').value}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().from(invoiceElement).set(options).save()
            .then(() => {
                showLoading(false);
                showAlert('PDF downloaded successfully!', 'success');
            })
            .catch((error) => {
                showLoading(false);
                console.error('Error generating PDF:', error);
                showAlert('Error generating PDF. Please try again.', 'danger');
            });
    }
    
    function downloadJpg() {
        const invoiceElement = invoicePreview.querySelector('.invoice-template');
        
        if (!invoiceElement) {
            showAlert('Please generate an invoice preview first', 'warning');
            return;
        }
        
        showLoading(true);
        
        html2canvas(invoiceElement, { scale: 2 })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = `invoice-${document.getElementById('invoiceNumber').value}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.click();
                showLoading(false);
                showAlert('JPEG downloaded successfully!', 'success');
            })
            .catch(error => {
                showLoading(false);
                console.error('Error generating JPEG:', error);
                showAlert('Error generating JPEG. Please try again.', 'danger');
            });
    }
    
    function printInvoice() {
        const invoiceElement = invoicePreview.querySelector('.invoice-template');
        
        if (!invoiceElement) {
            showAlert('Please generate an invoice preview first', 'warning');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Invoice</title>
                    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Poppins', sans-serif; margin: 0; padding: 20px; }
                        .invoice-template { max-width: 100%; }
                    </style>
                </head>
                <body>
                    ${invoiceElement.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
    
    function showInvoicesView() {
        dashboardView.classList.add('d-none');
        businessSettingsView.classList.add('d-none');
        invoicesView.classList.remove('d-none');
        
        loadInvoices();
    }
    
    function showBusinessSettingsView() {
        dashboardView.classList.add('d-none');
        invoicesView.classList.add('d-none');
        businessSettingsView.classList.remove('d-none');
    }
    
    function showDashboardView() {
        invoicesView.classList.add('d-none');
        businessSettingsView.classList.add('d-none');
        dashboardView.classList.remove('d-none');
    }
    
    function loadInvoices() {
        if (!currentUser) return;
        
        showLoading(true);
        
        db.collection('invoices')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then((querySnapshot) => {
                showLoading(false);
                
                if (querySnapshot.empty) {
                    invoicesTableBody.innerHTML = '';
                    noInvoicesMessage.classList.remove('d-none');
                    return;
                }
                
                noInvoicesMessage.classList.add('d-none');
                let invoicesHtml = '';
                
                querySnapshot.forEach((doc) => {
                    const invoice = doc.data();
                    const date = invoice.createdAt ? 
                        invoice.createdAt.toDate().toLocaleDateString() : 
                        new Date(invoice.invoiceDate).toLocaleDateString();
                    
                    invoicesHtml += `
                        <tr>
                            <td>${invoice.invoiceNumber}</td>
                            <td>${date}</td>
                            <td>${invoice.customerName}</td>
                            <td>₹${invoice.total.toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-invoice" data-id="${doc.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-success download-invoice-pdf" data-id="${doc.id}">
                                    <i class="fas fa-file-pdf"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                invoicesTableBody.innerHTML = invoicesHtml;
                
                // Add event listeners to view buttons
                document.querySelectorAll('.view-invoice').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const invoiceId = this.getAttribute('data-id');
                        viewInvoice(invoiceId);
                    });
                });
                
                // Add event listeners to download buttons
                document.querySelectorAll('.download-invoice-pdf').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const invoiceId = this.getAttribute('data-id');
                        downloadInvoicePdf(invoiceId);
                    });
                });
            })
            .catch((error) => {
                showLoading(false);
                console.error('Error loading invoices:', error);
                showAlert('Error loading invoices. Please try again.', 'danger');
            });
    }
    
    function viewInvoice(invoiceId) {
        // This would open a modal or new view with the invoice details
        // For simplicity, we'll just show an alert
        showAlert(`Viewing invoice ${invoiceId}`, 'info');
    }
    
    function downloadInvoicePdf(invoiceId) {
        // This would generate and download a PDF of the saved invoice
        // For simplicity, we'll just show an alert
        showAlert(`Downloading invoice ${invoiceId} as PDF`, 'info');
    }
    
    function saveBusinessSettings(e) {
        e.preventDefault();
        
        if (!currentUser) return;
        
        const businessName = document.getElementById('settingsBusinessName').value;
        const businessContact = document.getElementById('settingsBusinessContact').value;
        const businessAddress = document.getElementById('settingsBusinessAddress').value;
        const businessTax = document.getElementById('settingsBusinessTax').value;
        const invoicePrefix = document.getElementById('settingsInvoicePrefix').value;
        
        showLoading(true);
        
        db.collection('users').doc(currentUser.uid).update({
            businessName,
            businessContact,
            businessAddress,
            taxNumber: businessTax,
            invoicePrefix
        })
        .then(() => {
            showLoading(false);
            showAlert('Business settings saved successfully!', 'success');
            generatePreview(); // Update preview with new business info
        })
        .catch((error) => {
            showLoading(false);
            console.error('Error saving business settings:', error);
            showAlert('Error saving settings. Please try again.', 'danger');
        });
    }
    
    // Helper functions
    function showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }
    
    function showAlert(message, type) {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add alert to page
        document.body.insertBefore(alert, document.body.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
    
    function loadTodayInvoices(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        db.collection('invoices')
            .where('userId', '==', userId)
            .where('createdAt', '>=', today)
            .get()
            .then((querySnapshot) => {
                let count = 0;
                let revenue = 0;
                
                querySnapshot.forEach((doc) => {
                    count++;
                    const invoice = doc.data();
                    revenue += invoice.total || 0;
                });
                
                document.getElementById('todayInvoicesCount').textContent = count;
                document.getElementById('todayRevenue').textContent = `₹${revenue.toFixed(2)}`;
            })
            .catch((error) => {
                console.error('Error loading today invoices:', error);
            });
    }
});
