let currentEditingInvoiceId = null;

async function generateInvoiceNumber() {
    try {
        // Get all invoices to find the highest number
        const snapshot = await db.collection('invoices').get();
        let highestNumber = 0;
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            if (invoice.invoiceNumber) {
                // Extract numbers from invoice numbers like "INV-0001", "INV-0025", etc.
                const match = invoice.invoiceNumber.match(/INV-(\d+)/);
                if (match) {
                    const number = parseInt(match[1]);
                    if (!isNaN(number) && number > highestNumber) {
                        highestNumber = number;
                    }
                }
            }
        });
        
        // Generate next number
        const nextNumber = highestNumber + 1;
        return `INV-${String(nextNumber).padStart(4, '0')}`;
        
    } catch (error) {
        console.error('Error generating invoice number:', error);
        // Fallback: timestamp-based number
        return `INV-${Date.now()}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Generate automatic invoice number
    generateInvoiceNumber().then(invoiceNumber => {
        document.getElementById('invoiceNumber').value = invoiceNumber;
        // Generate preview with the auto-generated number
        generateInvoicePreview();
    });

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
});

function generateNewInvoiceNumber() {
    showLoading('Generating invoice number...');
    generateInvoiceNumber().then(invoiceNumber => {
        document.getElementById('invoiceNumber').value = invoiceNumber;
        generateInvoicePreview();
        showToast('New invoice number generated', 'success', 2000);
    }).catch(error => {
        console.error('Error generating invoice number:', error);
        showToast('Error generating invoice number: ' + error.message, 'error');
    }).finally(() => {
        hideLoading();
    });
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

// New Invoice button
document.getElementById('newInvoiceBtn').addEventListener('click', createNewInvoice);

// Save invoice button
document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoiceToFirebase);

// Preview button
document.getElementById('previewBtn').addEventListener('click', generateInvoicePreview);

// Download PDF button
document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);

// Download JPEG button
document.getElementById('downloadJpgBtn').addEventListener('click', downloadAsJPEG);

// Print button
document.getElementById('printBtn').addEventListener('click', printInvoice);

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
    
    // Get amount paid based on payment status
    let amountPaid = 0;
    if (paymentStatus === 'paid') {
        // If status is paid, we'll calculate this later based on grand total
        amountPaid = 0; // Will be updated in save function
    } else if (paymentStatus === 'partial') {
        // If status is partial, get the entered amount
        amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    }
    // If unpaid, amountPaid remains 0
    
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
        // Include the original invoice ID if we're editing
        originalInvoiceId: currentEditingInvoiceId
    };
}

// Add a function to check if we're creating a new invoice or editing
function isEditingInvoice() {
    return currentEditingInvoiceId !== null;
}

async function saveInvoiceToFirebase() {
    const saveBtn = document.getElementById('saveInvoiceBtn');
    
    try {
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber) {
            showToast('Please enter an invoice number', 'warning');
            return;
        }
        
        if (!invoiceData.customerName) {
            showToast('Please enter customer name', 'warning');
            return;
        }
        
        if (invoiceData.items.length === 0) {
            showToast('Please add at least one item', 'warning');
            return;
        }
        
        // Check if we're editing an existing invoice or creating new
        const isEditing = currentEditingInvoiceId !== null;

        // Show loading state
        setFormLoading(true);
        setButtonLoading(saveBtn, true);
        showLoading(isEditing ? 'Updating invoice...' : 'Saving invoice...');
        
        // Calculate payment amounts correctly
        let finalAmountPaid = 0;
        let finalBalanceDue = invoiceData.grandTotal;
        
        if (invoiceData.paymentStatus === 'paid') {
            finalAmountPaid = invoiceData.grandTotal;
            finalBalanceDue = 0;
        } else if (invoiceData.paymentStatus === 'partial') {
            finalAmountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
            finalBalanceDue = invoiceData.grandTotal - finalAmountPaid;
            
            if (finalAmountPaid <= 0) {
                showToast('Please enter a valid partial payment amount', 'warning');
                return;
            }
        } else {
            // unpaid
            finalAmountPaid = 0;
            finalBalanceDue = invoiceData.grandTotal;
        }
        
        // Prepare invoice data for saving
        const invoiceToSave = {
            ...invoiceData,
            amountPaid: finalAmountPaid,
            balanceDue: finalBalanceDue,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
            createdAt: invoiceData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log('Saving invoice:', {
            invoiceNumber: invoiceToSave.invoiceNumber,
            paymentStatus: invoiceToSave.paymentStatus,
            amountPaid: invoiceToSave.amountPaid,
            grandTotal: invoiceToSave.grandTotal,
            balanceDue: invoiceToSave.balanceDue,
            isEditing: isEditing
        });
        
        // Use the invoice number as the document ID for consistency
        const docId = invoiceToSave.invoiceNumber;
        
        // Save to Firestore
        await db.collection('invoices').doc(docId).set(invoiceToSave);
        
        // Show success message
        showToast(
            `Invoice ${isEditing ? 'updated' : 'saved'} successfully!`, 
            'success', 
            4000
        );
        
        // Refresh dashboard
        updateDashboard();
        
        // If editing, keep the form filled for further edits
        // If new invoice, reset the form
        if (!isEditing) {
            setTimeout(() => {
                resetForm();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        showToast('Error saving invoice: ' + error.message, 'error');
    } finally {
        // Always hide loading regardless of success or error
        hideLoading();
        setFormLoading(false);
        setButtonLoading(saveBtn, false);
    }
}

function createNewInvoice() {
    // Clear form
    document.getElementById('invoiceForm').reset();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Clear items container and add one empty row
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    addNewItemRow();
    
    // Hide monthly billing fields
    document.getElementById('monthlyBillingFields').style.display = 'none';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    // Generate new invoice number
    generateNewInvoiceNumber();
    
    // Clear preview
    document.getElementById('invoicePreview').innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-receipt"></i>
            <p>Your invoice will appear here</p>
        </div>
    `;
}

async function loadInvoice(invoiceId) {
    // Validate invoice ID
    if (!invoiceId || invoiceId.trim() === '') {
        console.error('loadInvoice called with empty invoice ID');
        showAlert('Error: Invalid invoice ID', 'danger');
        return;
    }
    
    try {
        // Show loading for editing
        showLoading('Loading invoice...');
        setFormLoading(true);
        
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            alert('Invoice not found');
            hideLoading();
            setFormLoading(false);
            return;
        }
        
        const invoice = doc.data();
        console.log('Loading invoice data:', invoice);
        
        // Store the original invoice ID for editing detection
        currentEditingInvoiceId = invoiceId;
        
        // Populate form fields
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        
        // Handle date field
        const invoiceDateInput = document.getElementById('invoiceDate');
        if (invoice.invoiceDate) {
            let dateValue = invoice.invoiceDate;
            
            // If it's a full ISO string, extract just the date part
            if (dateValue.includes('T')) {
                dateValue = dateValue.split('T')[0];
            }
            
            // If it's a Firebase Timestamp object
            if (dateValue.toDate) {
                const jsDate = dateValue.toDate();
                dateValue = jsDate.toISOString().split('T')[0];
            }
            
            invoiceDateInput.value = dateValue;
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
        document.getElementById('nextBillingDate').value = invoice.nextBillingDate || '';
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
        
        // Hide loading
        hideLoading();
        setFormLoading(false);
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        
        // Hide loading on error
        hideLoading();
        setFormLoading(false);
        
        alert('Error loading invoice: ' + error.message);
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
    
    // Generate HTML for the invoice with better PDF styling
    const invoiceHTML = `
        <div class="invoice-template" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background: white; box-sizing: border-box;">
            <div class="invoice-header" style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
                <div class="invoice-title" style="font-size: 28px; color: #2c3e50; font-weight: bold;">INVOICE ${paymentBadge}</div>
                <div class="invoice-meta" style="text-align: right;">
                    <div class="invoice-number" style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">Invoice #${invoiceNumber || '---'}</div>
                    <div class="invoice-date" style="color: #666; font-size: 14px;">Date: ${formattedDate}</div>
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
                    ${customerName || 'Customer Name'}<br>
                    ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                    ${customerAddress || 'Address not provided'}
                </div>
            </div>
            
            ${paymentType === 'monthly' ? `
                <div class="monthly-billing-info" style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                    <strong style="color: #856404;">Monthly Billing Plan</strong><br>
                    <span style="color: #856404; font-size: 14px;">
                        Billing Cycle: ${billingCycle} Month(s)<br>
                        ${nextBillingDate ? `Next Billing: ${new Date(nextBillingDate).toLocaleDateString('en-IN')}` : ''}
                    </span>
                </div>
            ` : ''}
            
            ${items.length > 0 ? `
                <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Qty</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 100px;">Price</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 120px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
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
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="invoice-totals" style="margin-left: auto; width: 300px; border-top: 2px solid #3498db; padding-top: 15px;">
                    <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="invoice-totals-label" style="font-weight: bold;">Subtotal:</span>
                        <span class="invoice-totals-value" style="font-weight: bold;">₹${grandTotal.toFixed(2)}</span>
                    </div>
                    ${amountPaid > 0 ? `
                        <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span class="invoice-totals-label" style="font-weight: bold;">Amount Paid:</span>
                            <span class="invoice-totals-value" style="font-weight: bold; color: #2e7d32;">₹${amountPaid.toFixed(2)}</span>
                        </div>
                        <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span class="invoice-totals-label" style="font-weight: bold;">Balance Due:</span>
                            <span class="invoice-totals-value" style="font-weight: bold; color: #c62828;">₹${balanceDue.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="invoice-totals-row invoice-grand-total" style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd;">
                        <span class="invoice-totals-label" style="font-size: 16px; font-weight: bold;">${amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                        <span class="invoice-totals-value" style="font-size: 16px; font-weight: bold; color: #3498db;">₹${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            ` : '<p style="text-align: center; padding: 40px; color: #666; font-size: 16px;">No items added</p>'}
            
            <div class="warranty-disclaimer" style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px;">Warranty Terms</h3>
                <p style="margin-bottom: 8px; font-size: 14px;">Warranty covers manufacturing defects only. Does not cover:</p>
                <ul style="margin: 8px 0 8px 20px; font-size: 14px;">
                    <li>Physical damage or liquid damage</li>
                    <li>Unauthorized repairs or modifications</li>
                    <li>Software issues not related to hardware</li>
                </ul>
                <p style="margin: 0; font-size: 14px;">Original invoice required for all warranty claims.</p>
            </div>
            
            ${notes ? `
                <div class="invoice-notes" style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div class="invoice-notes-title" style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Notes:</div>
                    <div class="invoice-notes-content" style="color: #666; font-size: 14px; line-height: 1.5;">${notes}</div>
                </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px; padding-top: 20px; border-top: 1px solid #eee;">
                Thank you for your business!<br>
                <strong>MNR SoftTech Solutions</strong>
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
    // First generate the preview to ensure data is up to date
    generateInvoicePreview();
    
    showLoading('Generating PDF...');
    
    // Wait a bit to ensure data is collected
    setTimeout(() => {
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
            formattedDate = 'Invalid Date';
        }
        
        // Payment status text and color
        const paymentStyles = {
            'unpaid': { text: 'Unpaid', color: '#dc3545' },
            'paid': { text: 'Paid', color: '#28a745' },
            'partial': { text: 'Partial Payment', color: '#ffc107' }
        };
        
        const paymentStyle = paymentStyles[paymentStatus] || { text: '', color: '#6c757d' };
        
        // Create clean HTML for PDF
        const pdfHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MNR SoftTech Solutions - Invoice ${invoiceNumber || ''}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            background: #ffffff;
            padding: 0;
            margin: 0;
        }
        .invoice-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3498db;
        }
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }
        .payment-badge {
            display: inline-block;
            padding: 6px 15px;
            background: ${paymentStyle.color};
            color: white;
            border-radius: 5px;
            font-size: 14px;
            margin-left: 12px;
            font-weight: bold;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-number {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 18px;
            color: #2c3e50;
        }
        .invoice-date {
            color: #666;
            font-size: 16px;
        }
        .company-section {
            margin-bottom: 25px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .company-details {
            color: #666;
            font-size: 15px;
            line-height: 1.5;
        }
        .customer-section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-left: 5px solid #3498db;
            border-radius: 5px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 12px;
            color: #2c3e50;
            font-size: 18px;
        }
        .customer-details {
            color: #333;
            line-height: 1.6;
            font-size: 15px;
        }
        .monthly-billing {
            margin-bottom: 20px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }
        .monthly-billing strong {
            color: #856404;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .items-table th {
            background: #2c3e50;
            color: white;
            padding: 15px 12px;
            text-align: left;
            border: 1px solid #1a252f;
            font-weight: bold;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: top;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .warranty-tag {
            display: inline-block;
            padding: 3px 10px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 15px;
            font-size: 11px;
            margin-left: 10px;
            font-weight: 500;
        }
        .totals-section {
            margin-left: auto;
            width: 300px;
            border-top: 2px solid #3498db;
            padding-top: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 15px;
        }
        .grand-total {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #dee2e6;
            font-size: 18px;
            font-weight: bold;
        }
        .grand-total .amount {
            color: #3498db;
            font-size: 20px;
        }
        .paid-amount {
            color: #28a745 !important;
        }
        .balance-due {
            color: #dc3545 !important;
        }
        .warranty-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-left: 5px solid #3498db;
            border-radius: 5px;
        }
        .warranty-section h3 {
            margin-bottom: 15px;
            color: #2c3e50;
            font-size: 18px;
        }
        .warranty-section ul {
            margin-left: 25px;
            margin-bottom: 15px;
        }
        .warranty-section li {
            margin-bottom: 8px;
        }
        .notes-section {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        .notes-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
            font-size: 16px;
        }
        .notes-content {
            color: #666;
            font-size: 15px;
            line-height: 1.5;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 15px;
            padding-top: 25px;
            border-top: 2px solid #dee2e6;
        }
        .no-items {
            text-align: center;
            padding: 50px;
            color: #666;
            font-size: 16px;
            font-style: italic;
        }
        
        /* Ensure proper printing */
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                width: 100%;
                margin: 0;
                padding: 15mm;
                box-shadow: none;
                border: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header Section -->
        <div class="invoice-header">
            <div class="invoice-title">
                INVOICE
                <span class="payment-badge">${paymentStyle.text}</span>
            </div>
            <div class="invoice-meta">
                <div class="invoice-number">Invoice #${invoiceNumber || '---'}</div>
                <div class="invoice-date">Date: ${formattedDate}</div>
            </div>
        </div>
        
        <!-- Company Information -->
        <div class="company-section">
            <div class="company-name">MNR SoftTech Solutions</div>
            <div class="company-details">
                Computer Software & Hardware Services<br>
                Email: mnrdeveloper11@gmail.com<br>
                Phone: +91 7416006394 (WhatsApp only)
            </div>
        </div>
        
        <!-- Customer Information -->
        <div class="customer-section">
            <div class="section-title">BILL TO:</div>
            <div class="customer-details">
                <strong>${customerName || 'Customer Name'}</strong><br>
                ${customerContact ? '<strong>Phone:</strong> ' + customerContact + '<br>' : ''}
                ${customerAddress ? '<strong>Address:</strong> ' + customerAddress : 'Address not provided'}
            </div>
        </div>
        
        <!-- Monthly Billing Info -->
        ${paymentType === 'monthly' ? `
            <div class="monthly-billing">
                <strong>Monthly Billing Plan</strong><br>
                <strong>Billing Cycle:</strong> ${billingCycle} Month(s)<br>
                ${nextBillingDate ? `<strong>Next Billing Date:</strong> ${new Date(nextBillingDate).toLocaleDateString('en-IN')}` : ''}
            </div>
        ` : ''}
        
        <!-- Items Table -->
        ${items.length > 0 ? `
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Description</th>
                        <th style="width: 15%;" class="text-center">Quantity</th>
                        <th style="width: 20%;" class="text-right">Unit Price (₹)</th>
                        <th style="width: 15%;" class="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                ${item.description}
                                ${item.warranty && item.warranty !== 'no-warranty' ? 
                                    `<span class="warranty-tag">Warranty: ${formatWarrantyText(item.warranty)}</span>` : ''}
                            </td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">${item.price.toFixed(2)}</td>
                            <td class="text-right"><strong>${item.total.toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-section">
                <div class="total-row">
                    <span><strong>Subtotal:</strong></span>
                    <span><strong>₹${grandTotal.toFixed(2)}</strong></span>
                </div>
                ${amountPaid > 0 ? `
                    <div class="total-row">
                        <span>Amount Paid:</span>
                        <span class="paid-amount"><strong>₹${amountPaid.toFixed(2)}</strong></span>
                    </div>
                    <div class="total-row">
                        <span>Balance Due:</span>
                        <span class="balance-due"><strong>₹${balanceDue.toFixed(2)}</strong></span>
                    </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>${amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                    <span class="amount">₹${grandTotal.toFixed(2)}</span>
                </div>
            </div>
        ` : `
            <div class="no-items">
                <p>No items added to this invoice</p>
            </div>
        `}
        
        <!-- Warranty Section -->
        <div class="warranty-section">
            <h3>Warranty Terms & Conditions</h3>
            <p>All products and services come with the following warranty terms:</p>
            <ul>
                <li><strong>Coverage:</strong> Manufacturing defects and hardware malfunctions</li>
                <li><strong>Duration:</strong> As specified against each item</li>
                <li><strong>Requirements:</strong> Original invoice must be presented for warranty claims</li>
            </ul>
            <p><strong>Not Covered:</strong> Physical damage, liquid damage, unauthorized repairs, software issues unrelated to hardware, and normal wear and tear.</p>
        </div>
        
        <!-- Notes Section -->
        ${notes ? `
            <div class="notes-section">
                <div class="notes-title">Additional Notes:</div>
                <div class="notes-content">${notes}</div>
            </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>MNR SoftTech Solutions - Your trusted technology partner</p>
            <p style="margin-top: 10px; font-size: 13px; color: #999;">
                For any queries, contact: mnrdeveloper11@gmail.com | +91 7416006394
            </p>
        </div>
    </div>
</body>
</html>
        `;
        
        // Create a temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm';
        tempContainer.innerHTML = pdfHTML;
        document.body.appendChild(tempContainer);
        
        const opt = {
            margin: 10,
            filename: `MNR_Invoice_${invoiceNumber || 'new'}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.98 
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 800,
                windowWidth: 800
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' 
            }
        };
        
        // Generate PDF from the clean HTML
        html2pdf().set(opt).from(tempContainer).save().then(() => {
            // Clean up
            document.body.removeChild(tempContainer);
            hideLoading();
        }).catch(error => {
            console.error('PDF generation error:', error);
            document.body.removeChild(tempContainer);
            hideLoading();
            alert('Error generating PDF: ' + error.message);
        });
        
    }, 500);
}

function downloadAsJPEG() {
    // First generate the preview to ensure it's up to date
    generateInvoicePreview();
    
    showLoading('Generating JPEG...');
    
    // Add a small delay to ensure DOM is updated
    setTimeout(() => {
        const element = document.getElementById('invoicePreview');
        
        // Ensure the element is visible for capture
        const originalDisplay = element.style.display;
        const originalWidth = element.style.width;
        element.style.display = 'block';
        element.style.width = '800px';
        
        html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            
            // Restore original styles
            element.style.display = originalDisplay;
            element.style.width = originalWidth;
            hideLoading();
        }).catch(error => {
            console.error('JPEG generation error:', error);
            hideLoading();
            alert('Error generating JPEG: ' + error.message);
        });
    }, 500);
}

function printInvoice() {
    // First generate the preview to ensure it's up to date
    generateInvoicePreview();
    
    showLoading('Preparing for printing...');
    
    // Wait for the preview to generate
    setTimeout(() => {
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
            formattedDate = 'Invalid Date';
        }
        
        // Payment status text and color
        const paymentStatusConfig = {
            'unpaid': { text: 'Unpaid', color: '#dc3545', bgColor: '#dc3545' },
            'paid': { text: 'Paid', color: '#28a745', bgColor: '#28a745' },
            'partial': { text: 'Partial Payment', color: '#ffc107', bgColor: '#ffc107' }
        };
        
        const statusConfig = paymentStatusConfig[paymentStatus] || paymentStatusConfig.unpaid;
        const paymentText = statusConfig.text;
        const statusColor = statusConfig.color;
        const statusBgColor = statusConfig.bgColor;
        
        // Generate clean HTML for printing
        const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>MNR SoftTech Solutions - Invoice ${invoiceNumber || ''}</title>
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
            background: ${statusBgColor};
            color: white;
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
        .paid-amount {
            color: #28a745 !important;
            font-weight: bold;
        }
        .balance-due {
            color: #dc3545 !important;
            font-weight: bold;
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
                INVOICE 
                <span class="payment-badge">${paymentText}</span>
            </div>
            <div class="invoice-meta">
                <div class="invoice-number">Invoice #${invoiceNumber || '---'}</div>
                <div class="invoice-date">Date: ${formattedDate}</div>
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
                ${customerName || 'Customer Name'}<br>
                ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                ${customerAddress || 'Address not provided'}
            </div>
        </div>
        
        ${paymentType === 'monthly' ? `
            <div style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
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
                        <th class="text-center">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                ${item.description}
                                ${item.warranty && item.warranty !== 'no-warranty' ? 
                                    `<span class="warranty-badge">Warranty: ${formatWarrantyText(item.warranty)}</span>` : ''}
                            </td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">₹${item.price.toFixed(2)}</td>
                            <td class="text-right">₹${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="invoice-totals">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span><strong>₹${grandTotal.toFixed(2)}</strong></span>
                </div>
                ${amountPaid > 0 ? `
                    <div class="totals-row">
                        <span>Amount Paid:</span>
                        <span class="paid-amount">₹${amountPaid.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>Balance Due:</span>
                        <span class="balance-due">₹${balanceDue.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="totals-row grand-total">
                    <span>${amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                    <span class="total-amount">₹${grandTotal.toFixed(2)}</span>
                </div>
            </div>
        ` : '<p style="text-align: center; padding: 40px; color: #666;">No items added</p>'}
        
        <div class="warranty-section">
            <h3 style="margin-top: 0; color: #2c3e50;">Warranty Terms</h3>
            <p>Warranty covers manufacturing defects only. Does not cover:</p>
            <ul>
                <li>Physical damage or liquid damage</li>
                <li>Unauthorized repairs or modifications</li>
                <li>Software issues not related to hardware</li>
            </ul>
            <p>Original invoice required for all warranty claims.</p>
        </div>
        
        ${notes ? `
            <div class="notes-section">
                <div style="font-weight: bold; margin-bottom: 8px;">Notes:</div>
                <div style="color: #666;">${notes}</div>
            </div>
        ` : ''}
        
        <div class="footer">
            Thank you for your business!<br>
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
        hideLoading();
        
    }, 500);
}

// Helper functions for other files
function formatInvoiceDateForDisplay(invoice) {
    if (invoice.invoiceDate) {
        return new Date(invoice.invoiceDate).toLocaleDateString('en-IN');
    } else if (invoice.createdAt) {
        return new Date(invoice.createdAt).toLocaleDateString('en-IN');
    }
    return 'N/A';
}

// Enhanced Loading Functions
function showLoading(message = 'Processing...') {
    // Remove existing loading overlay if any
    hideLoading();
    
    const loadingHTML = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Enhanced Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.remove();
        }
    });

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="toast-icon ${getToastIcon(type)}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    return toast;
}

function getToastIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Enhanced Alert function (for backward compatibility)
function showAlert(message, type = 'info') {
    showToast(message, type, 5000);
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
}

function setFormLoading(isLoading) {
    const form = document.getElementById('invoiceForm');
    const saveBtn = document.getElementById('saveInvoiceBtn');
    
    if (isLoading) {
        form.classList.add('form-loading');
        setButtonLoading(saveBtn, true);
    } else {
        form.classList.remove('form-loading');
        setButtonLoading(saveBtn, false);
    }
}

function resetForm() {
    // Clear form fields
    document.getElementById('invoiceForm').reset();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Clear items container and add one empty row
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    addNewItemRow();
    
    // Hide monthly billing fields
    document.getElementById('monthlyBillingFields').style.display = 'none';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    // Set default payment type and status
    document.getElementById('paymentType').value = 'one-time';
    document.getElementById('paymentStatus').value = 'unpaid';
    
    // Clear editing state
    currentEditingInvoiceId = null;
    
    // Generate new invoice number
    generateNewInvoiceNumber();
    
    // Clear preview
    document.getElementById('invoicePreview').innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-receipt"></i>
            <p>Your invoice will appear here</p>
        </div>
    `;
    
    console.log('Form reset for new invoice');
    
    // Show a small notification that form is ready for new invoice
    setTimeout(() => {
        showToast('Form cleared and ready for new invoice', 'info', 3000);
    }, 500);
}

// Add showAlert function to script.js (if not already there)
function showAlert(message, type) {
    // Remove any existing alerts first
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add alert to the top of the main content
    const main = document.querySelector('main .container');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Customer selection handler
document.addEventListener('DOMContentLoaded', function() {
    // Add customer quick save button to invoice form
    const customerFields = `
        <div class="row mb-3">
            <div class="col-12">
                <div class="d-flex justify-content-between align-items-center">
                    <label class="form-label">Customer Information</label>
                    <button type="button" class="btn btn-outline-info btn-sm" onclick="quickAddCustomer()">
                        <i class="fas fa-user-plus me-1"></i>Save as Customer
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Insert after customer name field or at appropriate location
    const customerNameField = document.getElementById('customerName');
    if (customerNameField) {
        customerNameField.insertAdjacentHTML('afterend', customerFields);
    }
});

// Function to load customer data when selected from dropdown (for other modules)
function loadCustomerData(customerId) {
    if (!customerId) return;
    
    db.collection('customers').doc(customerId).get().then(doc => {
        if (doc.exists) {
            const customer = doc.data();
            document.getElementById('customerName').value = customer.name || '';
            document.getElementById('customerContact').value = customer.contact || '';
            document.getElementById('customerAddress').value = customer.address || '';
            
            if (customer.customerType === 'monthly') {
                document.getElementById('paymentType').value = 'monthly';
                // Trigger the change event to show monthly fields
                document.getElementById('paymentType').dispatchEvent(new Event('change'));
            }
        }
    }).catch(error => {
        console.error('Error loading customer data:', error);
    });
}

// Enhanced Loading System
function showLoading(message = 'Processing...', type = 'spinner') {
    // Remove existing loading overlay if any
    hideLoading();
    
    const loadingHTML = `
        <div class="loading-overlay" id="loadingOverlay">
            ${type === 'dots' ? `
                <div class="loading-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            ` : `
                <div class="loading-spinner"></div>
            `}
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

function showSectionLoading(sectionId, message = 'Loading...') {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    // Create loading overlay for section
    const loadingHTML = `
        <div class="section-loading">
            <div class="section-loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        </div>
    `;
    
    section.innerHTML = loadingHTML;
}

function hideSectionLoading(sectionId, content = '') {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    if (content) {
        section.innerHTML = content;
    } else {
        const loadingElement = section.querySelector('.section-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
}

function showTableLoading(tableBodyId, rows = 5) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    
    let skeletonHTML = '';
    for (let i = 0; i < rows; i++) {
        skeletonHTML += `
            <tr class="table-loading">
                <td colspan="8">
                    <div class="skeleton-row">
                        <div class="skeleton-avatar"></div>
                        <div style="flex: 1;">
                            <div class="skeleton-text short"></div>
                            <div class="skeleton-text medium"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = skeletonHTML;
}

function showCardLoading(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    card.classList.add('card-loading');
}

function hideCardLoading(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    card.classList.remove('card-loading');
}

function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = loadingText;
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

function setFormLoading(formId, isLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    if (isLoading) {
        form.classList.add('form-loading');
    } else {
        form.classList.remove('form-loading');
    }
}

// Progress bar functions
function showProgress(message = 'Processing...', initialProgress = 0) {
    hideLoading();
    
    const progressHTML = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
            <div class="progress-container">
                <div class="progress-bar" id="progressBar" style="width: ${initialProgress}%"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function updateProgress(progress, message = null) {
    const progressBar = document.getElementById('progressBar');
    const loadingText = document.querySelector('#loadingOverlay .loading-text');
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    if (message && loadingText) {
        loadingText.textContent = message;
    }
}
