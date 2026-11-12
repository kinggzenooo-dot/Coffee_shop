/**
 * The Daily Grind Coffee Shop - API Client Integration
 * Syncs frontend interfaces (Customer, Staff POS, Admin) with the Python Flask Backend API.
 */

// Base API URL: dynamically uses current origin when served over HTTP/HTTPS, or falls back to localhost:5000
const API_BASE_URL = window.location.protocol.startsWith('http')
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:5000/api';

// Supabase Configuration from .env
const SUPABASE_CONFIG = {
  url: 'https://hkrvqmzadkkemamklqcw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcnZxbXphZGtrZW1hbWtscWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODg5MjMsImV4cCI6MjExMDA2NDkyM30.8z6WAegs9fo-UtVQYNveLlpFCmokEdD724Hljy6dztc'
};

let _supabaseClient = null;
let _realtimeChannel = null;

function getSupabase() {
  if (!_supabaseClient && window.supabase && window.supabase.createClient) {
    try {
      _supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      _realtimeChannel = _supabaseClient.channel('coffeeshop-realtime-channel', {
        config: { broadcast: { self: false } }
      });
      _realtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Connected to Supabase Realtime channel (coffeeshop-realtime-channel)');
        }
      });
    } catch (e) {
      console.warn('Supabase initialization error:', e);
    }
  }
  return _supabaseClient;
}

// Ensure Supabase client is initialized on script load
if (typeof window !== 'undefined') {
  if (window.supabase) {
    getSupabase();
  } else {
    window.addEventListener('load', () => getSupabase());
  }
}

// Global Realtime Event System using Supabase Broadcast
window.CoffeeRealtime = {
  broadcast(event, payload) {
    getSupabase();
    if (_realtimeChannel) {
      try {
        _realtimeChannel.send({
          type: 'broadcast',
          event: event,
          payload: payload
        });
      } catch (e) {
        console.warn('Realtime broadcast error:', e);
      }
    }
  },
  on(event, callback) {
    getSupabase();
    if (_realtimeChannel) {
      _realtimeChannel.on('broadcast', { event: event }, (msg) => {
        callback(msg.payload);
      });
    } else {
      // Retry when Supabase finishes connecting
      setTimeout(() => {
        getSupabase();
        if (_realtimeChannel) {
          _realtimeChannel.on('broadcast', { event: event }, (msg) => {
            callback(msg.payload);
          });
        }
      }, 500);
    }
  }
};

// Direct Supabase REST API helper (works anywhere without requiring external script loading)
async function sbFetch(endpoint, options = {}) {
  try {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    return await fetch(url, { ...options, headers });
  } catch (e) {
    console.warn('sbFetch network error:', e);
    return null;
  }
}

const API = {
  // Auth
  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Direct Supabase authentication (checks Supabase cloud database first)
    try {
      const res = await sbFetch(`users?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`);
      if (res && res.ok) {
        const users = await res.json();
        if (Array.isArray(users) && users.length > 0) {
          const user = users[0];
          if (user.password === password) {
            const userDict = { ...user };
            delete userDict.password;

            // Sync session to local backend in background
            fetch(`${API_BASE_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password })
            }).catch(() => {});

            return { status: 'success', user: userDict, message: 'Sign in successful!' };
          } else {
            return { status: 'error', message: 'Invalid password. Please try again.' };
          }
        }
      }
    } catch (sbErr) {
      console.warn('Supabase direct login check error:', sbErr);
    }

    // 2. Fallback to Flask backend server
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('API login error:', e);
    }

    return { status: 'error', message: 'Invalid email address or password.' };
  },

  async signup(name, email, password, role = 'customer') {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const newId = `u_${Math.random().toString(36).substring(2, 10)}`;
    const initialPoints = ['admin', 'staff', 'barista'].includes(role) ? 500 : 50;
    const initialTier = role === 'admin' ? 'Platinum Member' : (['staff', 'barista'].includes(role) ? 'Staff Member' : 'Standard Member');

    const newUserObj = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      password: password,
      role: role,
      tier: initialTier,
      points: initialPoints,
      total_spend: 0.0,
      total_orders: 0
    };

    let supabaseSuccess = false;

    // 1. Save directly into Supabase database
    try {
      // Check if email already exists in Supabase
      const checkRes = await sbFetch(`users?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`);
      if (checkRes && checkRes.ok) {
        const existing = await checkRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          return { status: 'error', message: 'An account with this email already exists.' };
        }
      }

      // Insert new user into Supabase users table
      const insertRes = await sbFetch('users', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(newUserObj)
      });

      if (insertRes && (insertRes.status === 201 || insertRes.ok)) {
        supabaseSuccess = true;

        // If employee role, also insert into Supabase staff_accounts table
        if (['barista', 'staff', 'admin'].includes(role)) {
          const station = role === 'barista' ? 'Espresso Bar' : (role === 'admin' ? 'Main Office' : 'Terminal #01');
          const title = role === 'barista' ? 'Barista' : (role === 'admin' ? 'Administrator' : 'Cashier / POS Staff');
          await sbFetch('staff_accounts', {
            method: 'POST',
            body: JSON.stringify({
              id: `st_${Math.random().toString(36).substring(2, 8)}`,
              name: cleanName,
              email: cleanEmail,
              role: title,
              station: station,
              status: 'Active'
            })
          });
        }
      }
    } catch (sbErr) {
      console.warn('Supabase signup error:', sbErr);
    }

    // 2. Also forward to Flask server to keep SQLite database updated
    let serverRes = null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password, role })
      });
      if (res.ok) {
        serverRes = await res.json();
      }
    } catch (e) {
      console.warn('Flask backend signup error:', e);
    }

    if (serverRes && serverRes.status === 'success') {
      window.CoffeeRealtime.broadcast('staff_updated', { role, email: cleanEmail });
      return serverRes;
    }

    if (supabaseSuccess) {
      const safeUser = { ...newUserObj };
      delete safeUser.password;
      window.CoffeeRealtime.broadcast('staff_updated', { role, email: cleanEmail });
      return { status: 'success', user: safeUser, message: 'Account created successfully!' };
    }

    return serverRes || { status: 'error', message: 'Failed to create account. Please try again.' };
  },

  // Products
  async getProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getProducts error:', e);
    }
    return null;
  },

  async addProduct(productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      window.CoffeeRealtime.broadcast('product_updated', productData);
      return data;
    } catch (e) {
      return null;
    }
  },

  async updateProduct(productId, productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const data = await res.json();
      window.CoffeeRealtime.broadcast('product_updated', { id: productId, ...productData });
      return data;
    } catch (e) {
      return null;
    }
  },

  async toggleProductStock(productId) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}/toggle`, {
        method: 'PUT'
      });
      const data = await res.json();
      window.CoffeeRealtime.broadcast('product_updated', { id: productId });
      return data;
    } catch (e) {
      return null;
    }
  },

  async deleteProduct(productId) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      window.CoffeeRealtime.broadcast('product_updated', { id: productId, deleted: true });
      return data;
    } catch (e) {
      return null;
    }
  },

  // Categories
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCategories error:', e);
    }
    return null;
  },

  async addCategory(name) {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async deleteCategory(categoryId) {
    try {
      const res = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Orders
  async getOrders() {
    // 1. Supabase cloud database
    try {
      const res = await sbFetch('orders?select=*&order=timestamp.desc');
      if (res && res.ok) {
        const orders = await res.json();
        if (Array.isArray(orders) && orders.length > 0) return orders;
      }
    } catch (e) {}

    // 2. Fallback to Flask backend
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getOrders error:', e);
    }
    return [];
  },

  async createOrder(orderData) {
    // 1. Save directly into Supabase database
    try {
      const sbPayload = {
        id: orderData.id,
        date: orderData.date,
        customer_name: orderData.customer_name || 'Walk-in Customer',
        customer_id: orderData.customer_id || null,
        channel: orderData.channel || 'Online Portal',
        items_json: typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []),
        subtotal: Number(orderData.subtotal || 0),
        discount: Number(orderData.discount || 0),
        tax: Number(orderData.tax || 0),
        total: Number(orderData.total || 0),
        payment_method: orderData.payment_method || 'Credit Card',
        cash_tendered: Number(orderData.cash_tendered || orderData.total || 0),
        change_due: Number(orderData.change_due || 0),
        status: orderData.status || 'Preparing',
        timestamp: Number(orderData.timestamp || Math.floor(Date.now() / 1000))
      };
      await sbFetch('orders', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(sbPayload)
      });
    } catch (sbErr) {
      console.warn('Supabase createOrder error:', sbErr);
    }

    // 2. Also save to Flask backend
    let serverRes = null;
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) serverRes = await res.json();
    } catch (e) {}

    window.CoffeeRealtime.broadcast('order_created', orderData);
    return serverRes || { status: 'success', order: orderData };
  },

  async updateOrderStatus(orderId, status) {
    // 1. Update in Supabase cloud database
    try {
      await sbFetch(`orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    } catch (sbErr) {
      console.warn('Supabase updateOrderStatus error:', sbErr);
    }

    // 2. Also update in Flask backend
    let serverRes = null;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) serverRes = await res.json();
    } catch (e) {}

    window.CoffeeRealtime.broadcast('order_status_updated', { id: orderId, status });
    return serverRes || { status: 'success' };
  },

  // Customers
  async getCustomers() {
    // 1. Supabase cloud database
    try {
      const res = await sbFetch('users?role=eq.customer&order=created_at.desc');
      if (res && res.ok) {
        const users = await res.json();
        if (Array.isArray(users) && users.length > 0) return users;
      }
    } catch (e) {}

    // 2. Fallback to Flask backend
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCustomers error:', e);
    }
    return [];
  },

  async addCustomer(customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateCustomer(customerId, customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(customerId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Inventory
  async adjustInventory(productId, adjustQty, reason, adjustedBy) {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, adjust_qty: adjustQty, reason, adjusted_by: adjustedBy })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getStockHistory() {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/history`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Staff
  async getStaff() {
    // 1. Supabase cloud database
    try {
      const res = await sbFetch('staff_accounts?select=*&order=created_at.asc');
      if (res && res.ok) {
        const staff = await res.json();
        if (Array.isArray(staff) && staff.length > 0) return staff;
      }
    } catch (e) {}

    // 2. Fallback to Flask backend
    try {
      const res = await fetch(`${API_BASE_URL}/staff`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  async addStaff(staffData) {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateStaffStatus(staffId) {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${encodeURIComponent(staffId)}/status`, {
        method: 'PUT'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Notifications
  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async markNotificationsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {}
    return null;
  },

  // Settings
  async getSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async saveSettings(settingsData) {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  }
};

window.API = API;

