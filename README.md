# PrintFlow Express - Print Shop Management System

A full-stack, mobile-first Print Shop Management web application built with **React**, **Vite**, **Tailwind CSS**, and **Supabase** (Postgres, Auth, Storage).

---

## ⚡ Highlights & Key Features

### 👤 Customer Features
1. **Google OAuth Sign-In**: Powered by Supabase Auth with Google OAuth. Each customer sees and manages only their own data (enforced at the database level via Row Level Security).
2. **Instant In-Browser PDF Page Counting**: Powered by `pdf-lib`. Counts pages directly inside the user's browser in milliseconds with **zero upload delay** and **zero server costs**.
3. **Live Price Calculation**: Automatically calculates `amount = pages × ₹3`. Clearly displays the exact breakdown: e.g. **`12 pages × ₹3 = ₹36.00`** (and strictly enforced by a Postgres check constraint).
4. **UPI & GPay Payment Integration**:
   - **Deep Link**: One-tap `upi://pay?pa=<SHOP_UPI_ID>&pn=<SHOP_NAME>&am=<amount>&cu=INR` button that automatically opens Google Pay, PhonePe, Paytm, or BHIM with the exact amount on mobile devices.
   - **Dynamic QR Code**: High-resolution vector QR code generated on the fly for any UPI scanner.
   - **Shop UPI ID**: One-click copy with shop branding and customizable UPI ID via environment variable.
   - **Transaction Verification**: Customers enter their 12-digit UPI UTR/Transaction ID to submit their order.
5. **"My Orders" Dashboard**:
   - Real-time order history with document name, page count, price breakdown, payment status, order fulfillment status, and submission timestamp.
   - **Secure Signed PDF Link**: Generates a time-limited signed URL (`supabase.storage.createSignedUrl`) to preview or download the file from the private Storage bucket.

### 🛡️ Admin (Shop Owner) Features
1. **Role-Based Access Control**: Protected dashboard accessible exclusively to users with `role = 'admin'` in the `profiles` table.
2. **Real-Time KPIs**: Summary cards for Total Orders, Pending Verification, Currently Printing, Completed Jobs, and Total Verified Revenue.
3. **Search & Multi-Filter**: Search by customer name, email, order ID, UTR reference, or document file name. Filter by payment status (`pending`, `paid`, `verified`, `rejected`) and print fulfillment status (`pending`, `printing`, `completed`).
4. **Payment Verification**: One-click to mark payment as **Verified** or **Rejected**.
5. **Print Fulfillment Tracker**: Update status through `pending` → `printing` → `completed`.
6. **Download / Print PDF**: Generates signed URLs to inspect or download the original high-res customer PDF for printing.

---

## 🏗️ Architecture & Database Design

### Database Tables (`supabase/migration.sql`)

#### 1. `orders` Table
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` |
| `user_id` | `uuid` | References `auth.users(id) not null default auth.uid()` |
| `name` | `text` | Customer full name |
| `pages` | `int` | Document page count (`check (pages > 0)`) |
| `amount` | `numeric(10,2)` | Enforced `check (amount = pages * 3.00)` + Trigger |
| `pdf_path` | `text` | Storage bucket path: `{user_id}/{timestamp}-{filename}` |
| `payment_status` | `text` | `'pending'`, `'paid'`, `'verified'`, `'rejected'` |
| `payment_method` | `text` | Default `'gpay'` |
| `payment_ref` | `text` | 12-digit UPI Transaction ID (UTR) |
| `order_status` | `text` | `'pending'`, `'printing'`, `'completed'` |
| `created_at` | `timestamptz` | `default now()` |

#### 2. `profiles` Table
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary Key, references `auth.users(id)` |
| `email` | `text` | User's Google email |
| `full_name` | `text` | User's Google display name |
| `role` | `text` | `'customer'` or `'admin'`, default `'customer'` |
| `created_at` | `timestamptz` | `default now()` |

- **Auto-Profile Trigger**: Whenever a new user signs up via Google OAuth, a row in `profiles` is automatically inserted with default role `'customer'`.

### Security & Row Level Security (RLS)
- **RLS Enabled** on both `orders` and `profiles`.
- **`is_admin()` Function**: A Postgres `SECURITY DEFINER` function with fixed `search_path = public` that checks if `auth.uid()` has `role = 'admin'` without causing recursive policy loops.
- **Customers Policy**: Can only `SELECT` and `INSERT` orders where `user_id = auth.uid()`. Customers cannot update payment status or amount.
- **Admins Policy**: Can `SELECT`, `UPDATE`, and `DELETE` all orders and view all profiles.
- **Private Storage Bucket `pdfs`**:
  - `public: false`, max file size `20MB`, mime type `application/pdf`.
  - Customers can upload and read only inside their own folder: `(storage.foldername(name))[1] = auth.uid()::text`.
  - Admins can read and download all customer PDFs across the bucket.

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Create a Supabase Project
1. Go to [https://database.new](https://database.new) and sign in.
2. Click **New Project**, choose an organization, set a project name (e.g., `print-flow-shop`) and a secure database password.
3. Select the region closest to your users and click **Create new project**.

---

### Step 2: Run the SQL Migration
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/migration.sql`](file:///supabase/migration.sql) from this repository and paste it into the SQL editor.
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. You should see a success message: `Success. No rows returned`.
   *(This creates the `orders` table, `profiles` table, constraints, triggers, `is_admin()` function, RLS policies, and the private `pdfs` storage bucket with its storage policies).*

---

### Step 3: Enable Google OAuth Provider in Supabase

#### A. Configure Google Cloud Console
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a project (or select an existing one) and configure the **OAuth consent screen** (User Type: External, enter App name, user support email, and developer email).
3. Under **Credentials**, click **Create Credentials** -> **OAuth client ID**.
4. Application type: **Web application**.
5. Name: `Print Shop Web Client`.
6. Under **Authorized redirect URIs**, add your Supabase OAuth callback URL:
   ```text
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   *(You can copy this URL directly from your Supabase Dashboard -> Authentication -> Providers -> Google)*.
7. Click **Create** and copy your **Client ID** and **Client Secret**.

#### B. Enable Google in Supabase
1. In Supabase Dashboard, go to **Authentication** -> **Providers**.
2. Expand the **Google** provider toggle.
3. Enable Google provider.
4. Paste the **Client ID** and **Client Secret** obtained from Google Cloud.
5. Click **Save**.

---

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Retrieve your Supabase API credentials:
   - Go to Supabase Dashboard -> **Project Settings** -> **API**.
   - Copy **Project URL** and **anon public key**.
3. Set your shop UPI ID and Business Name in `.env`:
   ```env
   # Supabase Credentials
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key

   # Shop UPI Payment Settings
   VITE_SHOP_UPI_ID=printshop@okhdfcbank
   VITE_SHOP_NAME=PrintFlow Express
   ```

---

### Step 5: Make Your Account an Admin (Shop Owner)

1. Sign in once into the application using your Google account so that your user record and profile are created.
2. In your Supabase Dashboard, open the **SQL Editor** and execute:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-google-email@gmail.com';
   ```
3. Refresh your app. You will immediately see the **Admin** navigation tab and access the Shop Owner dashboard!

---

### Step 6: Run Locally

Run the development server using npm:
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Testing the Complete Flow in Browser

You can test the entire flow either with your connected Supabase backend or via the built-in **Interactive Demo Mode**:

1. **Sign In**:
   - Connect with your Google account via Supabase Auth (or click *Test as Customer* in Demo Mode).
2. **Upload & Live Page Count**:
   - Customer name is prefilled from your Google account.
   - Drag and drop or browse any `.pdf` document (up to 20 MB).
   - Watch the in-browser `pdf-lib` engine parse the document and calculate the page count in milliseconds.
   - Verify the pricing box: `12 pages × ₹3 = ₹36.00`.
3. **UPI Payment & Deep Link**:
   - On a mobile browser: Tap **Pay ₹36 via UPI / GPay App** to deep-link into Google Pay / PhonePe.
   - On desktop: Scan the dynamically generated QR code with your phone.
   - Copy the Shop UPI ID with one click.
   - Enter your 12-digit UPI Reference Number / UTR into the input box.
4. **Submit Order**:
   - Click **Submit Print Order**.
   - Enjoy the confetti animation 🎉 and automatic redirect to **My Orders**.
5. **Check My Orders**:
   - See your newly submitted order listed with status `Paid (Reviewing)` and `In Queue`.
   - Click **View PDF** to verify that the signed URL loads your uploaded PDF document.
6. **Admin Verification & Fulfillment**:
   - Switch to the Admin view (by making your account an admin or clicking *Test as Admin* in Demo Mode).
   - Inspect the KPI metric cards and orders table.
   - Click **Open / Print PDF** to inspect the customer's PDF file via a secure signed URL.
   - Click **Verify** to change payment status to `Verified`.
   - Update Print Status from `Pending` → `Printing` → `Completed`.
   - Switch back to Customer view to see your order badge updated to `Verified` and `Ready for Pickup`!

---

## 📦 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx       # Shop owner order table, verification & fulfillment
│   │   ├── MyOrdersPage.tsx         # Customer order history & signed PDF viewer link
│   │   ├── Navbar.tsx               # Mobile-first header, brand logo & role indicators
│   │   ├── PdfViewerModal.tsx       # In-browser modal for secure PDF preview & download
│   │   ├── SignInPrompt.tsx         # Google OAuth prompt & demo switcher
│   │   └── UploadOrderPage.tsx      # PDF upload, live page count, price calc & UPI pay
│   ├── context/
│   │   └── AuthContext.tsx          # Supabase auth state & profile management
│   ├── lib/
│   │   ├── mockData.ts              # Demo state & offline fallback storage
│   │   ├── pdfUtils.ts              # pdf-lib page counting & UPI URL generator
│   │   └── supabase.ts              # Supabase client, storage APIs & order queries
│   ├── types/
│   │   └── index.ts                 # TypeScript types (Order, Profile, Statuses)
│   ├── App.tsx                      # Root component & page routing
│   ├── index.css                    # Tailwind CSS directives
│   └── main.tsx                     # React DOM entry point
├── supabase/
│   └── migration.sql                # Complete Postgres DDL, RLS & Storage policies
├── .env.example                     # Environment variables template
├── package.json                     # Scripts & dependencies
├── tailwind.config.js               # Tailwind design tokens
└── vite.config.ts                   # Vite configuration with chunk splitting
```
