const fs = require('fs');
let c = fs.readFileSync('app/dashboard/inventory/page.tsx', 'utf8');

// FIX 1: Supplier filter by store_id
c = c.replace(
  `const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name");
    if (data) setSuppliers(data);
  };`,
  `const fetchSuppliers = async () => {
    const storeId = localStorage.getItem("active_store_id");
    const query = supabase.from("suppliers").select("id, name");
    const { data } = storeId ? await query.eq("store_id", storeId) : await query;
    if (data) setSuppliers(data);
  };`
);

// FIX 2: discount_percent saved on edit
c = c.replace(
  `.update({
        name: editItem.name,
        price: Number(editItem.price),
        mrp: Number(editItem.mrp) || 0,
        buying_price: Number(editItem.buying_price) || 0,
        stock: Number(editItem.stock),
        category: editItem.category,
        gst_rate: Number(editItem.gst_rate),
        barcode: editItem.barcode || null,
        image: editItem.image || null,
        supplier_id: editItem.supplier_id || null, // 🔥 Update Supplier\n      })`,
  `.update({
        name: editItem.name,
        price: Number(editItem.price),
        mrp: Number(editItem.mrp) || 0,
        buying_price: Number(editItem.buying_price) || 0,
        stock: Number(editItem.stock),
        category: editItem.category,
        gst_rate: Number(editItem.gst_rate),
        discount_percent: Number(editItem.discount_percent) || 0,
        barcode: editItem.barcode || null,
        image: editItem.image || null,
        supplier_id: editItem.supplier_id || null,
      })`
);

// FIX 3: Replace alert() calls with toast
c = c.replace(/alert\("Archive failed: " \+ error\.message\)/g, 'toast.error("Archive failed: " + error.message)');
c = c.replace(/alert\("Restore failed: " \+ error\.message\)/g, 'toast.error("Restore failed: " + error.message)');
c = c.replace(/if \(error\) alert\(error\.message\);\n    else \{\n      setIsAddOpen\(false\);\n      resetForm\(\);\n      fetchData\(\);\n    \}/,
  `if (error) toast.error(error.message);
    else {
      setIsAddOpen(false);
      resetForm();
      fetchData();
      toast.success("Product added!");
    }`
);
c = c.replace(
  `if (error) alert("Update Failed: " + error.message);
    else {
      setIsEditOpen(false);
      setEditItem(null);
      fetchData();
      alert("✅ Updated!");
    }`,
  `if (error) toast.error("Update failed: " + error.message);
    else {
      setIsEditOpen(false);
      setEditItem(null);
      fetchData();
      toast.success("Product updated!");
    }`
);
c = c.replace(/alert\("Transfer Failed: " \+ error\.message\)/g, 'toast.error("Transfer failed: " + error.message)');
c = c.replace(/alert\("✅ Transfer Request Sent!"\)/g, 'toast.success("Transfer request sent!")');
c = c.replace(/alert\(`✅ \$\{newProducts\.length\} Items Imported!`\)/g, 'toast.success(`${newProducts.length} items imported!`)');
c = c.replace(/if \(error\) alert\(error\.message\);\n        else \{\n          alert\(`✅ \$\{newProducts\.length\} Items Imported!`\);\n          setIsImportOpen\(false\);\n          fetchData\(\);\n        \}/g,
  `if (error) toast.error(error.message);
        else {
          toast.success(\`\${newProducts.length} items imported!\`);
          setIsImportOpen(false);
          fetchData();
        }`
);

// Count replacements
const alertCount = (c.match(/alert\(/g) || []).length;
console.log('Remaining alert() calls:', alertCount);
fs.writeFileSync('app/dashboard/inventory/page.tsx', c, 'utf8');
console.log('inventory/page.tsx fixed!');
