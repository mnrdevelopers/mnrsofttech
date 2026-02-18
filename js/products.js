// products.js - Product Management System
document.addEventListener('DOMContentLoaded', function() {
    initializeProductsTab();
});

function initializeProductsTab() {
    // Initialize when tab is shown
    const productsTab = document.getElementById('products-tab');
    if (productsTab) {
        productsTab.addEventListener('shown.bs.tab', function() {
            loadProducts();
        });
        
        // Check if tab is already active on load
        if (productsTab.classList.contains('active')) {
            loadProducts();
        }
    }

    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }

    // Save product button
    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }

    // Search and Filter
    const searchProducts = document.getElementById('searchProducts');
    if (searchProducts) {
        searchProducts.addEventListener('input', filterProducts);
    }

    const filterProductType = document.getElementById('filterProductType');
    if (filterProductType) {
        filterProductType.addEventListener('change', filterProducts);
    }

    // Warranty change in modal
    const productWarranty = document.getElementById('productWarranty');
    if (productWarranty) {
        productWarranty.addEventListener('change', function() {
            const customInput = document.getElementById('productCustomWarranty');
            if (this.value === 'custom') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        });
    }

    // Product type change in modal (Hide stock for services)
    const productType = document.getElementById('productType');
    if (productType) {
        productType.addEventListener('change', function() {
            const stockContainer = document.getElementById('productStockContainer');
            if (stockContainer) {
                stockContainer.style.display = this.value === 'service' ? 'none' : 'block';
            }
        });
    }

    // Fix for Product Modal scrollbar issue
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('hidden.bs.modal', function () {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.body.classList.remove('modal-open');
            
            // Remove any remaining backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
        });
    }
}

async function loadProducts() {
    try {
        showTableLoading('productsTableBody', 5);
        
        const snapshot = await db.collection('products').orderBy('name').get();
        const products = [];
        
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayProducts(products);
        
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products: ' + error.message, 'error');
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No products found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td><strong>${product.name}</strong></td>
            <td>
                <span class="badge ${product.type === 'service' ? 'bg-info' : 'bg-primary'}">
                    ${product.type === 'service' ? 'Service' : 'Product'}
                </span>
            </td>
            <td>${product.hsn || '-'}</td>
            <td>${product.type === 'service' ? '-' : (product.stock || 0)}</td>
            <td>₹${(product.price || 0).toFixed(2)}</td>
            <td>${typeof formatWarrantyText === 'function' ? formatWarrantyText(product.warranty) : product.warranty}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning" onclick="editProduct('${product.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProduct('${product.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showAddProductModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productCustomWarranty').style.display = 'none';
    document.getElementById('productModalLabel').textContent = 'Add New Product';
    document.getElementById('productStock').value = '0';
    
    // Reset stock visibility
    const stockContainer = document.getElementById('productStockContainer');
    const productType = document.getElementById('productType');
    if (stockContainer && productType) stockContainer.style.display = productType.value === 'service' ? 'none' : 'block';
    
    const modalEl = document.getElementById('productModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
        modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const type = document.getElementById('productType').value;
    const hsn = document.getElementById('productHsn').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const warrantySelect = document.getElementById('productWarranty').value;
    const customWarranty = document.getElementById('productCustomWarranty').value.trim();
    
    if (!name) {
        showToast('Please enter product name', 'warning');
        return;
    }

    const productData = {
        name,
        type,
        hsn,
        price,
        stock,
        warranty: warrantySelect === 'custom' ? customWarranty : warrantySelect,
        updatedAt: new Date().toISOString()
    };

    try {
        showLoading('Saving product...');
        
        if (id) {
            await db.collection('products').doc(id).update(productData);
        } else {
            // Use name as ID for uniqueness to match script.js logic
            const docId = name.replace(/\//g, '_');
            await db.collection('products').doc(docId).set(productData);
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        modal.hide();
        
        showToast('Product saved successfully', 'success');
        loadProducts();
        
        // Refresh global product list for autocomplete in invoice form
        if (typeof loadSavedProducts === 'function') {
            loadSavedProducts();
        }
        
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function editProduct(id) {
    try {
        showLoading('Loading product details...');
        const doc = await db.collection('products').doc(id).get();
        
        if (!doc.exists) {
            showToast('Product not found', 'error');
            return;
        }
        
        const product = doc.data();
        
        document.getElementById('productId').value = id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productType').value = product.type || 'service';
        document.getElementById('productHsn').value = product.hsn || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productStock').value = product.stock || 0;
        
        // Set stock visibility
        const stockContainer = document.getElementById('productStockContainer');
        if (stockContainer) stockContainer.style.display = product.type === 'service' ? 'none' : 'block';
        
        const warrantySelect = document.getElementById('productWarranty');
        const customInput = document.getElementById('productCustomWarranty');
        
        if (['no-warranty', '7-days', '15-days', '1-month', '3-months', '6-months', '1-year'].includes(product.warranty)) {
            warrantySelect.value = product.warranty;
            customInput.style.display = 'none';
        } else {
            warrantySelect.value = 'custom';
            customInput.style.display = 'block';
            customInput.value = product.warranty || '';
        }
        
        document.getElementById('productModalLabel').textContent = 'Edit Product';
        
        const modalEl = document.getElementById('productModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        modal.show();
        
    } catch (error) {
        console.error('Error loading product:', error);
    } finally {
        hideLoading();
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        showLoading('Deleting product...');
        await db.collection('products').doc(id).delete();
        showToast('Product deleted successfully', 'success');
        loadProducts();
        
        // Refresh global product list for autocomplete
        if (typeof loadSavedProducts === 'function') {
            loadSavedProducts();
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function filterProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const typeFilter = document.getElementById('filterProductType').value;
    
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const typeBadge = row.cells[1].querySelector('.badge');
        const type = typeBadge ? typeBadge.textContent.trim().toLowerCase() : '';
        
        const matchesSearch = name.includes(searchTerm);
        const matchesType = !typeFilter || type === typeFilter;
        
        if (matchesSearch && matchesType) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}