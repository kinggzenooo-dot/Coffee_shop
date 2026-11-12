/**
 * The Daily Grind Coffee Shop - Customer Portal Logic
 * Fully integrated with Python Flask API via api_client.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Vector SVG definitions
  const categoryIcons = {
    Coffee: `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
        <line x1="6" y1="2" x2="6" y2="4"/>
        <line x1="10" y1="2" x2="10" y2="4"/>
        <line x1="14" y1="2" x2="14" y2="4"/>
      </svg>`,
    'Non-Coffee': `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 22H6L4 6h16l-2 16z" />
        <path d="M14 2L8 6" />
        <path d="M4 6h16" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="8" y1="15" x2="16" y2="15" />
      </svg>`,
    Tea: `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8h1a3 3 0 0 1 0 6h-1" />
        <path d="M2 8h16v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8z" />
        <path d="M6 2c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1z" />
      </svg>`,
    Pastries: `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 14c2.5-3.5 6-5.5 9-5.5s6.5 2 9 5.5c-3.5 1-6.5 1.5-9 1.5s-5.5-.5-9-1.5z" />
        <path d="M7 11.5c1.5-1.5 3-2.5 5-2.5s3.5 1 5 2.5" />
        <path d="M10 9.5c.5-.5 1-.5 2-.5s1.5 0 2 .5" />
      </svg>`,
    Snacks: `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3c-4 0-7 2-7 6 0 1 0 2.5 1 3.5L5 20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-1-7.5c1-1 1-2.5 1-3.5 0-4-3-6-7-6z" />
        <path d="M8 8c1-1 2-1 4-1s3 0 4 1" />
      </svg>`,
    Desserts: `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 19h20M2 19V11c3-2 6-3 10-3s7 1 10 3v8" />
        <path d="M12 8V4M10 4h4" />
        <path d="M2 14c4 1 8-1 12 0s6-1 8 0" />
      </svg>`,
    'Add-ons': `
      <svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14" />
        <circle cx="12" cy="12" r="9" stroke-dasharray="3 3" />
      </svg>`
  };

  // State
  let currentUser = JSON.parse(
    localStorage.getItem('tgd_current_user') || 
    localStorage.getItem('dailygrind_current_user') || 
    sessionStorage.getItem('tgd_current_user')
  ) || {
    id: 'c1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 234-5678',
    address: '123 Espresso Lane, NY 10001',
    tier: 'Gold Member',
    points: 420
  };

  let products = [];
  let categories = [];
  let cart = [];
  let activeOrders = [];
  let pastOrders = [];
  let settings = {
    shop_name: 'The Daily Grind Coffee Shop',
    currency: '$',
    tax_rate: 8.0
  };

  const getTaxMultiplier = () => {
    const rate = parseFloat(settings.tax_rate) || 8.0;
    return rate > 1 ? rate / 100 : rate;
  };

  const curr = () => settings.currency || '$';

  const loadAllCustomerData = async () => {
    try {
      const [prods, cats, ords, sets, custs] = await Promise.all([
        window.API.getProducts(),
        window.API.getCategories(),
        window.API.getOrders(),
        window.API.getSettings(),
        window.API.getCustomers()
      ]);

      if (Array.isArray(prods)) products = prods;
      if (Array.isArray(cats)) categories = cats;
      if (sets && typeof sets === 'object') settings = { ...settings, ...sets };

      // Update current user points & tier if found in latest customer list
      if (Array.isArray(custs) && currentUser) {
        const freshUser = custs.find(c => c.id === currentUser.id || (c.email && c.email.toLowerCase() === (currentUser.email || '').toLowerCase()));
        if (freshUser) {
          currentUser = { ...currentUser, ...freshUser };
          localStorage.setItem('tgd_current_user', JSON.stringify(currentUser));
          localStorage.setItem('dailygrind_current_user', JSON.stringify(currentUser));
        }
      }

      if (Array.isArray(ords)) {
        const userOrders = ords.filter(o => 
          (currentUser.id && o.customerId === currentUser.id) || 
          (currentUser.name && o.customerName === currentUser.name) ||
          (currentUser.email && o.customerEmail === currentUser.email)
        );
        activeOrders = userOrders.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status));
        pastOrders = userOrders.filter(o => ['Completed', 'Cancelled'].includes(o.status));
      }
    } catch (e) {
      console.warn('Error loading customer portal data:', e);
    }
  };

  // 3. NAVIGATION & ROUTING
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  const sectionTitle = document.getElementById('section-title');

  const titleMappings = {
    home: 'Overview',
    menu: 'Menu',
    cart: 'Selected Products',
    orders: 'My Orders',
    profile: 'Profile'
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

    if (sectionTitle) sectionTitle.textContent = titleMappings[target] || 'Dashboard';
    
    // Refresh lists upon navigation
    if (target === 'home') renderHomeProducts();
    if (target === 'menu') renderMenuGrid();
    if (target === 'cart') renderCartUI();
    if (target === 'orders') {
      renderOrdersUI();
      renderPastOrdersTable();
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) switchSection(target);
    });
  });


  // 4. TOAST NOTIFICATIONS
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const svgIcon = type === 'success' ? 
      `<svg class="toast-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : 
      `<svg class="toast-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    toast.innerHTML = `<span class="toast-icon-wrapper">${svgIcon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };


  // 5. DYNAMIC HOME PAGE RENDER (Featured & Popular Products)
  const renderHomeProducts = () => {
    const featuredGrid = document.getElementById('home-featured-grid');
    const popularGrid = document.getElementById('home-popular-grid');
    if (!featuredGrid || !popularGrid) return;
    
    featuredGrid.innerHTML = '';
    popularGrid.innerHTML = '';

    if (products.length === 0) {
      featuredGrid.innerHTML = `<p style="color:var(--color-text-muted); grid-column:1/-1;">No products found in catalog.</p>`;
      return;
    }

    const featuredItems = products.slice(0, 4);
    const popularItems = products.length > 4 ? products.slice(4, 8) : products.slice(0, 4);

    const createProductCard = (p) => {
      const card = document.createElement('div');
      card.className = 'menu-card';
      const vectorIcon = categoryIcons[p.category] || categoryIcons['Coffee'];
      const isAvailable = p.inStock && (p.stock === undefined || p.stock > 0);
      const hasImg = Boolean(p.image && p.image.trim() !== '');
      const imgHTML = hasImg
        ? `<div class="menu-img-placeholder" style="padding:0; overflow:hidden;"><img src="${p.image}" class="menu-card-real-img" alt="${p.name}"></div>`
        : `<div class="menu-img-placeholder">${vectorIcon}</div>`;

      card.innerHTML = `
        ${imgHTML}
        <div class="menu-info">
          <div class="card-meta">
            <span class="category-tag">${p.category}</span>
            ${!isAvailable ? '<span class="stock-tag out-stock" style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:rgba(239,68,68,0.15); color:#ef4444; font-weight:600;">Out of Stock</span>' : ''}
          </div>
          <h4>${p.name}</h4>
          <p>${p.desc || ''}</p>
          <div class="menu-action-row">
            <span class="price">${curr()}${parseFloat(p.price).toFixed(2)}</span>
            <button class="btn btn-primary btn-sm btn-open-custom" data-id="${p.id}" ${!isAvailable ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              ${isAvailable ? 'Order' : 'Unavailable'}
            </button>
          </div>
        </div>
      `;
      return card;
    };

    featuredItems.forEach(p => featuredGrid.appendChild(createProductCard(p)));
    popularItems.forEach(p => popularGrid.appendChild(createProductCard(p)));

    // Bind click handlers to modal triggers
    document.querySelectorAll('.btn-open-custom').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openCustomizationModal(id);
      });
    });
  };

  document.getElementById('btn-quick-order')?.addEventListener('click', () => switchSection('menu'));
  document.getElementById('link-go-to-menu')?.addEventListener('click', () => switchSection('menu'));


  // 6. DYNAMIC MENU PAGE RENDER (Filters & Search)
  let activeCategory = 'all';
  let searchQuery = '';

  const renderCategoryFilterCapsules = () => {
    const container = document.getElementById('category-capsule-row');
    if (!container) return;

    const catList = categories.length > 0 
      ? categories.map(c => typeof c === 'string' ? c : c.name)
      : ['Coffee', 'Non-Coffee', 'Tea', 'Pastries', 'Snacks', 'Desserts', 'Add-ons'];

    let html = `<button class="capsule ${activeCategory === 'all' ? 'active' : ''}" data-category="all">All Items</button>`;
    catList.forEach(c => {
      html += `<button class="capsule ${activeCategory.toLowerCase() === c.toLowerCase() ? 'active' : ''}" data-category="${c}">${c}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.capsule').forEach(capsule => {
      capsule.addEventListener('click', () => {
        container.querySelectorAll('.capsule').forEach(c => c.classList.remove('active'));
        capsule.classList.add('active');
        activeCategory = capsule.getAttribute('data-category');
        renderMenuGrid();
      });
    });
  };

  const renderMenuGrid = () => {
    const grid = document.getElementById('menu-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = products.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.desc && p.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-muted);">
          <p>No products found matching "${searchQuery}" in ${activeCategory === 'all' ? 'all categories' : activeCategory}.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'menu-card';
      const vectorIcon = categoryIcons[p.category] || categoryIcons['Coffee'];
      const isAvailable = p.inStock && (p.stock === undefined || p.stock > 0);
      const hasImg = Boolean(p.image && p.image.trim() !== '');
      const imgHTML = hasImg
        ? `<div class="menu-img-placeholder" style="padding:0; overflow:hidden;"><img src="${p.image}" class="menu-card-real-img" alt="${p.name}"></div>`
        : `<div class="menu-img-placeholder">${vectorIcon}</div>`;

      card.innerHTML = `
        ${imgHTML}
        <div class="menu-info">
          <div class="card-title-row">
            <h4>${p.name}</h4>
            <span class="category-tag">${p.category}</span>
          </div>
          <p>${p.desc || ''}</p>
          <div class="menu-action-row">
            <span class="price">${curr()}${parseFloat(p.price).toFixed(2)}</span>
            <button class="btn btn-primary btn-sm btn-menu-order" data-id="${p.id}" ${!isAvailable ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              ${isAvailable ? 'Order' : 'Out of Stock'}
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Rebind button click events
    grid.querySelectorAll('.btn-menu-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openCustomizationModal(id);
      });
    });
  };

  // Search input change
  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMenuGrid();
    });
  }


  // 7. PRODUCT DETAILS & CUSTOMIZATION MODAL LOGIC
  const modal = document.getElementById('product-modal');
  const modalTitle = document.getElementById('modal-product-title');
  const modalDesc = document.getElementById('modal-product-desc');
  const modalPrice = document.getElementById('modal-product-price');
  const modalImgWrapper = document.getElementById('modal-product-img-wrapper');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnAddToOrder = document.getElementById('btn-modal-add-to-cart');
  const customForm = document.getElementById('customization-form');
  
  const milkGroup = document.getElementById('modal-milk-group');
  const sweetnessGroup = document.getElementById('modal-sweetness-group');

  let selectedProduct = null;
  let currentProductBasePrice = 0;

  const openCustomizationModal = (productId) => {
    selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;

    currentProductBasePrice = parseFloat(selectedProduct.price);

    // Reset Form to defaults
    if (customForm) customForm.reset();

    // Populate data
    if (modalTitle) modalTitle.textContent = selectedProduct.name;
    if (modalDesc) modalDesc.textContent = selectedProduct.desc || '';
    
    // Set matching photo or vector SVG
    if (modalImgWrapper) {
      if (selectedProduct.image && selectedProduct.image.trim() !== '') {
        modalImgWrapper.innerHTML = `<img src="${selectedProduct.image}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;" alt="${selectedProduct.name}">`;
      } else {
        modalImgWrapper.innerHTML = categoryIcons[selectedProduct.category] || categoryIcons['Coffee'];
      }
    }
    
    // Toggle sub-groups conditionally based on category properties
    if (milkGroup) milkGroup.style.display = selectedProduct.hasMilk ? 'block' : 'none';
    if (sweetnessGroup) sweetnessGroup.style.display = selectedProduct.hasSweetness ? 'block' : 'none';

    updateModalPrice();
    if (modal) modal.style.display = 'flex';
  };

  const updateModalPrice = () => {
    if (!selectedProduct || !customForm) return;
    let extraPrice = 0;

    // Calculate Size adjustment
    const selectedSize = customForm.querySelector('input[name="size"]:checked');
    if (selectedSize) {
      extraPrice += parseFloat(selectedSize.getAttribute('data-add') || 0);
    }

    // Calculate Milk adjustment (if group is visible)
    if (selectedProduct.hasMilk) {
      const selectedMilk = customForm.querySelector('input[name="milk"]:checked');
      if (selectedMilk) {
        extraPrice += parseFloat(selectedMilk.getAttribute('data-add') || 0);
      }
    }

    const currentTotal = currentProductBasePrice + extraPrice;
    if (modalPrice) modalPrice.textContent = `${curr()}${currentTotal.toFixed(2)}`;
  };

  // Re-calculate price on option changes
  customForm?.addEventListener('change', updateModalPrice);

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    selectedProduct = null;
  };

  btnCloseModal?.addEventListener('click', closeModal);
  
  // Close on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Modal Add to Order button
  btnAddToOrder?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!selectedProduct || !customForm) return;

    const sizeInput = customForm.querySelector('input[name="size"]:checked');
    const sizeVal = sizeInput ? sizeInput.value : 'Regular';
    
    let customizations = [sizeVal];
    let extraCost = 0;

    if (sizeInput) extraCost += parseFloat(sizeInput.getAttribute('data-add') || 0);

    if (selectedProduct.hasMilk) {
      const milkInput = customForm.querySelector('input[name="milk"]:checked');
      const milkVal = milkInput ? milkInput.value : 'Whole Milk';
      customizations.push(milkVal);
      if (milkInput) extraCost += parseFloat(milkInput.getAttribute('data-add') || 0);
    }

    if (selectedProduct.hasSweetness) {
      const sweetnessInput = customForm.querySelector('input[name="sweetness"]:checked');
      const sweetnessVal = sweetnessInput ? sweetnessInput.value : 'Normal';
      customizations.push(sweetnessVal);
    }

    const finalUnitPrice = parseFloat(selectedProduct.price) + extraCost;
    const descText = customizations.join(', ');

    // Push or increment quantity in cart
    const existingIndex = cart.findIndex(c => c.id === selectedProduct.id && c.desc === descText);
    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: finalUnitPrice,
        qty: 1,
        desc: descText
      });
    }

    showToast(`Added ${selectedProduct.name} (${descText}) to cart!`, 'success');
    closeModal();
    updateCartBadge();
  });

  const updateCartBadge = () => {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountEl.textContent = totalQty;
    cartCountEl.style.display = totalQty > 0 ? 'flex' : 'none';
  };


  // 8. CART & CHECKOUT PAGE
  const renderCartUI = () => {
    const listContainer = document.getElementById('cart-list-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');

    if (!listContainer) return;

    if (cart.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-cart-message">
          <p>Your shopping cart is currently empty.</p>
          <button class="btn btn-outline-brown btn-sm" style="margin-top: 15px;" id="btn-browse-cart-empty">Browse Products</button>
        </div>
      `;
      document.getElementById('btn-browse-cart-empty')?.addEventListener('click', () => switchSection('menu'));
      if (subtotalEl) subtotalEl.textContent = `${curr()}0.00`;
      if (discountEl) discountEl.textContent = `-${curr()}0.00`;
      if (taxEl) taxEl.textContent = `${curr()}0.00`;
      if (totalEl) totalEl.textContent = `${curr()}0.00`;
      return;
    }

    listContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      subtotal += itemTotal;

      const card = document.createElement('div');
      card.className = 'cart-item';
      card.innerHTML = `
        <div class="item-desc">
          <h4>${item.name}</h4>
          <p class="cart-customization">${item.desc}</p>
        </div>
        <div class="qty-control">
          <button class="qty-btn minus" data-idx="${index}">-</button>
          <span class="qty">${item.qty}</span>
          <button class="qty-btn plus" data-idx="${index}">+</button>
        </div>
        <span class="item-price">${curr()}${itemTotal.toFixed(2)}</span>
      `;
      listContainer.appendChild(card);
    });

    let discountRate = 0;
    if (currentUser.tier === 'Platinum Member') discountRate = 0.15;
    else if (currentUser.tier === 'Gold Member') discountRate = 0.10;
    else if (currentUser.tier === 'Silver Member') discountRate = 0.05;

    const discountAmt = subtotal * discountRate;
    const taxableSubtotal = subtotal - discountAmt;
    const taxMultiplier = getTaxMultiplier();
    const tax = taxableSubtotal * taxMultiplier;
    const finalTotal = taxableSubtotal + tax;

    if (subtotalEl) subtotalEl.textContent = `${curr()}${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-${curr()}${discountAmt.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `${curr()}${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${curr()}${Math.max(0, finalTotal).toFixed(2)}`;

    listContainer.querySelectorAll('.qty-btn.plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        cart[idx].qty += 1;
        renderCartUI();
        updateCartBadge();
      });
    });

    listContainer.querySelectorAll('.qty-btn.minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (cart[idx].qty > 1) {
          cart[idx].qty -= 1;
        } else {
          cart.splice(idx, 1);
        }
        renderCartUI();
        updateCartBadge();
      });
    });
  };

  const checkoutBtn = document.getElementById('btn-checkout');
  checkoutBtn?.addEventListener('click', async () => {
    if (cart.length === 0) {
      showToast('Cannot checkout an empty cart.', 'error');
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Submitting order...';
    showToast('Sending order to coffee bar...', 'success');

    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let discountRate = currentUser.tier === 'Platinum Member' ? 0.15 : currentUser.tier === 'Gold Member' ? 0.10 : currentUser.tier === 'Silver Member' ? 0.05 : 0;
    let discount = subtotal * discountRate;
    let tax = (subtotal - discount) * getTaxMultiplier();
    let total = subtotal - discount + tax;

    const orderPayload = {
      customerName: currentUser.name || 'Customer',
      customerId: currentUser.id,
      channel: 'Online Portal',
      items: cart.map(i => ({ name: i.name, qty: i.qty, customizations: i.desc, price: i.price })),
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      paymentMethod: 'Credit Card',
      cashTendered: total,
      changeDue: 0,
      status: settings.default_status || 'Preparing'
    };

    const res = await window.API.createOrder(orderPayload);
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Checkout Order';

    if (res && res.status === 'success') {
      cart = [];
      updateCartBadge();
      renderCartUI();
      showToast(`Order ${res.order_id} placed successfully!`, 'success');

      await loadAllCustomerData();
      syncUserUI();
      switchSection('orders');
    } else {
      showToast(res?.message || 'Error placing order. Please try again.', 'error');
    }
  });

  // Orders Views Tabs
  const btnTabActive = document.getElementById('btn-tab-active-orders');
  const btnTabHistory = document.getElementById('btn-tab-order-history');
  const viewActive = document.getElementById('active-orders-view');
  const viewHistory = document.getElementById('history-orders-view');

  btnTabActive?.addEventListener('click', () => {
    btnTabActive.classList.add('active');
    btnTabHistory.classList.remove('active');
    viewActive.classList.add('active');
    viewHistory.classList.remove('active');
  });

  btnTabHistory?.addEventListener('click', () => {
    btnTabHistory.classList.add('active');
    btnTabActive.classList.remove('active');
    viewHistory.classList.add('active');
    viewActive.classList.remove('active');
    renderPastOrdersTable();
  });

  const renderOrdersUI = () => {
    const activeList = document.getElementById('active-orders-list');
    if (!activeList) return;
    activeList.innerHTML = '';

    if (activeOrders.length === 0) {
      activeList.innerHTML = `
        <div class="empty-orders-message">
          <p>No active orders at the moment.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 15px;" id="btn-order-now">Browse Menu</button>
        </div>
      `;
      document.getElementById('btn-order-now')?.addEventListener('click', () => switchSection('menu'));
      return;
    }

    activeOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'active-order-card';
      
      const statusSteps = ['Pending', 'Preparing', 'Ready', 'Completed'];
      const currentIndex = statusSteps.indexOf(order.status);
      
      let stepHtml = '';
      statusSteps.forEach((step, idx) => {
        let stepClass = 'step-node';
        if (idx < currentIndex) stepClass += ' completed';
        if (idx === currentIndex) stepClass += ' current';
        if (order.status === 'Cancelled') stepClass = 'step-node cancelled';
        stepHtml += `
          <div class="${stepClass}">
            <div class="node-bullet"></div>
            <span class="node-label">${step}</span>
          </div>
        `;
      });

      const itemsSummaryList = (order.items || []).map(item => `
        <div class="card-item-row">
          <span>${item.qty}x ${item.name} <small class="customization-summary">(${item.customizations || ''})</small></span>
          <span>${curr()}${((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
        </div>
      `).join('');

      const totalVal = typeof order.total === 'number' ? order.total.toFixed(2) : parseFloat(order.total || 0).toFixed(2);

      card.innerHTML = `
        <div class="order-card-header">
          <div class="header-left">
            <span class="card-order-id">${order.id}</span>
            <span class="order-date-label">${order.date}</span>
          </div>
          <div class="header-right">
            <span class="status-pill status-${(order.status || 'pending').toLowerCase()}">${order.status}</span>
          </div>
        </div>
        <div class="order-card-items">
          ${itemsSummaryList}
        </div>
        <div class="order-card-progress">
          <div class="progress-bar-line">
            <div class="progress-line-filled" style="width: ${Math.max(0, (currentIndex / (statusSteps.length - 1)) * 100)}%"></div>
          </div>
          <div class="progress-nodes">
            ${stepHtml}
          </div>
        </div>
        <div class="order-card-footer">
          <span class="total-label">Total Amount: <strong class="total-amt">${curr()}${totalVal}</strong></span>
          ${order.status === 'Pending' ? `<button class="btn btn-outline-brown btn-sm btn-cancel-order" data-id="${order.id}">Cancel Order</button>` : ''}
        </div>
      `;
      activeList.appendChild(card);
    });

    document.querySelectorAll('.btn-cancel-order').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const res = await window.API.updateOrderStatus(id, 'Cancelled');
        if (res && res.status === 'success') {
          showToast(`Order ${id} cancelled.`, 'error');
          await loadAllCustomerData();
          renderOrdersUI();
          renderPastOrdersTable();
        }
      });
    });
  };

  const renderPastOrdersTable = () => {
    const tableBody = document.getElementById('past-orders-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (pastOrders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No order history found.</td></tr>`;
      return;
    }

    pastOrders.forEach(o => {
      const row = document.createElement('tr');
      const itemsSummary = (o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
      const totalNum = typeof o.total === 'number' ? o.total : parseFloat(o.total || 0);

      row.innerHTML = `
        <td class="order-id">${o.id}</td>
        <td>${o.date}</td>
        <td>${itemsSummary}</td>
        <td>${curr()}${totalNum.toFixed(2)}</td>
        <td><span class="status-pill status-${(o.status || 'completed').toLowerCase()}">${o.status}</span></td>
        <td><button class="btn btn-text btn-sm-action btn-reorder-past" data-id="${o.id}">Reorder</button></td>
      `;
      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('.btn-reorder-past').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const order = pastOrders.find(o => o.id === id);
        if (order && order.items) {
          order.items.forEach(item => {
            const matchProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
            if (matchProd) {
              cart.push({
                id: matchProd.id,
                name: matchProd.name,
                price: parseFloat(matchProd.price),
                qty: item.qty || 1,
                desc: item.customizations || 'Regular, Standard'
              });
            }
          });
          updateCartBadge();
          switchSection('cart');
          showToast(`Added items from ${id} to your cart!`, 'success');
        }
      });
    });
  };

  // Sync user profile UI
  const syncUserUI = () => {
    const userShortcutName = document.querySelector('.user-name');
    const userTierEl = document.querySelector('.user-role');
    const profileCardName = document.getElementById('profile-card-name');
    const profileAvatar = document.querySelector('.profile-avatar-large');
    const sidebarAvatar = document.querySelector('.avatar');
    const pointsValEl = document.getElementById('user-points-val');

    if (userShortcutName) userShortcutName.textContent = currentUser.name || 'Member';
    if (userTierEl) userTierEl.textContent = currentUser.tier || 'Standard Member';
    if (profileCardName) profileCardName.textContent = currentUser.name || 'Member';
    if (pointsValEl) pointsValEl.textContent = `${currentUser.points || 0} pts`;

    const initials = (currentUser.name || 'DG').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (profileAvatar) profileAvatar.textContent = initials;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;

    // Profile form fields
    const nameInput = document.getElementById('prof-name');
    const emailInput = document.getElementById('prof-email');
    const phoneInput = document.getElementById('prof-phone');
    const addressInput = document.getElementById('prof-address');

    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
    if (addressInput) addressInput.value = currentUser.address || '';
  };

  // Profile Form update
  const profileForm = document.getElementById('profile-form');
  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name')?.value.trim();
    const phone = document.getElementById('prof-phone')?.value.trim();
    const address = document.getElementById('prof-address')?.value.trim();

    if (!name) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    showToast('Saving profile updates...', 'success');
    if (currentUser.id) {
      const res = await window.API.updateCustomer(currentUser.id, { name, phone, address });
      if (res && res.status === 'success' && res.user) {
        currentUser = { ...currentUser, ...res.user };
      } else {
        currentUser.name = name;
        currentUser.phone = phone;
        currentUser.address = address;
      }
    } else {
      currentUser.name = name;
      currentUser.phone = phone;
      currentUser.address = address;
    }

    localStorage.setItem('tgd_current_user', JSON.stringify(currentUser));
    localStorage.setItem('dailygrind_current_user', JSON.stringify(currentUser));
    syncUserUI();
    showToast('Account details successfully updated!', 'success');
  });

  // Logout
  const handleLogout = () => {
    showToast('Signing out... See you soon! ☕', 'success');
    setTimeout(() => {
      localStorage.removeItem('tgd_current_user');
      localStorage.removeItem('dailygrind_current_user');
      sessionStorage.removeItem('tgd_current_user');
      window.location.href = 'index.html';
    }, 800);
  };

  document.getElementById('btn-logout-sidebar')?.addEventListener('click', handleLogout);

  // Initialize
  await loadAllCustomerData();
  syncUserUI();
  renderCategoryFilterCapsules();
  renderHomeProducts();
  renderMenuGrid();
  renderOrdersUI();
  renderPastOrdersTable();

  // Poll data every 8s so dashboard products, images, categories, and orders update in real time
  setInterval(async () => {
    await loadAllCustomerData();
    renderCategoryFilterCapsules();
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
      if (activeSection.id === 'sect-home') renderHomeProducts();
      else if (activeSection.id === 'sect-menu') renderMenuGrid();
      else if (activeSection.id === 'sect-orders') {
        renderOrdersUI();
        renderPastOrdersTable();
      }
    }
  }, 8000);
});


