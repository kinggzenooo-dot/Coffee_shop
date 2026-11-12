-- ====================================================================
-- The Daily Grind Coffee Shop - Supabase Database Schema & Seed Data
-- ====================================================================
-- Copy and paste this script directly into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/hkrvqmzadkkemamklqcw/sql)
-- and click RUN to create and populate all tables.
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    phone TEXT,
    address TEXT,
    tier TEXT DEFAULT 'Standard Member',
    points INTEGER DEFAULT 50,
    total_spend NUMERIC DEFAULT 0.0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    stock INTEGER DEFAULT 20,
    "desc" TEXT,
    in_stock INTEGER DEFAULT 1,
    has_milk INTEGER DEFAULT 0,
    has_sweetness INTEGER DEFAULT 0,
    image TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Active'
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    customer_name TEXT,
    customer_id TEXT,
    channel TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0.0,
    tax NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    cash_tendered NUMERIC DEFAULT 0.0,
    change_due NUMERIC DEFAULT 0.0,
    status TEXT DEFAULT 'Preparing',
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STOCK HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.stock_history (
    id SERIAL PRIMARY KEY,
    timestamp TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    qty TEXT NOT NULL,
    adjusted_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STAFF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.staff_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    station TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    unread INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    shop_name TEXT DEFAULT 'The Daily Grind Coffee Shop',
    phone TEXT DEFAULT '+1 (555) 019-8822',
    address TEXT DEFAULT '123 Espresso Lane, Caramel Heights, NY 10001',
    currency TEXT DEFAULT '$',
    tax_rate NUMERIC DEFAULT 8.0,
    low_stock_threshold INTEGER DEFAULT 10,
    default_status TEXT DEFAULT 'Preparing'
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Allow public access with anon key)
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public users access" ON public.users;
    CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public products access" ON public.products;
    CREATE POLICY "Public products access" ON public.products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public categories access" ON public.categories;
    CREATE POLICY "Public categories access" ON public.categories FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public orders access" ON public.orders;
    CREATE POLICY "Public orders access" ON public.orders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public stock_history access" ON public.stock_history;
    CREATE POLICY "Public stock_history access" ON public.stock_history FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public staff_accounts access" ON public.staff_accounts;
    CREATE POLICY "Public staff_accounts access" ON public.staff_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public notifications access" ON public.notifications;
    CREATE POLICY "Public notifications access" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public settings access" ON public.settings;
    CREATE POLICY "Public settings access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Supabase Realtime for orders, products, notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ====================================================================
-- SEED INITIAL DATA
-- ====================================================================

-- Users
INSERT INTO public.users (id, name, email, password, role, phone, address, tier, points, total_spend, total_orders)
VALUES 
    ('admin1', 'Admin Director', 'admin@dailygrind.com', 'password123', 'admin', '+1 (555) 019-8800', 'Executive Office', 'Platinum Member', 1000, 500.00, 20),
    ('staff1', 'Sarah Jenkins (Cashier)', 'sarah.j@dailygrind.com', 'password123', 'staff', '+1 (555) 019-8801', 'Terminal #01', 'Gold Member', 500, 250.00, 10),
    ('barista1', 'Marcus Vance (Barista)', 'barista@dailygrind.com', 'password123', 'barista', '+1 (555) 019-8803', 'Espresso Bar Station', 'Staff Member', 0, 0, 0),
    ('c1', 'John Doe', 'john.doe@example.com', 'password123', 'customer', '+1 (555) 234-5678', '123 Espresso Lane, NY 10001', 'Gold Member', 420, 142.50, 8),
    ('c2', 'Jane Smith', 'jane.smith@example.com', 'password123', 'customer', '+1 (555) 891-2345', '456 Mocha Ave, NY 10002', 'Silver Member', 180, 68.00, 4)
ON CONFLICT (id) DO NOTHING;

-- Staff Accounts
INSERT INTO public.staff_accounts (id, name, email, role, station, status)
VALUES
    ('st1', 'Admin Director', 'admin@dailygrind.com', 'Administrator', 'Main Office', 'Active'),
    ('st2', 'Sarah Jenkins', 'sarah.j@dailygrind.com', 'Head Cashier', 'Terminal #01', 'Active'),
    ('st3', 'Marcus Vance', 'marcus.v@dailygrind.com', 'Barista', 'Espresso Bar', 'Active'),
    ('st4', 'Marcus Vance', 'barista@dailygrind.com', 'Barista', 'Espresso Bar', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO public.categories (name, status)
VALUES 
    ('Coffee', 'Active'),
    ('Non-Coffee', 'Active'),
    ('Tea', 'Active'),
    ('Bakery', 'Active'),
    ('Breakfast', 'Active'),
    ('Dessert', 'Active')
ON CONFLICT (name) DO NOTHING;

-- Products
INSERT INTO public.products (id, name, category, price, stock, "desc", in_stock, has_milk, has_sweetness, image)
VALUES
    ('p1', 'Signature Espresso', 'Coffee', 3.50, 45, 'Rich, dark double shot with sweet caramel notes.', 1, 1, 1, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80'),
    ('p2', 'Vanilla Latte', 'Coffee', 4.75, 32, 'Espresso combined with steamed milk and Madagascar vanilla.', 1, 1, 1, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80'),
    ('p3', 'Nitro Cold Brew', 'Coffee', 5.25, 4, 'Slow-steeped cold brew infused with nitrogen for a velvety head.', 1, 1, 1, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'),
    ('p4', 'Caramel Macchiato', 'Coffee', 5.50, 18, 'Steamed milk stained with espresso and marked with caramel drizzle.', 1, 1, 1, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80'),
    ('p5', 'Artisanal Hot Chocolate', 'Non-Coffee', 4.25, 20, 'Melted Belgian chocolate blocks steamed with whole milk.', 1, 1, 1, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80'),
    ('p6', 'Ceremonial Matcha Latte', 'Non-Coffee', 4.75, 0, 'Stone-ground green tea whisked with creamy oat milk.', 0, 1, 1, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'),
    ('p7', 'Jasmine Pearl Tea', 'Tea', 3.75, 15, 'Hand-rolled green tea leaves scented with fresh jasmine flowers.', 1, 0, 1, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'),
    ('p8', 'Classic Earl Grey', 'Tea', 3.75, 24, 'Fragrant black tea infused with cold-pressed bergamot oil.', 1, 0, 1, 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80'),
    ('p9', 'French Butter Croissant', 'Bakery', 3.25, 12, 'Flaky, buttery multi-layered pastry baked fresh every morning.', 1, 0, 0, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'),
    ('p10', 'Almond Frangipane Croissant', 'Bakery', 4.25, 8, 'Croissant filled with rich almond cream and topped with sliced almonds.', 1, 0, 0, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'),
    ('p11', 'Wild Blueberry Muffin', 'Bakery', 3.50, 14, 'Moist crumb muffin loaded with wild blueberries and coarse sugar.', 1, 0, 0, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80'),
    ('p12', 'Smashed Avocado Toast', 'Breakfast', 7.50, 20, 'Rustic sourdough toast topped with fresh avocado, chili flakes, and sea salt.', 1, 0, 0, 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&auto=format&fit=crop&q=80'),
    ('p13', 'Smoked Salmon Bagel', 'Breakfast', 8.95, 10, 'Toasted everything bagel, cream cheese, Norwegian smoked salmon, capers.', 1, 0, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80'),
    ('p14', 'Classic Tiramisu', 'Dessert', 5.50, 6, 'Espresso-soaked ladyfingers layered with mascarpone cream & cocoa.', 1, 0, 0, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80'),
    ('p15', 'Decadent Fudge Cake', 'Dessert', 5.75, 9, 'Rich, double-layer chocolate cake glazed with dark ganache.', 1, 0, 0, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Settings
INSERT INTO public.settings (id, shop_name, phone, address, currency, tax_rate, low_stock_threshold, default_status)
VALUES (1, 'The Daily Grind Coffee Shop', '+1 (555) 019-8822', '123 Espresso Lane, Caramel Heights, NY 10001', '$', 8.0, 10, 'Preparing')
ON CONFLICT (id) DO NOTHING;
