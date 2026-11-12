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

const API = {
  // Auth
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    } catch (e) {
      console.warn('API login error:', e);
      return null;
    }
  },

  async signup(name, email, password, role = 'customer') {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      return await res.json();
    } catch (e) {
      console.warn('API signup error:', e);
      return null;
    }
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
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getOrders error:', e);
    }
    return null;
  },

  async createOrder(orderData) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data && data.status === 'success') {
        window.CoffeeRealtime.broadcast('order_created', data.order || orderData);
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data && data.status === 'success') {
        window.CoffeeRealtime.broadcast('order_status_updated', { id: orderId, status });
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  // Customers
  async getCustomers() {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCustomers error:', e);
    }
    return null;
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
    try {
      const res = await fetch(`${API_BASE_URL}/staff`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
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

