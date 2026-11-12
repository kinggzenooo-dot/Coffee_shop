/**
 * The Daily Grind Coffee Shop - Staff POS Portal Logic
 * Fully integrated with Python Flask API via api_client.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  
  // ==========================================================================
  // 1. STATE & API DATA MANAGERS
  // ==========================================================================

  let products = [];
  let categories = [];
  let customers = [];
  let orders = [];
  let settings = {
    shop_name: 'The Daily Grind Coffee Shop',
    currency: '$',
    tax_rate: 8.0,
    low_stock_threshold: 10
  };

  const loadAllData = async () => {
    try {
      const [prods, cats, custs, ords, sets] = await Promise.all([
        window.API.getProducts(),
        window.API.getCategories(),
        window.API.getCustomers(),
        window.API.getOrders(),
        window.API.getSettings()
      ]);

      if (Array.isArray(prods)) products = prods;
      if (Array.isArray(cats)) categories = cats;
      if (Array.isArray(custs)) customers = custs;
      if (Array.isArray(ords)) orders = ords;
      if (sets && typeof sets === 'object') settings = { ...settings, ...sets };
    } catch (e) {
      console.warn('Error fetching staff portal data:', e);
    }
  };

  const getTaxMultiplier = () => {
    const rate = parseFloat(settings.tax_rate) || 8.0;
    return rate > 1 ? rate / 100 : rate;
  };

  const curr = () => settings.currency || '$';

  // Category vector icons
  const categoryIcons = {
    Coffee: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
    'Non-Coffee': `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 22H6L4 6h16l-2 16z" /><path d="M14 2L8 6" /><path d="M4 6h16" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="8" y1="15" x2="16" y2="15" /></svg>`,
    Tea: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a3 3 0 0 1 0 6h-1" /><path d="M2 8h16v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8z" /><path d="M6 2c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1z" /></svg>`,
    Pastries: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 14c2.5-3.5 6-5.5 9-5.5s6.5 2 9 5.5c-3.5 1-6.5 1.5-9 1.5s-5.5-.5-9-1.5z" /><path d="M7 11.5c1.5-1.5 3-2.5 5-2.5s3.5 1 5 2.5" /><path d="M10 9.5c.5-.5 1-.5 2-.5s1.5 0 2 .5" /></svg>`,
    Snacks: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3c-4 0-7 2-7 6 0 1 0 2.5 1 3.5L5 20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-1-7.5c1-1 1-2.5 1-3.5 0-4-3-6-7-6z" /><path d="M8 8c1-1 2-1 4-1s3 0 4 1" /></svg>`,
    Desserts: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 19h20M2 19V11c3-2 6-3 10-3s7 1 10 3v8" /><path d="M12 8V4M10 4h4" /><path d="M2 14c4 1 8-1 12 0s6-1 8 0" /></svg>`,
    'Add-ons': `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" stroke-dasharray="3 3" /></svg>`
  };


  // ==========================================================================
  // 2. TOAST SYSTEM & NAVIGATION
  // ==========================================================================

  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : '❌';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  const sectionTitle = document.getElementById('section-title');
  const sectionSubtext = document.getElementById('section-subtext');

  const titleMappings = {
    pos: { title: 'POS', sub: 'Register Terminal #01 • Cashier Working Screen' },
    orders: { title: 'Orders', sub: 'Order Fulfillment & Live Kitchen Management' },
    customers: { title: 'Customers', sub: 'Customer Directory & Membership Rewards' },
    products: { title: 'Products', sub: 'Catalog View & Real-time Stock Management' }
  };

  const switchSection = (target) => {
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === target) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    sections.forEach(section => {
      if (section.getAttribute('id') === `sect-${target}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    if (titleMappings[target]) {
      if (sectionTitle) sectionTitle.textContent = titleMappings[target].title;
      if (sectionSubtext) sectionSubtext.textContent = titleMappings[target].sub;
    }

    // Refresh views on switch
    if (target === 'pos') renderPOSProducts();
    if (target === 'orders') renderStaffOrdersUI();
    if (target === 'customers') renderStaffCustomersUI();
    if (target === 'products') renderStaffCatalogUI();
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) switchSection(target);
    });
  });

  // Logout button
  document.getElementById('btn-logout-sidebar')?.addEventListener('click', () => {
    showToast('Signing out of staff session...', 'success');
    localStorage.removeItem('tgd_current_user');
    localStorage.removeItem('dailygrind_current_user');
    sessionStorage.removeItem('tgd_current_user');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  });


  // ==========================================================================
  // 3. POS LOGIC (CASHIER WORKING SCREEN)
  // ==========================================================================

  let posCart = [];
  let selectedCustomer = null;
  let activePOSCategory = 'all';
  let activePOSSearch = '';
  let modalActiveProduct = null;

  // Dynamically render category buttons in POS and Catalog
  const renderCategoryCapsules = () => {
    const posCatRow = document.getElementById('pos-category-row');
    const catalogCatRow = document.getElementById('staff-catalog-category-row');

    const catList = categories.length > 0 
      ? categories.map(c => typeof c === 'string' ? c : c.name)
      : ['Coffee', 'Non-Coffee', 'Tea', 'Pastries', 'Snacks', 'Desserts', 'Add-ons'];

    const makeCapsulesHTML = (activeCat) => {
      let html = `<button class="capsule ${activeCat === 'all' ? 'active' : ''}" data-category="all">All Items</button>`;
      catList.forEach(c => {
        html += `<button class="capsule ${activeCat.toLowerCase() === c.toLowerCase() ? 'active' : ''}" data-category="${c}">${c}</button>`;
      });
      return html;
    };

    if (posCatRow) posCatRow.innerHTML = makeCapsulesHTML(activePOSCategory);
    if (catalogCatRow) catalogCatRow.innerHTML = makeCapsulesHTML(staffCatalogCategory);
  };

  // POS Render Products Grid
  const renderPOSProducts = () => {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    let filtered = products.filter(p => {
      const matchesCategory = activePOSCategory === 'all' || p.category.toLowerCase() === activePOSCategory.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(activePOSSearch.toLowerCase()) || 
                            (p.desc && p.desc.toLowerCase().includes(activePOSSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="pos-empty-cart" style="grid-column: 1 / -1;">
          <svg class="pos-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>No products found matching your search criteria.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isAvailable = p.inStock && (p.stock === undefined || p.stock > 0);
      const stockText = p.stock !== undefined ? `(${p.stock} left)` : '';
      const hasImg = Boolean(p.image && p.image.trim() !== '');
      const imgHTML = hasImg
        ? `<div class="pos-card-img" style="overflow:hidden;"><img src="${p.image}" class="pos-real-img" alt="${p.name}"></div>`
        : `<div class="pos-card-img">${categoryIcons[p.category] || categoryIcons['Coffee']}</div>`;

      return `
        <div class="pos-card ${!isAvailable ? 'out-of-stock' : ''}" data-id="${p.id}">
          <div class="pos-card-top">
            ${imgHTML}
            <div class="pos-card-details">
              <span class="pos-card-category">${p.category}</span>
              <h4 class="pos-card-title">${p.name}</h4>
            </div>
          </div>
          <div class="pos-card-bottom">
            <div class="price-wrap">
              <span class="pos-card-price">${curr()}${parseFloat(p.price).toFixed(2)}</span>
            </div>
            ${isAvailable ? `
              <span class="stock-tag in-stock">In Stock ${stockText}</span>
              <button class="btn-pos-add" title="Add to Order" data-id="${p.id}">+</button>
            ` : `
              <span class="stock-tag out-stock">Out of Stock</span>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    grid.querySelectorAll('.pos-card').forEach(card => {
      card.addEventListener('click', () => {
        const pId = card.getAttribute('data-id');
        const prod = products.find(item => item.id === pId);
        if (!prod || !prod.inStock || (prod.stock !== undefined && prod.stock <= 0)) return;

        openPOSItemModal(prod);
      });
    });
  };

  // Category Capsule Handlers
  const categoryContainer = document.getElementById('pos-category-row');
  if (categoryContainer) {
    categoryContainer.addEventListener('click', (e) => {
      const capsule = e.target.closest('.capsule');
      if (!capsule) return;
      categoryContainer.querySelectorAll('.capsule').forEach(c => c.classList.remove('active'));
      capsule.classList.add('active');
      activePOSCategory = capsule.getAttribute('data-category');
      renderPOSProducts();
    });
  }

  // POS Search input
  const posSearchInput = document.getElementById('pos-search-input');
  if (posSearchInput) {
    posSearchInput.addEventListener('input', (e) => {
      activePOSSearch = e.target.value;
      renderPOSProducts();
    });
  }

  // ITEM CUSTOMIZATION MODAL
  const staffProductModal = document.getElementById('staff-product-modal');
  const btnCloseStaffModal = document.getElementById('btn-close-staff-modal');
  const staffMilkGroup = document.getElementById('staff-milk-group');
  const staffSweetnessGroup = document.getElementById('staff-sweetness-group');

  const openPOSItemModal = (product) => {
    modalActiveProduct = product;
    document.getElementById('staff-modal-title').textContent = product.name;
    document.getElementById('staff-modal-desc').textContent = product.desc || '';
    document.getElementById('staff-modal-price').textContent = `${curr()}${parseFloat(product.price).toFixed(2)}`;
    
    const modalImgWrap = document.getElementById('staff-modal-img-wrapper');
    if (modalImgWrap) {
      if (product.image && product.image.trim() !== '') {
        modalImgWrap.innerHTML = `<img src="${product.image}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" alt="${product.name}">`;
      } else {
        modalImgWrap.innerHTML = categoryIcons[product.category] || categoryIcons['Coffee'];
      }
    }

    
    // Toggle options based on product type
    if (staffMilkGroup) staffMilkGroup.style.display = product.hasMilk ? 'block' : 'none';
    if (staffSweetnessGroup) staffSweetnessGroup.style.display = product.hasSweetness ? 'block' : 'none';

    // Reset inputs
    document.getElementById('staff-customization-form').reset();
    document.getElementById('staff-item-notes').value = '';

    staffProductModal.classList.add('active');
  };

  btnCloseStaffModal?.addEventListener('click', () => {
    staffProductModal.classList.remove('active');
  });

  // Add Item From Modal to POS Order
  document.getElementById('btn-add-item-to-pos')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!modalActiveProduct) return;

    const form = document.getElementById('staff-customization-form');
    const selectedSize = form.querySelector('input[name="staff-size"]:checked');
    const selectedMilk = form.querySelector('input[name="staff-milk"]:checked');
    const selectedSweetness = form.querySelector('input[name="staff-sweetness"]:checked');
    const notes = document.getElementById('staff-item-notes').value.trim();

    let extraPrice = 0;
    const customList = [];

    if (selectedSize) {
      customList.push(selectedSize.value);
      extraPrice += parseFloat(selectedSize.getAttribute('data-add') || 0);
    }
    if (modalActiveProduct.hasMilk && selectedMilk) {
      customList.push(selectedMilk.value);
      extraPrice += parseFloat(selectedMilk.getAttribute('data-add') || 0);
    }
    if (modalActiveProduct.hasSweetness && selectedSweetness) {
      customList.push(selectedSweetness.value);
    }

    const unitPrice = parseFloat(modalActiveProduct.price) + extraPrice;
    const customStr = customList.join(', ');

    // Check if item with exact same customizations exists in POS cart
    const existingIndex = posCart.findIndex(item => item.id === modalActiveProduct.id && item.customizations === customStr && item.notes === notes);

    if (existingIndex > -1) {
      posCart[existingIndex].qty += 1;
    } else {
      posCart.push({
        cartId: Date.now() + Math.random(),
        id: modalActiveProduct.id,
        name: modalActiveProduct.name,
        category: modalActiveProduct.category,
        unitPrice: unitPrice,
        qty: 1,
        customizations: customStr,
        notes: notes
      });
    }

    staffProductModal.classList.remove('active');
    renderPOSCartUI();
    showToast(`Added ${modalActiveProduct.name} to POS ticket.`);
  });

  // Render POS Cart Items & Order Billing Calculation
  const renderPOSCartUI = () => {
    const list = document.getElementById('pos-items-list');
    if (!list) return;

    if (posCart.length === 0) {
      list.innerHTML = `
        <div class="pos-empty-cart">
          <svg class="pos-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
          </svg>
          <p>No items in current order.<br>Click a product card to add to ticket.</p>
        </div>`;
      calculatePOSBilling();
      return;
    }

    list.innerHTML = posCart.map(item => `
      <div class="pos-order-item" data-cart-id="${item.cartId}">
        <div class="item-main-row">
          <div class="item-info">
            <span class="item-title">${item.name}</span>
            <span class="item-options-text">${item.customizations}</span>
            ${item.notes ? `<span class="item-options-text" style="color: var(--color-accent-brown); font-weight:600;">Note: ${item.notes}</span>` : ''}
          </div>
          <span class="item-price-calc">${curr()}${(item.unitPrice * item.qty).toFixed(2)}</span>
        </div>
        <div class="item-controls-row">
          <div class="qty-control-box">
            <button type="button" class="qty-btn btn-pos-minus" data-cart-id="${item.cartId}">-</button>
            <span class="qty-num">${item.qty}</span>
            <button type="button" class="qty-btn btn-pos-plus" data-cart-id="${item.cartId}">+</button>
          </div>
          <button type="button" class="btn-remove-item btn-pos-remove" data-cart-id="${item.cartId}" title="Remove item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    // Attach cart item button events
    list.querySelectorAll('.btn-pos-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = parseFloat(btn.getAttribute('data-cart-id'));
        const item = posCart.find(i => i.cartId === cId);
        if (item) {
          if (item.qty > 1) item.qty--;
          else posCart = posCart.filter(i => i.cartId !== cId);
          renderPOSCartUI();
        }
      });
    });

    list.querySelectorAll('.btn-pos-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = parseFloat(btn.getAttribute('data-cart-id'));
        const item = posCart.find(i => i.cartId === cId);
        if (item) {
          item.qty++;
          renderPOSCartUI();
        }
      });
    });

    list.querySelectorAll('.btn-pos-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = parseFloat(btn.getAttribute('data-cart-id'));
        posCart = posCart.filter(i => i.cartId !== cId);
        renderPOSCartUI();
      });
    });

    calculatePOSBilling();
  };

  // Clear POS Cart button
  document.getElementById('btn-clear-pos-cart')?.addEventListener('click', () => {
    if (posCart.length > 0) {
      posCart = [];
      renderPOSCartUI();
      showToast('POS ticket cleared.', 'info');
    }
  });

  // Calculate POS Subtotal, Discount, Tax, Total, & Payment change
  const calculatePOSBilling = () => {
    const subtotalEl = document.getElementById('pos-subtotal');
    const discountEl = document.getElementById('pos-discount');
    const taxEl = document.getElementById('pos-tax');
    const totalEl = document.getElementById('pos-total');
    const btnComplete = document.getElementById('btn-complete-order');
    const discountSelect = document.getElementById('pos-discount-select');

    let subtotal = posCart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);

    // Calculate discount rate
    let discountRate = 0;
    const discountVal = discountSelect ? discountSelect.value : '0';

    if (discountVal === 'member') {
      if (selectedCustomer) {
        if (selectedCustomer.tier === 'Platinum Member') discountRate = 0.15;
        else if (selectedCustomer.tier === 'Gold Member') discountRate = 0.10;
        else if (selectedCustomer.tier === 'Silver Member') discountRate = 0.05;
      }
    } else {
      discountRate = parseFloat(discountVal) / 100;
    }

    let discountAmount = subtotal * discountRate;
    let taxableSubtotal = subtotal - discountAmount;
    let taxMultiplier = getTaxMultiplier();
    let tax = taxableSubtotal * taxMultiplier;
    let total = taxableSubtotal + tax;

    if (subtotalEl) subtotalEl.textContent = `${curr()}${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-${curr()}${discountAmount.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `${curr()}${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${curr()}${total.toFixed(2)}`;

    // Update complete order button text & state
    if (btnComplete) {
      btnComplete.querySelector('span').textContent = `Complete Order (${curr()}${total.toFixed(2)})`;
    }

    // Cash Change Calculator
    const selectedPayMethod = document.querySelector('input[name="pos-payment-method"]:checked')?.value || 'Cash';
    const cashInput = document.getElementById('pos-cash-tendered');
    const changeEl = document.getElementById('pos-change-due');
    let cashTendered = parseFloat(cashInput?.value || 0);
    let changeDue = cashTendered - total;

    if (changeEl) {
      changeEl.textContent = changeDue >= 0 ? `${curr()}${changeDue.toFixed(2)}` : `${curr()}0.00`;
    }

    if (btnComplete) {
      if (posCart.length === 0) {
        btnComplete.disabled = true;
      } else if (selectedPayMethod === 'Cash') {
        btnComplete.disabled = cashTendered < total;
      } else {
        btnComplete.disabled = false;
      }
    }
  };

  // Discount select change
  document.getElementById('pos-discount-select')?.addEventListener('change', calculatePOSBilling);

  // Payment radio buttons toggle cash drawer
  document.querySelectorAll('input[name="pos-payment-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.pay-option').forEach(opt => opt.classList.remove('active'));
      e.target.closest('.pay-option').classList.add('active');

      const cashDrawer = document.getElementById('pos-cash-drawer');
      if (cashDrawer) {
        cashDrawer.style.display = e.target.value === 'Cash' ? 'flex' : 'none';
      }
      calculatePOSBilling();
    });
  });

  // Cash tendered input real-time calculate
  document.getElementById('pos-cash-tendered')?.addEventListener('input', calculatePOSBilling);

  // Quick cash buttons
  document.querySelectorAll('.btn-cash-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const amountAttr = btn.getAttribute('data-amount');
      const cashInput = document.getElementById('pos-cash-tendered');
      
      let subtotal = posCart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
      const discountVal = document.getElementById('pos-discount-select')?.value || '0';
      let discountRate = 0;
      if (discountVal === 'member' && selectedCustomer) {
        if (selectedCustomer.tier === 'Platinum Member') discountRate = 0.15;
        else if (selectedCustomer.tier === 'Gold Member') discountRate = 0.10;
        else if (selectedCustomer.tier === 'Silver Member') discountRate = 0.05;
        else discountRate = 0;
      } else if (discountVal && discountVal !== 'none') {
        discountRate = parseFloat(discountVal) / 100;
      }

      let total = (subtotal - (subtotal * discountRate)) * (1 + getTaxMultiplier());

      if (amountAttr === 'exact') {
        if (cashInput) cashInput.value = total.toFixed(2);
      } else {
        if (cashInput) cashInput.value = parseFloat(amountAttr).toFixed(2);
      }
      calculatePOSBilling();
    });
  });

  // CUSTOMER SELECTOR FOR POS
  const custModal = document.getElementById('customer-select-modal');
  const btnSelectCust = document.getElementById('btn-select-customer');
  const btnClearCust = document.getElementById('btn-clear-customer');
  const btnCloseCustModal = document.getElementById('btn-close-cust-modal');

  btnSelectCust?.addEventListener('click', () => {
    renderCustomerPickerList();
    custModal?.classList.add('active');
  });

  btnCloseCustModal?.addEventListener('click', () => {
    custModal?.classList.remove('active');
  });

  const setPOSCustomer = (cust) => {
    selectedCustomer = cust;
    const avatarEl = document.getElementById('pos-cust-avatar');
    const nameEl = document.getElementById('pos-cust-name');
    const tierEl = document.getElementById('pos-cust-tier');

    if (cust) {
      if (avatarEl) avatarEl.innerHTML = `<span style="font-weight:700;">${(cust.name || 'C').split(' ').map(n=>n[0]).join('')}</span>`;
      if (nameEl) nameEl.textContent = cust.name;
      if (tierEl) tierEl.textContent = `${cust.tier || 'Standard Member'} • ${cust.points || 0} pts`;
      if (btnClearCust) btnClearCust.style.display = 'block';
      
      const discountSelect = document.getElementById('pos-discount-select');
      if (discountSelect) discountSelect.value = 'member';
    } else {
      if (avatarEl) avatarEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      if (nameEl) nameEl.textContent = 'Walk-in Customer';
      if (tierEl) tierEl.textContent = 'Standard Guest';
      if (btnClearCust) btnClearCust.style.display = 'none';
      const discountSelect = document.getElementById('pos-discount-select');
      if (discountSelect) discountSelect.value = '0';
    }

    calculatePOSBilling();
  };

  btnClearCust?.addEventListener('click', () => {
    setPOSCustomer(null);
    showToast('Customer reset to Walk-in Guest.', 'info');
  });

  const renderCustomerPickerList = (query = '') => {
    const list = document.getElementById('cust-picker-list');
    if (!list) return;

    let filtered = customers.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(query.toLowerCase())) || 
      (c.phone && c.phone.includes(query))
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--color-text-muted);">No matching customers found.</div>`;
      return;
    }

    list.innerHTML = filtered.map(c => `
      <div class="cust-picker-item" data-id="${c.id}">
        <div class="cust-info">
          <strong>${c.name}</strong>
          <span class="item-options-text">${c.email || ''} • ${c.phone || ''}</span>
        </div>
        <div class="cust-badge-wrap">
          <span class="tier-badge ${(c.tier || 'standard').toLowerCase().split(' ')[0]}">${c.tier || 'Standard Member'}</span>
          <button class="btn-sm btn-primary" style="margin-left: 10px;">Select</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.cust-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const cId = item.getAttribute('data-id');
        const cust = customers.find(c => c.id === cId);
        if (cust) {
          setPOSCustomer(cust);
          custModal?.classList.remove('active');
          showToast(`Selected customer: ${cust.name}`);
        }
      });
    });
  };

  document.getElementById('cust-modal-search')?.addEventListener('input', (e) => {
    renderCustomerPickerList(e.target.value);
  });


  // COMPLETE POS ORDER PROCESSOR
  document.getElementById('btn-complete-order')?.addEventListener('click', async () => {
    if (posCart.length === 0) return;

    let subtotal = posCart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const discountVal = document.getElementById('pos-discount-select')?.value || '0';
    let discountRate = 0;

    if (discountVal === 'member' && selectedCustomer) {
      if (selectedCustomer.tier === 'Platinum Member') discountRate = 0.15;
      else if (selectedCustomer.tier === 'Gold Member') discountRate = 0.10;
      else if (selectedCustomer.tier === 'Silver Member') discountRate = 0.05;
      else discountRate = 0;
    } else {
      discountRate = parseFloat(discountVal) / 100;
    }

    let discountAmount = subtotal * discountRate;
    let taxable = subtotal - discountAmount;
    let tax = taxable * getTaxMultiplier();
    let total = taxable + tax;

    const paymentMethod = document.querySelector('input[name="pos-payment-method"]:checked')?.value || 'Cash';
    const cashTendered = parseFloat(document.getElementById('pos-cash-tendered')?.value || total);
    const changeDue = Math.max(0, cashTendered - total);

    const now = new Date();
    const dateStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newOrder = {
      date: dateStr,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerId: selectedCustomer ? selectedCustomer.id : null,
      channel: 'POS Register #01',
      items: posCart.map(i => ({
        name: i.name,
        qty: i.qty,
        customizations: `${i.customizations}${i.notes ? ` (Note: ${i.notes})` : ''}`,
        price: i.unitPrice
      })),
      subtotal: subtotal,
      discount: discountAmount,
      tax: tax,
      total: total,
      paymentMethod: paymentMethod,
      cashTendered: paymentMethod === 'Cash' ? cashTendered : total,
      changeDue: paymentMethod === 'Cash' ? changeDue : 0,
      status: settings.default_status || 'Preparing',
      timestamp: Date.now()
    };

    const res = await window.API.createOrder(newOrder);

    if (res && res.status === 'success') {
      newOrder.id = res.order_id;
      renderReceiptModal(newOrder);

      // Reload state from API
      await loadAllData();

      posCart = [];
      setPOSCustomer(null);
      const cashInp = document.getElementById('pos-cash-tendered');
      if (cashInp) cashInp.value = '';
      renderPOSCartUI();
      renderPOSProducts();
      renderStaffOrdersUI();
      renderStaffCatalogUI();

      showToast(`Order ${res.order_id} processed successfully!`, 'success');
    } else {
      showToast(res?.message || 'Error processing order.', 'error');
    }
  });

  // RECEIPT PREVIEW MODAL
  const posReceiptModal = document.getElementById('pos-receipt-modal');
  const btnCloseReceiptModal = document.getElementById('btn-close-receipt-modal');

  const renderReceiptModal = (order) => {
    const preview = document.getElementById('receipt-preview-content');
    if (!preview) return;

    preview.innerHTML = `
      <div class="receipt-row" style="justify-content: center; font-weight:700; font-size:1.1rem;">${settings.shop_name || 'THE DAILY GRIND'}</div>
      <div class="receipt-row" style="justify-content: center; font-size:0.75rem;">${settings.address || '123 Espresso Lane • Store #01'}</div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>Order ID:</span><strong>${order.id}</strong></div>
      <div class="receipt-row"><span>Date:</span><span>${order.date}</span></div>
      <div class="receipt-row"><span>Customer:</span><span>${order.customerName}</span></div>
      <div class="receipt-row"><span>Channel:</span><span>${order.channel}</span></div>
      <div class="receipt-divider"></div>
      ${order.items.map(i => `
        <div class="receipt-row">
          <span>${i.qty}x ${i.name}</span>
          <span>${curr()}${((i.price || 0) * (i.qty || 1)).toFixed(2)}</span>
        </div>
        ${i.customizations ? `<div class="receipt-row" style="font-size:0.72rem; color:#666; padding-left:10px;">${i.customizations}</div>` : ''}
      `).join('')}
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>Subtotal:</span><span>${curr()}${order.subtotal.toFixed(2)}</span></div>
      <div class="receipt-row"><span>Discount:</span><span>-${curr()}${order.discount.toFixed(2)}</span></div>
      <div class="receipt-row"><span>Tax (${settings.tax_rate || 8}%):</span><span>${curr()}${order.tax.toFixed(2)}</span></div>
      <div class="receipt-row" style="font-weight:700; font-size:1rem; margin-top:4px;"><span>TOTAL:</span><span>${curr()}${order.total.toFixed(2)}</span></div>
      <div class="receipt-divider"></div>
      <div class="receipt-row"><span>Payment:</span><span>${order.paymentMethod}</span></div>
      ${order.paymentMethod === 'Cash' ? `
        <div class="receipt-row"><span>Tendered:</span><span>${curr()}${(order.cashTendered || order.total).toFixed(2)}</span></div>
        <div class="receipt-row" style="font-weight:700; color:#2e7d32;"><span>Change Given:</span><span>${curr()}${(order.changeDue || 0).toFixed(2)}</span></div>
      ` : ''}
      <div class="receipt-divider"></div>
      <div class="receipt-row" style="justify-content: center; font-size:0.75rem; text-align:center;">
        Thank you for visiting! Enjoy your coffee!
      </div>
    `;

    posReceiptModal?.classList.add('active');
  };

  btnCloseReceiptModal?.addEventListener('click', () => {
    posReceiptModal?.classList.remove('active');
  });

  document.getElementById('btn-next-transaction')?.addEventListener('click', () => {
    posReceiptModal?.classList.remove('active');
  });

  document.getElementById('btn-print-receipt')?.addEventListener('click', () => {
    window.print();
    showToast('Receipt sent to register printer.', 'success');
  });


  // ==========================================================================
  // 4. ORDERS MANAGEMENT LOGIC
  // ==========================================================================

  let staffOrderSearch = '';
  let staffOrderStatusFilter = 'all';

  const renderStaffOrdersUI = () => {
    const totalOrdersEl = document.getElementById('metric-total-orders');
    const activeOrdersEl = document.getElementById('metric-active-orders');
    const completedOrdersEl = document.getElementById('metric-completed-orders');
    const todayRevenueEl = document.getElementById('metric-today-revenue');

    const totalCount = orders.length;
    const activeCount = orders.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status)).length;
    const completedCount = orders.filter(o => o.status === 'Completed').length;
    const todayRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0), 0);

    if (totalOrdersEl) totalOrdersEl.textContent = totalCount;
    if (activeOrdersEl) activeOrdersEl.textContent = activeCount;
    if (completedOrdersEl) completedOrdersEl.textContent = completedCount;
    if (todayRevenueEl) todayRevenueEl.textContent = `${curr()}${todayRevenue.toFixed(2)}`;

    const tableBody = document.getElementById('staff-orders-table-body');
    if (!tableBody) return;

    let filtered = orders.filter(o => {
      const matchesStatus = staffOrderStatusFilter === 'all' || o.status === staffOrderStatusFilter;
      const matchesSearch = o.id.toLowerCase().includes(staffOrderSearch.toLowerCase()) || 
                            (o.customerName && o.customerName.toLowerCase().includes(staffOrderSearch.toLowerCase())) || 
                            (o.date && o.date.toLowerCase().includes(staffOrderSearch.toLowerCase()));
      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            No orders found matching your search and filter criteria.
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(o => {
      const itemsSummary = (o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
      const isPOS = (o.channel || '').includes('POS');
      const totalNum = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;
      
      return `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${o.date}</td>
          <td>${o.customerName || 'Walk-in Customer'}</td>
          <td><span class="channel-tag ${isPOS ? 'pos' : 'online'}">${isPOS ? 'POS' : 'Online'}</span></td>
          <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
          <td><strong>${curr()}${totalNum.toFixed(2)}</strong></td>
          <td>${o.paymentMethod || 'Cash'}</td>
          <td><span class="status-badge ${(o.status || 'pending').toLowerCase()}">${o.status}</span></td>
          <td>
            <div class="table-actions-cell">
              <select class="status-select-sm staff-order-status-sel" data-id="${o.id}">
                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
                <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
              <button class="btn-sm btn-outline btn-view-order" data-id="${o.id}">View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Status change dropdown handler
    tableBody.querySelectorAll('.staff-order-status-sel').forEach(select => {
      select.addEventListener('change', async () => {
        const orderId = select.getAttribute('data-id');
        const newStatus = select.value;
        const res = await window.API.updateOrderStatus(orderId, newStatus);
        if (res && res.status === 'success') {
          showToast(`Order ${orderId} updated to ${newStatus}.`);
          const ord = orders.find(o => o.id === orderId);
          if (ord) ord.status = newStatus;
          renderStaffOrdersUI();
        } else {
          showToast('Failed to update status.', 'error');
        }
      });
    });

    // View Order Details button handler
    tableBody.querySelectorAll('.btn-view-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-id');
        const ord = orders.find(o => o.id === orderId);
        if (ord) openOrderDetailsModal(ord);
      });
    });
  };

  document.getElementById('staff-order-search')?.addEventListener('input', (e) => {
    staffOrderSearch = e.target.value;
    renderStaffOrdersUI();
  });

  document.querySelectorAll('.status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      staffOrderStatusFilter = tab.getAttribute('data-status');
      renderStaffOrdersUI();
    });
  });

  // ORDER DETAILS MODAL
  const orderDetailsModal = document.getElementById('order-details-modal');
  const btnCloseOrderDetails = document.getElementById('btn-close-order-details-modal');

  const openOrderDetailsModal = (order) => {
    const titleEl = document.getElementById('detail-modal-order-id');
    if (titleEl) titleEl.textContent = `Order ${order.id}`;
    
    const badge = document.getElementById('detail-modal-status-badge');
    if (badge) {
      badge.className = `status-badge ${(order.status || 'pending').toLowerCase()}`;
      badge.textContent = order.status;
    }

    const body = document.getElementById('order-details-body');
    const totalNum = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
    const subtotalNum = typeof order.subtotal === 'number' ? order.subtotal : parseFloat(order.subtotal) || 0;
    const discountNum = typeof order.discount === 'number' ? order.discount : parseFloat(order.discount) || 0;
    const taxNum = typeof order.tax === 'number' ? order.tax : parseFloat(order.tax) || 0;

    if (body) {
      body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <span style="font-size:0.75rem; color: var(--color-text-muted); font-weight:700; text-transform:uppercase;">Customer Details</span>
            <h4 style="margin: 4px 0 2px;">${order.customerName || 'Walk-in Customer'}</h4>
            <span style="font-size:0.85rem; color: var(--color-text-muted);">Channel: ${order.channel}</span>
          </div>
          <div>
            <span style="font-size:0.75rem; color: var(--color-text-muted); font-weight:700; text-transform:uppercase;">Order Metadata</span>
            <p style="margin: 4px 0 0; font-size:0.85rem;">Date: ${order.date}</p>
            <p style="margin: 2px 0 0; font-size:0.85rem;">Payment Method: <strong>${order.paymentMethod || 'Cash'}</strong></p>
          </div>
        </div>

        <h4 style="margin-bottom: 10px;">Itemized Purchase</h4>
        <div style="border: 1px solid rgba(139,90,43,0.15); border-radius: 8px; overflow:hidden; margin-bottom: 20px;">
          <table class="orders-table" style="margin:0;">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Options / Notes</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(i => `
                <tr>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.customizations || 'Standard'}</td>
                  <td>${i.qty}</td>
                  <td>${curr()}${((i.price || 0) * (i.qty || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content: flex-end;">
          <div style="width: 240px;">
            <div class="billing-row"><span>Subtotal:</span><span>${curr()}${subtotalNum.toFixed(2)}</span></div>
            <div class="billing-row discount-row"><span>Discount:</span><span>-${curr()}${discountNum.toFixed(2)}</span></div>
            <div class="billing-row"><span>Sales Tax:</span><span>${curr()}${taxNum.toFixed(2)}</span></div>
            <div class="billing-divider"></div>
            <div class="billing-row total-row"><span>Total:</span><span>${curr()}${totalNum.toFixed(2)}</span></div>
          </div>
        </div>
      `;
    }

    orderDetailsModal?.classList.add('active');
  };

  btnCloseOrderDetails?.addEventListener('click', () => {
    orderDetailsModal?.classList.remove('active');
  });


  // ==========================================================================
  // 5. CUSTOMERS DIRECTORY & MANAGEMENT
  // ==========================================================================

  let staffCustomerSearch = '';

  const renderStaffCustomersUI = () => {
    const grid = document.getElementById('staff-customers-grid');
    if (!grid) return;

    let filtered = customers.filter(c => 
      c.name.toLowerCase().includes(staffCustomerSearch.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(staffCustomerSearch.toLowerCase())) || 
      (c.phone && c.phone.includes(staffCustomerSearch)) || 
      (c.tier && c.tier.toLowerCase().includes(staffCustomerSearch.toLowerCase()))
    );

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
          No customer profiles found.
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(c => `
      <div class="customer-card">
        <div class="cust-card-top">
          <div class="cust-avatar-large">
            ${(c.name || 'C').split(' ').map(n=>n[0]).join('')}
          </div>
          <div class="cust-card-details">
            <h4 class="cust-card-name">${c.name}</h4>
            <span class="cust-card-contact">${c.email || ''}</span>
            <span class="cust-card-contact">${c.phone || ''}</span>
            <span class="tier-badge ${(c.tier || 'standard').toLowerCase().split(' ')[0]}">${c.tier || 'Standard Member'}</span>
          </div>
        </div>

        <div class="cust-card-stats">
          <div class="stat-item">
            <span class="stat-lbl">Points</span>
            <span class="stat-val">${c.points || 0}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Spent</span>
            <span class="stat-val">${curr()}${(c.totalSpend || 0).toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-lbl">Orders</span>
            <span class="stat-val">${c.totalOrders || 0}</span>
          </div>
        </div>

        <div class="cust-card-actions">
          <button class="btn btn-outline btn-pos-select" data-id="${c.id}">Select for POS</button>
          <button class="btn-sm btn-outline btn-cust-history" data-id="${c.id}">History</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-pos-select').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-id');
        const cust = customers.find(c => c.id === cId);
        if (cust) {
          switchSection('pos');
          setPOSCustomer(cust);
          showToast(`Loaded ${cust.name} into POS terminal!`);
        }
      });
    });

    grid.querySelectorAll('.btn-cust-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-id');
        const cust = customers.find(c => c.id === cId);
        if (cust) openCustomerHistoryModal(cust);
      });
    });
  };

  document.getElementById('staff-customer-search')?.addEventListener('input', (e) => {
    staffCustomerSearch = e.target.value;
    renderStaffCustomersUI();
  });

  // ADD NEW CUSTOMER MODAL
  const addCustModal = document.getElementById('add-customer-modal');
  const btnOpenAddCust = document.getElementById('btn-open-add-customer');
  const btnCloseAddCust = document.getElementById('btn-close-add-cust-modal');
  const btnCancelAddCust = document.getElementById('btn-cancel-add-cust');
  const addCustForm = document.getElementById('add-customer-form');

  btnOpenAddCust?.addEventListener('click', () => {
    addCustForm?.reset();
    addCustModal?.classList.add('active');
  });

  btnCloseAddCust?.addEventListener('click', () => addCustModal?.classList.remove('active'));
  btnCancelAddCust?.addEventListener('click', () => addCustModal?.classList.remove('active'));

  addCustForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-cust-name')?.value.trim();
    const email = document.getElementById('new-cust-email')?.value.trim();
    const phone = document.getElementById('new-cust-phone')?.value.trim();
    const tier = document.getElementById('new-cust-tier')?.value;

    if (!name || !email) {
      showToast('Name and email are required.', 'error');
      return;
    }

    const res = await window.API.addCustomer({ name, email, phone, tier });
    if (res && res.status === 'success') {
      const updatedCusts = await window.API.getCustomers();
      if (updatedCusts) customers = updatedCusts;
      renderStaffCustomersUI();
      addCustModal?.classList.remove('active');
      showToast(`Successfully registered new customer ${name}!`, 'success');
    } else {
      showToast(res && res.message ? res.message : 'Error creating customer account.', 'error');
    }
  });

  // CUSTOMER HISTORY MODAL
  const custHistoryModal = document.getElementById('customer-history-modal');
  const btnCloseCustHistory = document.getElementById('btn-close-cust-history-modal');

  const openCustomerHistoryModal = (cust) => {
    const nameHeader = document.getElementById('cust-history-modal-name');
    const subHeader = document.getElementById('cust-history-modal-sub');
    if (nameHeader) nameHeader.textContent = `${cust.name}'s Order History`;
    if (subHeader) subHeader.textContent = `${cust.tier || 'Standard Member'} • Total Spend: ${curr()}${(cust.totalSpend || 0).toFixed(2)} • Points: ${cust.points || 0}`;

    const body = document.getElementById('cust-history-modal-body');
    const custOrders = orders.filter(o => o.customerId === cust.id || o.customerName === cust.name);

    if (body) {
      if (custOrders.length === 0) {
        body.innerHTML = `<p style="text-align:center; padding: 20px; color: var(--color-text-muted);">No order history found for this member.</p>`;
      } else {
        body.innerHTML = `
          <table class="orders-table" style="width:100%;">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Purchased Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${custOrders.map(o => {
                const totalNum = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.date}</td>
                    <td>${(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                    <td><strong>${curr()}${totalNum.toFixed(2)}</strong></td>
                    <td><span class="status-badge ${(o.status || 'pending').toLowerCase()}">${o.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    custHistoryModal?.classList.add('active');
  };

  btnCloseCustHistory?.addEventListener('click', () => {
    custHistoryModal?.classList.remove('active');
  });


  // ==========================================================================
  // 6. STAFF PRODUCTS CATALOG LOGIC (AVAILABILITY MANAGER)
  // ==========================================================================

  let staffCatalogSearch = '';
  let staffCatalogCategory = 'all';

  const renderStaffCatalogUI = () => {
    const grid = document.getElementById('staff-products-catalog-grid');
    if (!grid) return;

    let filtered = products.filter(p => {
      const matchesCategory = staffCatalogCategory === 'all' || p.category.toLowerCase() === staffCatalogCategory.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(staffCatalogSearch.toLowerCase()) || 
                            (p.desc && p.desc.toLowerCase().includes(staffCatalogSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
          No menu items found.
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isAvailable = p.inStock && (p.stock === undefined || p.stock > 0);
      const hasImg = Boolean(p.image && p.image.trim() !== '');
      const imgHTML = hasImg
        ? `<div class="pos-card-img" style="overflow:hidden;"><img src="${p.image}" class="pos-real-img" alt="${p.name}"></div>`
        : `<div class="pos-card-img">${categoryIcons[p.category] || categoryIcons['Coffee']}</div>`;

      return `
        <div class="staff-catalog-card">
          <div class="pos-card-top">
            ${imgHTML}
            <div class="pos-card-details">
              <span class="pos-card-category">${p.category}</span>
              <h4 class="pos-card-title">${p.name}</h4>
              <p style="font-size:0.75rem; color: var(--color-text-muted); margin-top:2px;">${p.desc || ''}</p>
              ${p.stock !== undefined ? `<span style="font-size:0.75rem; color:var(--color-accent); font-weight:600;">Stock: ${p.stock} units</span>` : ''}
            </div>
          </div>

          <div class="pos-card-bottom" style="margin-top: 14px;">
            <span class="pos-card-price">${curr()}${parseFloat(p.price).toFixed(2)}</span>
            <button class="stock-toggle-btn ${isAvailable ? 'btn-in-stock' : 'btn-out-stock'}" data-id="${p.id}">
              ${isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.stock-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pId = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === pId);
        if (prod) {
          const res = await window.API.toggleProductStock(pId);
          if (res && res.status === 'success') {
            const updatedProds = await window.API.getProducts();
            if (updatedProds) products = updatedProds;
            renderStaffCatalogUI();
            renderPOSProducts();
            showToast(`${prod.name} availability toggled.`);
          }
        }
      });
    });
  };

  document.getElementById('staff-product-search')?.addEventListener('input', (e) => {
    staffCatalogSearch = e.target.value;
    renderStaffCatalogUI();
  });

  const staffCatRow = document.getElementById('staff-catalog-category-row');
  if (staffCatRow) {
    staffCatRow.addEventListener('click', (e) => {
      const capsule = e.target.closest('.capsule');
      if (!capsule) return;
      staffCatRow.querySelectorAll('.capsule').forEach(c => c.classList.remove('active'));
      capsule.classList.add('active');
      staffCatalogCategory = capsule.getAttribute('data-category');
      renderStaffCatalogUI();
    });
  }


  // ==========================================================================
  // 7. INITIALIZATION & REAL-TIME SYNC
  // ==========================================================================

  // Sync staff user session name
  const sessionUser = JSON.parse(localStorage.getItem('tgd_current_user') || localStorage.getItem('dailygrind_current_user') || sessionStorage.getItem('tgd_current_user'));
  if (sessionUser && sessionUser.name) {
    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = sessionUser.name;
    const roleEl = document.querySelector('.user-role');
    if (roleEl) roleEl.textContent = sessionUser.role === 'admin' ? 'Store Administrator' : 'Barista / Cashier';
  }

  await loadAllData();

  renderCategoryCapsules();
  renderPOSProducts();
  renderPOSCartUI();
  renderStaffOrdersUI();
  renderStaffCustomersUI();
  renderStaffCatalogUI();

  // Supabase Realtime instantaneous listeners
  if (window.CoffeeRealtime) {
    window.CoffeeRealtime.on('order_created', async () => {
      await loadAllData();
      renderStaffOrdersUI();
      showToast('🔔 New order received on POS!', 'info');
    });

    window.CoffeeRealtime.on('order_status_updated', async () => {
      await loadAllData();
      renderStaffOrdersUI();
    });

    window.CoffeeRealtime.on('product_updated', async () => {
      await loadAllData();
      renderCategoryCapsules();
      const activeSection = document.querySelector('.content-section.active');
      if (activeSection && activeSection.id === 'sect-pos') renderPOSProducts();
      else if (activeSection && activeSection.id === 'sect-products') renderStaffCatalogUI();
    });
  }

  // Polling every 4s for live incoming online customer orders, product/category changes
  setInterval(async () => {
    await loadAllData();
    renderCategoryCapsules();
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
      if (activeSection.id === 'sect-pos') {
        renderPOSProducts();
      } else if (activeSection.id === 'sect-orders') {
        renderStaffOrdersUI();
      } else if (activeSection.id === 'sect-products') {
        renderStaffCatalogUI();
      }
    }
  }, 10000);


});
