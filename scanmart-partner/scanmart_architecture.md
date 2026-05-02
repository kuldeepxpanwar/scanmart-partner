# ScanMart Partner - System Architecture & Technical Documentation

## 1. Project Overview
**ScanMart Partner** is an enterprise-grade, multi-store Point of Sale (POS) and Retail/Pharmacy Management System. It is designed as an "Autonomous Retail Ecosystem" that supports fast billing, advanced inventory management (including pharmacy-specific batch/expiry tracking), supplier management, offline resilience, and comprehensive analytics.

## 2. Technology Stack
*   **Frontend Framework:** Next.js 16.1.6 (React 19) with App Router.
*   **Styling:** Tailwind CSS v4, Lucide React (Icons).
*   **State Management:** React Context API (`AppContext.tsx`) for global UI state (Theme, Language), and local component states.
*   **Backend & Database:** Supabase (PostgreSQL, Authentication).
*   **Offline Storage:** IndexedDB (via `offlineDb.ts`) to queue sales when the network is down.
*   **Utilities:** 
    *   `framer-motion` for animations.
    *   `html5-qrcode` & `react-barcode` for scanning and generating barcodes.
    *   `jspdf` & `jspdf-autotable` for receipt/report PDF generation.
    *   `recharts` for dashboard analytics.

## 3. Core Modules & Directory Structure

### 3.1. `/app` (Routing & Pages)
*   **`/dashboard`**: The core application shell containing the Sidebar and Header.
    *   **`/pos` (POS Terminal)**: Fast billing interface, barcode scanning, cart management.
    *   **`/inventory`**: Product management, bulk CSV imports, smart reordering, batch/expiry tracking.
    *   **`/sales` & `/returns`**: Transaction history, receipt re-printing, and processing returns/refunds.
    *   **`/customers` & `/suppliers`**: CRM and Vendor management (Khata/Credit tracking).
    *   **`/grn`**: Goods Receipt Note for inward stock tracking.
    *   **`/h1-register` & `/gst`**: Pharmacy compliance and tax filing reports.
    *   **`/analytics` & `/zreport`**: Daily closing reports (Z-Report) and revenue insights.
    *   **`/staff` & `/settings`**: Employee management, role assignment, and store configuration.

### 3.2. `/components` (Reusable UI)
*   **POS specific:** `POSCartTable.tsx`, `POSNumpad.tsx`, `POSReceipt.tsx`, `BarcodeScanner.tsx`.
*   **Layout & Nav:** `Sidebar.tsx`, `AdminSidebar.tsx`, `MobileNav.tsx`, `StoreSwitcher.tsx`.
*   **Security:** `ForgotPinModal.tsx`, `PlanGuard.tsx`.

### 3.3. `/lib` (Core Logic)
*   `supabase.ts`: Supabase client initialization.
*   `offlineDb.ts`: IndexedDB wrapper for `scanmart_offline`. Manages the `sales_queue` for offline resilience.
*   `AppContext.tsx`: Handles `theme` (dark/light) and `lang` (hi/en) preferences, persisting them in localStorage.
*   `pin.ts`: Handles secure PIN verification for locking/unlocking the terminal.

## 4. Database Architecture (Supabase)

The system is strictly multi-tenant using `store_id` (Row Level Security applies).

*   **`stores`**: Multi-store configurations linked to an `owner_id`.
*   **`staff`**: Role-based users (`admin`, `manager`, `staff`) with `pin_code` for quick terminal unlocking.
*   **`inventory`**: Master product list. Supports standard retail items and multi-unit pharmacy items (`pack_size`, `strip_size`, `reorder_level`).
*   **`inventory_batches`**: Tracks individual stock batches, crucial for pharmacies (Batch Number, Expiry Date, Quantity).
*   **`inventory_transfers`**: Tracks stock moved between different stores.
*   **`sales` & `sale_items`**: Transaction headers and line items. Tracks `total_amount`, `payment_method`, and `staff_id`.
*   **`customers`**: CRM data, tracking purchase history and loyalty.
*   **`suppliers` & `supplier_credit_transactions`**: Manages vendors and tracks outstanding balances (Debit/Credit Notes).

## 5. Key Workflows & Working Mechanisms

### 5.1. Authentication & Terminal Lock
*   A user logs in via Supabase Auth (Owner/Admin).
*   The terminal automatically enters a **Locked State**.
*   Staff members enter a 4-6 digit PIN. `page.tsx` checks the PIN against the `staff` table. Brute-force protection locks the terminal for 30 minutes after 5 failed attempts.
*   Once unlocked, the UI is scoped to the `active_store_id` and the user's role (Admin vs. Staff).

### 5.2. Offline-First POS Billing
1.  Items are scanned or manually added to the cart in the POS interface.
2.  Upon checkout, the system attempts to save to Supabase.
3.  If offline (network failure), the transaction is pushed to IndexedDB via `idbAddSale()`.
4.  A background sync mechanism later pushes queued sales to Supabase when the connection is restored.
5.  Receipts are generated immediately in the browser using HTML/Canvas or `jspdf`.

### 5.3. Pharmacy Inventory & Expiry Management
*   Products can be uploaded via a specialized **Pharmacy CSV Import**. The system parses batches, expiry dates, HSN codes, and GST slabs automatically.
*   Stock is calculated uniquely (e.g., Boxes -> Strips -> Tablets).
*   The Dashboard and Inventory pages actively query `inventory_batches` to warn admins of items expiring within 30 days and items hitting their `reorder_level`.
*   **Smart Reorder:** Calculates 30-day sales velocity and suggests order quantities for items predicted to run out soon.

### 5.4. Multilingual & Theming
*   The application wraps the entire layout in `AppProvider`.
*   A `t(key)` function translates static text between English and Hindi on the fly, storing the preference in `localStorage`.
*   Tailwind's `dark:` classes are used extensively for the premium dark mode aesthetic.
