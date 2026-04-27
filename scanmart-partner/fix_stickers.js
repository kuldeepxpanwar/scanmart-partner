const fs = require('fs');
let c = fs.readFileSync('app/dashboard/stickers/page.tsx', 'utf8');

// FIX 1: Add toast import after existing imports
c = c.replace(
  `import { Search, Printer, Plus, Minus, X, ScanBarcode,\n  Store, Scale, ToggleLeft, ToggleRight, Tag, Layers\n} from "lucide-react";`,
  `import { Search, Printer, Plus, Minus, X, ScanBarcode,\n  Store, Scale, ToggleLeft, ToggleRight, Tag, Layers, Trash2\n} from "lucide-react";\nimport toast from "react-hot-toast";`
);

// FIX 2: State for popup blocked warning + clearQueue function
// Add after const [showPrice, setShowPrice] = useState(true);
c = c.replace(
  `  const [showPrice, setShowPrice] = useState(true);`,
  `  const [showPrice, setShowPrice] = useState(true);
  const [popupBlocked, setPopupBlocked] = useState(false);`
);

// FIX 3: Clear queue function — add after removeFromQueue
c = c.replace(
  `  const removeFromQueue = (id: string) =>\n    setPrintQueue(prev => prev.filter(i => i.id !== id));`,
  `  const removeFromQueue = (id: string) =>
    setPrintQueue(prev => prev.filter(i => i.id !== id));
  const clearQueue = () => { setPrintQueue([]); toast.success("Queue cleared!"); };`
);

// FIX 4: In handlePrint, replace alert for popup blocked with setPopupBlocked + toast
c = c.replace(
  `    if (!win) { alert("Popup blocked! Please allow popups for this site and try again."); return; }`,
  `    if (!win) { setPopupBlocked(true); return; }
    setPopupBlocked(false);`
);

// FIX 5: Weight sticker print — show price breakdown
// In the sticker template inside handlePrint
c = c.replace(
  `          <div class="label sticker-label">
            <p class="store-name">${'${storeName}'}</p>
            <p class="product-name">${'${name}'}</p>
            ${'${item.isWeightItem ? `<p class="weight-info">${item.weightGrams}g</p>` : ""}'}
            <svg class="barcode" data-value="${'${bc}'}"></svg>
            ${'${showPrice ? `<p class="price">&#8377;${price.toFixed(0)}</p>` : ""}'}
          </div>`,
  `          <div class="label sticker-label">
            <p class="store-name">${'${storeName}'}</p>
            <p class="product-name">${'${name}'}</p>
            ${'${item.isWeightItem ? `<p class="weight-info">${item.weightGrams}g @ &#8377;${item.ratePerKg || item.price}/kg</p>` : ""}'}
            <svg class="barcode" data-value="${'${bc}'}"></svg>
            ${'${showPrice ? `<p class="price">&#8377;${price.toFixed(0)}</p>` : ""}'}
          </div>`
);

console.log('popupBlocked state added:', c.includes('popupBlocked'));
console.log('clearQueue added:', c.includes('clearQueue'));
console.log('toast import added:', c.includes("import toast from"));
console.log('weight breakdown added:', c.includes('ratePerKg'));
fs.writeFileSync('app/dashboard/stickers/page.tsx', c, 'utf8');
console.log('stickers/page.tsx fixed!');
