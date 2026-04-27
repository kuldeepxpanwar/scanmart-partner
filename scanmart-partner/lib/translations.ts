// ─────────────────────────────────────────────────
// ScanMart Translations — Hindi / English
// Usage: const { t } = useApp(); t('checkout')
// ─────────────────────────────────────────────────

export type Language = 'hi' | 'en';

const translations: Record<string, Record<Language, string>> = {
  // ── App ──
  app_name: { hi: 'स्कैनमार्ट', en: 'ScanMart' },
  pos_terminal: { hi: 'बिलिंग काउंटर', en: 'POS Terminal' },
  dashboard: { hi: 'डैशबोर्ड', en: 'Dashboard' },
  settings: { hi: 'सेटिंग्स', en: 'Settings' },
  logout: { hi: 'बाहर जाएं', en: 'Logout' },

  // ── POS ──
  scan_or_search: { hi: 'बारकोड स्कैन करें या खोजें...', en: 'Scan Barcode or Search...' },
  search: { hi: 'खोजें', en: 'Search' },
  scan: { hi: 'स्कैन', en: 'Scan' },
  cart: { hi: 'कार्ट', en: 'Cart' },
  add_to_cart: { hi: 'कार्ट में डालें', en: 'Add to Cart' },
  ready_to_scan: { hi: 'स्कैन करने के लिए तैयार', en: 'Ready to Scan' },
  quick_add: { hi: 'जल्दी जोड़ें — टॉप प्रोडक्ट', en: 'Quick Add — Top Products' },
  item_description: { hi: 'आइटम', en: 'Item Description' },
  unit: { hi: 'इकाई', en: 'Unit' },
  qty: { hi: 'मात्रा', en: 'Qty' },
  rate: { hi: 'दर', en: 'Rate' },
  amount: { hi: 'राशि', en: 'Amount' },
  items: { hi: 'आइटम', en: 'Items' },
  discount: { hi: 'छूट', en: 'Discount' },
  savings: { hi: 'बचत', en: 'Savings' },
  subtotal: { hi: 'उप-कुल', en: 'Subtotal' },
  total: { hi: 'कुल', en: 'TOTAL' },
  stock: { hi: 'स्टॉक', en: 'Stock' },

  // ── Units ──
  box: { hi: '📦 बॉक्स', en: '📦 Box' },
  strip: { hi: '💊 स्ट्रिप', en: '💊 Strip' },
  tablet: { hi: '💉 टैबलेट', en: '💉 Tablet' },
  piece: { hi: '🔹 पीस', en: '🔹 Piece' },

  // ── Payment ──
  cash: { hi: 'नकद', en: 'Cash' },
  upi: { hi: 'UPI', en: 'UPI' },
  card: { hi: 'कार्ड', en: 'Card' },
  split: { hi: 'विभाजित', en: 'Split' },
  pay_and_print: { hi: 'बिल बनाएं', en: 'Pay & Print' },
  hold: { hi: 'रोकें', en: 'Hold' },
  clear: { hi: 'साफ करें', en: 'Clear' },
  reprint: { hi: 'दोबारा प्रिंट', en: 'Reprint Last Bill' },
  mobile_number: { hi: 'मोबाइल नंबर', en: 'Mobile Number' },
  tap_numpad: { hi: 'नंबर दबाएं...', en: 'Tap numpad to enter...' },
  held_bills: { hi: 'रोके हुए बिल', en: 'Held Bills' },

  // ── Customer ──
  customer: { hi: 'ग्राहक', en: 'Customer' },
  guest: { hi: 'अतिथि', en: 'Guest' },
  total_spent: { hi: 'कुल खरीदारी', en: 'Total Spent' },

  // ── Staff ──
  unlock_terminal: { hi: 'टर्मिनल खोलें', en: 'UNLOCK TERMINAL' },
  enter_pin: { hi: 'स्टाफ पिन डालें', en: 'Enter Staff PIN' },
  forgot_pin: { hi: 'पिन भूल गए?', en: 'Forgot PIN?' },
  invalid_pin: { hi: '❌ गलत पिन', en: '❌ Invalid PIN' },
  pos_access: { hi: 'बिलिंग एक्सेस', en: 'POS Access' },
  exit: { hi: 'बाहर', en: 'Exit' },

  // ── Inventory ──
  inventory: { hi: 'माल सूची', en: 'Inventory' },
  add_product: { hi: 'प्रोडक्ट जोड़ें', en: 'Add Product' },
  edit_product: { hi: 'प्रोडक्ट बदलें', en: 'Edit Product' },
  product_name: { hi: 'प्रोडक्ट का नाम', en: 'Product Name' },
  category: { hi: 'श्रेणी', en: 'Category' },
  price: { hi: 'मूल्य', en: 'Price' },
  mrp: { hi: 'MRP', en: 'MRP' },
  buying_price: { hi: 'खरीद मूल्य', en: 'Buy Price' },
  barcode: { hi: 'बारकोड', en: 'Barcode' },
  supplier: { hi: 'आपूर्तिकर्ता', en: 'Supplier' },
  save_product: { hi: 'सेव करें', en: 'SAVE PRODUCT' },
  import_csv: { hi: 'CSV आयात', en: 'Bulk Import' },
  export: { hi: 'निर्यात', en: 'Export' },
  low_stock: { hi: 'कम स्टॉक', en: 'Low Stock' },
  archive: { hi: 'हटाएं', en: 'Archive' },
  restore: { hi: 'वापस लाएं', en: 'Restore' },
  packaging: { hi: 'पैकेजिंग', en: 'Packaging Details' },
  strips_per_box: { hi: 'स्ट्रिप/बॉक्स', en: 'Strips/Box' },
  tabs_per_strip: { hi: 'टैब/स्ट्रिप', en: 'Tabs/Strip' },
  sell_as: { hi: 'बिक्री इकाई', en: 'Sell As' },
  boxes_in_stock: { hi: 'बॉक्स स्टॉक में', en: 'Boxes in Stock' },
  tablets_total: { hi: 'कुल टैबलेट', en: 'tablets total' },

  // ── Analytics ──
  analytics: { hi: 'विश्लेषण', en: 'Analytics' },
  revenue: { hi: 'राजस्व', en: 'Revenue' },
  profit: { hi: 'लाभ', en: 'Profit' },
  sales: { hi: 'बिक्री', en: 'Sales' },
  today: { hi: 'आज', en: 'Today' },
  this_week: { hi: 'इस हफ्ते', en: 'This Week' },
  this_month: { hi: 'इस महीने', en: 'This Month' },
  this_year: { hi: 'इस साल', en: 'This Year' },

  // ── Bill Audit ──
  bill_audit: { hi: 'बिल ऑडिट रिपोर्ट', en: 'Bill Audit Report' },
  all_clear: { hi: '✅ सब सही', en: '✅ ALL CLEAR' },
  rate_mismatch: { hi: '❌ दर मिसमैच', en: '❌ Rate Mismatch' },
  duplicate_products: { hi: '⚠️ डुप्लीकेट', en: '⚠️ Duplicate Products' },
  new_products: { hi: 'ℹ️ नए प्रोडक्ट', en: 'ℹ️ New Products' },
  bill_clean: { hi: '✅ बिल सही है!', en: '✅ Bill looks clean!' },

  // ── Theme ──
  light_mode: { hi: '☀️ लाइट', en: '☀️ Light' },
  dark_mode: { hi: '🌙 डार्क', en: '🌙 Dark' },
  language: { hi: 'भाषा', en: 'Language' },

  // ── Dashboard ──
  quick: { hi: 'तुरंत', en: 'Quick' },
  billing: { hi: 'बिलिंग', en: 'Billing' },
  create_invoices_instantly: { hi: 'तुरंत बिल बनाएं। तेज़, सुरक्षित, प्रिंट-रेडी।', en: 'Create invoices instantly. Fast, secure, and printer-friendly.' },
  recent_transactions: { hi: 'हाल की बिक्री', en: 'Recent Transactions' },
  weekly_revenue: { hi: 'साप्ताहिक राजस्व', en: 'Weekly Revenue' },

  // ── Common ──
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  confirm: { hi: 'पुष्टि करें', en: 'Confirm' },
  save: { hi: 'सेव', en: 'Save' },
  delete: { hi: 'मिटाएं', en: 'Delete' },
  loading: { hi: 'लोड हो रहा...', en: 'Loading...' },
  online: { hi: '● ऑनलाइन', en: '● ONLINE' },
  offline: { hi: '● ऑफलाइन', en: '● OFFLINE' },
  no_results: { hi: 'कोई परिणाम नहीं', en: 'No results' },
  error: { hi: 'त्रुटि', en: 'Error' },
  success: { hi: 'सफल', en: 'Success' },
};

export function translate(key: string, lang: Language): string {
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

export default translations;
