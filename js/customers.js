// customers.js - Customer Management System (Fixed Version)
let customersInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeCustomersTab();
});

function initializeCustomersTab() {
    console.log('Initializing customers tab...');
    
    // Set up event listeners immediately
    setupCustomerEventListeners();
    
    // Load customers if the tab is already active
    if (document.getElementById('customers') && document.getElementById('customers').classList.contains('active')) {
        console.log('Customers tab is active, loading customers...');
        loadCustomers();
    }

    // Wait for the customers tab to be shown
    const customersTab = document.getElementById('customers-tab');
    if (customersTab) {
        customersTab.addEventListener('shown.bs.tab', function() {
            console.log('Customers tab shown, loading customers...');
            loadCustomers();
        });
    } else {
        console.error('Customers tab element not found!');
        // Try again after a short delay
        setTimeout(() => {
            const retryTab = document.getElementById('customers-tab');
            if (retryTab) {
                retryTab.addEventListener('shown.bs.tab', function() {
                    loadCustomers();
                });
            }
        }, 1000);
    }
    
    customersInitialized = true;
}

function setupCustomerEventListeners() {
    console.log('Setting up customer event listeners...');
    
    // Add customer button - with retry logic
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) {
        console.log('Found add customer button');
        addCustomerBtn.addEventListener('click', showAddCustomerModal);
    } else {
        console.error('Add customer button not found!');
        // Try to find it again after a delay
        setTimeout(() => {
            const retryBtn = document.getElementById('addCustomerBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', showAddCustomerModal);
                console.log('Add customer button found on retry');
            }
        }, 500);
    }

    // Save customer button
    const saveCustomerBtn = document.getElementById('saveCustomerBtn');
    if (saveCustomerBtn) {
        saveCustomerBtn.addEventListener('click', saveCustomer);
    }

    // Search customers
    const searchCustomers = document.getElementById('searchCustomers');
    if (searchCustomers) {
        searchCustomers.addEventListener('input', filterCustomers);
    }

    // Customer type filter
    const filterCustomerType = document.getElementById('filterCustomerType');
    if (filterCustomerType) {
        filterCustomerType.addEventListener('change', filterCustomers);
    }

    // Clear customer filters
    const clearCustomerFilters = document.getElementById('clearCustomerFilters');
    if (clearCustomerFilters) {
        clearCustomerFilters.addEventListener('click', function() {
            document.getElementById('searchCustomers').value = '';
            document.getElementById('filterCustomerType').value = '';
            filterCustomers();
        });
    }
}

// Enhanced loadCustomers function with better error handling
async function loadCustomers() {
    try {
        console.log('Loading customers from Firestore...');
        showTableLoading('customersTableBody', 6);
        
        const snapshot = await db.collection('customers').orderBy('name').get();
        const customers = [];
        
        snapshot.forEach(doc => {
            customers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${customers.length} customers`);
        displayCustomers(customers);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Error loading customers: ' + error.message, 'error');
        
        // Show error state in table
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>Failed to load customers</p>
                        <small class="text-muted">${error.message}</small>
                        <br>
                        <button class="btn btn-primary mt-2" onclick="loadCustomers()">
                            <i class="fas fa-redo me-2"></i>Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    const customerSelects = document.querySelectorAll('.customer-select');
    
    if (!tbody) {
        console.error('Customers table body not found!');
        return;
    }
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No customers found</p>
                    <button class="btn btn-primary mt-2" onclick="showAddCustomerModal()">
                        <i class="fas fa-plus me-2"></i>Add Your First Customer
                    </button>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="customer-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            ${getCustomerInitials(customer.name)}
                        </div>
                        <div>
                            <strong>${customer.name}</strong>
                            ${customer.customerType === 'monthly' ? 
                                '<span class="badge bg-info ms-2">Monthly</span>' : 
                                '<span class="badge bg-secondary ms-2">One Time</span>'}
                        </div>
                    </div>
                </td>
                <td>${customer.contact || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>
                    <small class="text-muted">${customer.address ? customer.address.substring(0, 50) + (customer.address.length > 50 ? '...' : '') : 'No address'}</small>
                </td>
                <td>${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>
                    <span class="badge ${customer.status === 'active' ? 'bg-success' : 'bg-warning'}">
                        ${customer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="selectCustomerForInvoice('${customer.id}')" title="Use for Invoice">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editCustomer('${customer.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteCustomer('${customer.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Update customer dropdowns
    updateCustomerSelects(customers, customerSelects);
}

function updateCustomerSelects(customers, selects) {
    const sortedCustomers = customers.sort((a, b) => a.name.localeCompare(b.name));
    
    selects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select Customer --</option>';
        
        sortedCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} ${customer.contact ? `(${customer.contact})` : ''}`;
            option.dataset.customerData = JSON.stringify(customer);
            select.appendChild(option);
        });
        
        // Restore previous value if it exists
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function getCustomerInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

function showAddCustomerModal() {
    console.log('Showing add customer modal');
    
    const modalLabel = document.getElementById('customerModalLabel');
    if (!modalLabel) {
        console.error('Customer modal label not found!');
        return;
    }
    
    modalLabel.textContent = 'Add New Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerStatus').value = 'active';
    
    const modalElement = document.getElementById('customerModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('Customer modal element not found!');
    }
}

async function saveCustomer() {
    const customerData = collectCustomerData();
    
    if (!customerData.name) {
        showToast('Please enter customer name', 'warning');
        return;
    }
    
    try {
        showLoading('Saving customer...');
        
        // Generate a unique ID based on name and contact
        const customerId = customerData.name.toLowerCase().replace(/\s+/g, '_') + 
                          (customerData.contact ? '_' + customerData.contact : '_' + Date.now());
        
        const customerToSave = {
            ...customerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('customers').doc(customerId).set(customerToSave);
        
        // Close modal
        const modalElement = document.getElementById('customerModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        showToast('Customer saved successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error saving customer:', error);
        showToast('Error saving customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function editCustomer(customerId) {
    try {
        showLoading('Loading customer details...');
        
        const doc = await db.collection('customers').doc(customerId).get();
        
        if (!doc.exists) {
            showToast('Customer not found', 'warning');
            return;
        }
        
        const customer = doc.data();
        
        // Populate form - NOTE: Using modal-specific IDs
        const modalLabel = document.getElementById('customerModalLabel');
        if (modalLabel) {
            modalLabel.textContent = 'Edit Customer';
        }
        document.getElementById('customerId').value = customerId;
        document.getElementById('modalCustomerName').value = customer.name || '';
        document.getElementById('modalCustomerContact').value = customer.contact || '';
        document.getElementById('modalCustomerEmail').value = customer.email || '';
        document.getElementById('modalCustomerAddress').value = customer.address || '';
        document.getElementById('customerType').value = customer.customerType || 'one-time';
        document.getElementById('customerStatus').value = customer.status || 'active';
        document.getElementById('customerNotes').value = customer.notes || '';
        
        const modalElement = document.getElementById('customerModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error('Error loading customer:', error);
        showToast('Error loading customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function updateCustomer() {
    const customerId = document.getElementById('customerId').value;
    const customerData = collectCustomerData();
    
    if (!customerId) {
        showToast('Customer ID not found', 'error');
        return;
    }
    
    try {
        showLoading('Updating customer...');
        
        const customerToUpdate = {
            ...customerData,
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('customers').doc(customerId).update(customerToUpdate);
        
        // Close modal
        const modalElement = document.getElementById('customerModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        showToast('Customer updated successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error updating customer:', error);
        showToast('Error updating customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function collectCustomerData() {
    // Use modal-specific IDs to avoid conflicts
    return {
        name: document.getElementById('modalCustomerName')?.value.trim() || '',
        contact: document.getElementById('modalCustomerContact')?.value.trim() || '',
        email: document.getElementById('modalCustomerEmail')?.value.trim() || '',
        address: document.getElementById('modalCustomerAddress')?.value.trim() || '',
        customerType: document.getElementById('customerType')?.value || 'one-time',
        status: document.getElementById('customerStatus')?.value || 'active',
        notes: document.getElementById('customerNotes')?.value.trim() || ''
    };
}

async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading('Deleting customer...');
        
        // Check if customer has any invoices
        const invoicesSnapshot = await db.collection('invoices')
            .where('customerId', '==', customerId)
            .get();
        
        if (!invoicesSnapshot.empty) {
            showToast('Cannot delete customer with existing invoices. Please delete the invoices first.', 'warning');
            return;
        }
        
        await db.collection('customers').doc(customerId).delete();
        
        showToast('Customer deleted successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        showToast('Error deleting customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function selectCustomerForInvoice(customerId) {
    // Switch to generate invoice tab
    const generateTab = document.getElementById('generate-tab');
    if (generateTab) {
        const tab = new bootstrap.Tab(generateTab);
        tab.show();
    }
    
    // Load customer data after a short delay
    setTimeout(async () => {
        try {
            const doc = await db.collection('customers').doc(customerId).get();
            
            if (doc.exists) {
                const customer = doc.data();
                // Use invoice form IDs (without 'modal' prefix)
                document.getElementById('customerName').value = customer.name || '';
                document.getElementById('customerContact').value = customer.contact || '';
                document.getElementById('customerAddress').value = customer.address || '';
                
                // Set payment type based on customer type
                if (customer.customerType === 'monthly') {
                    document.getElementById('paymentType').value = 'monthly';
                    document.getElementById('monthlyBillingFields').style.display = 'block';
                }
                
                showToast(`Customer ${customer.name} loaded for invoice`, 'success');
            }
        } catch (error) {
            console.error('Error loading customer for invoice:', error);
        }
    }, 300);
}

function filterCustomers() {
    const searchTerm = document.getElementById('searchCustomers')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filterCustomerType')?.value || '';
    
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.querySelector('td')) { // Skip the "no customers" row
            const name = row.cells[0].textContent.toLowerCase();
            const contact = row.cells[1].textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();
            const typeBadge = row.cells[0].querySelector('.badge');
            const type = typeBadge ? typeBadge.textContent.toLowerCase() : '';
            
            const matchesSearch = !searchTerm || 
                                name.includes(searchTerm) || 
                                contact.includes(searchTerm) || 
                                email.includes(searchTerm);
            
            const matchesType = !typeFilter || 
                              (typeFilter === 'monthly' && type === 'monthly') ||
                              (typeFilter === 'one-time' && type === 'one time');
            
            row.style.display = matchesSearch && matchesType ? '' : 'none';
        }
    });
}

// Function to populate customer dropdown in other modules
function populateCustomerDropdown(selectElement) {
    loadCustomers().then(() => {
        // The loadCustomers function already updates all customer selects
    });
}

// Quick customer add from invoice form
function quickAddCustomer() {
    const name = document.getElementById('customerName')?.value || '';
    const contact = document.getElementById('customerContact')?.value || '';
    const address = document.getElementById('customerAddress')?.value || '';
    
    if (!name) {
        showToast('Please enter customer name first', 'warning');
        return;
    }
    
    // Pre-fill the customer modal - use modal-specific IDs
    const modalLabel = document.getElementById('customerModalLabel');
    if (modalLabel) {
        modalLabel.textContent = 'Add New Customer';
    }
    document.getElementById('customerId').value = '';
    document.getElementById('modalCustomerName').value = name;
    document.getElementById('modalCustomerContact').value = contact;
    document.getElementById('modalCustomerAddress').value = address;
    document.getElementById('customerStatus').value = 'active';
    
    // Clear other fields
    document.getElementById('modalCustomerEmail').value = '';
    document.getElementById('customerNotes').value = '';
    
    const modalElement = document.getElementById('customerModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// Force reload customers (can be called from console for debugging)
function forceReloadCustomers() {
    console.log('Force reloading customers...');
    loadCustomers();
}
