/**
 * Real trending apparel items from top Indian e-commerce & D2C stores
 * Prepared with multi-category support: Tops, Bottoms (Pants/Jeans), and Women's Dresses.
 */

export function buildAffiliateUrl(originalUrl, affiliateTag = "") {
  if (!originalUrl) return "#";
  if (!affiliateTag) return originalUrl;
  
  try {
    const url = new URL(originalUrl);
    if (url.hostname.includes("amazon")) {
      url.searchParams.set("tag", affiliateTag);
    } else {
      url.searchParams.set("aff_sub", affiliateTag);
      url.searchParams.set("utm_source", "frontdeskai");
      url.searchParams.set("utm_medium", "affiliate");
    }
    return url.toString();
  } catch (e) {
    return originalUrl;
  }
}

export const realCuratedProducts = [
  // -------------------------------------------------------------
  // TOPS (Men & Unisex)
  // -------------------------------------------------------------
  {
    id: "snitch-boxy-washed",
    name: "Heavyweight Acid Washed Oversized T-Shirt",
    brandName: "Snitch",
    platform: "Snitch Official",
    origin: "India",
    category: "Topwear / Oversized Tee",
    gender: "Men",
    color: "Acid Charcoal Wash",
    material: "240 GSM Combed French Terry Cotton",
    fitCut: "Oversized Drop-Shoulder",
    price: "₹1,199",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.snitch.co.in/products/heavyweight-acid-washed-oversized-t-shirt",
    sizeChart: [
      { size: "S", chest: 104, waist: 100, shoulder: 49, length: 71 },
      { size: "M", chest: 110, waist: 106, shoulder: 51, length: 73 },
      { size: "L", chest: 116, waist: 112, shoulder: 53, length: 75 },
      { size: "XL", chest: 122, waist: 118, shoulder: 55, length: 77 }
    ]
  },
  {
    id: "zara-mercerized-tee",
    name: "Mercerized Slim Tailored Cotton T-Shirt",
    brandName: "Zara Man",
    platform: "Zara India",
    origin: "Spain / India",
    category: "Topwear / Crewneck",
    gender: "Men",
    color: "Obsidian Black",
    material: "100% Mercerized Egyptian Giza Cotton",
    fitCut: "European Tailored Slim",
    price: "₹1,990",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.zara.com/in/en/man-tailored-mercerized-tee",
    sizeChart: [
      { size: "S", chest: 92, waist: 84, shoulder: 43, length: 68 },
      { size: "M", chest: 98, waist: 90, shoulder: 45, length: 70 },
      { size: "L", chest: 104, waist: 96, shoulder: 47, length: 72 },
      { size: "XL", chest: 110, waist: 102, shoulder: 49, length: 74 }
    ]
  },
  {
    id: "myntra-roadster-raw",
    name: "Pure Cotton Solid Round Neck T-Shirt",
    brandName: "Roadster / Myntra",
    platform: "Myntra",
    origin: "India",
    category: "Topwear / Regular Casual",
    gender: "Men",
    color: "Navy Heather",
    material: "100% Ring-Spun Bio-Washed Cotton",
    fitCut: "Standard Regular Indian Fit",
    price: "₹699",
    image: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.myntra.com/tshirts/roadster/pure-cotton-classic-tee/1283921/buy",
    sizeChart: [
      { size: "S", chest: 94, waist: 86, shoulder: 44, length: 69 },
      { size: "M", chest: 100, waist: 92, shoulder: 46, length: 71 },
      { size: "L", chest: 106, waist: 98, shoulder: 48, length: 73 },
      { size: "XL", chest: 112, waist: 104, shoulder: 50, length: 75 }
    ]
  },
  {
    id: "hm-relaxed-cotton",
    name: "Relaxed Fit Heavyweight Jersey T-Shirt",
    brandName: "H&M",
    platform: "H&M India",
    origin: "Global",
    category: "Topwear / Casual Knit",
    gender: "Unisex",
    color: "Chalk Ecru",
    material: "210 GSM Pure Cotton Jersey",
    fitCut: "Relaxed Straight Fit",
    price: "₹999",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www2.hm.com/en_in/productpage.relaxed-fit-heavyweight-t-shirt.html",
    sizeChart: [
      { size: "S", chest: 96, waist: 88, shoulder: 45, length: 70 },
      { size: "M", chest: 102, waist: 94, shoulder: 47, length: 72 },
      { size: "L", chest: 108, waist: 100, shoulder: 49, length: 74 },
      { size: "XL", chest: 114, waist: 106, shoulder: 51, length: 76 }
    ]
  },
  {
    id: "tss-supima-classic",
    name: "Supima Cotton Classic Everyday T-Shirt",
    brandName: "The Souled Store",
    platform: "The Souled Store",
    origin: "India",
    category: "Topwear / Premium Basics",
    gender: "Men",
    color: "Forest Sage",
    material: "100% US Supima Long-Staple Cotton",
    fitCut: "Standard Relaxed",
    price: "₹899",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.thesouledstore.com/product/supima-cotton-classic-sage-tshirt",
    sizeChart: [
      { size: "S", chest: 95, waist: 87, shoulder: 44, length: 69 },
      { size: "M", chest: 101, waist: 93, shoulder: 46, length: 71 },
      { size: "L", chest: 107, waist: 99, shoulder: 48, length: 73 },
      { size: "XL", chest: 113, waist: 105, shoulder: 50, length: 75 }
    ]
  },

  // -------------------------------------------------------------
  // BOTTOMS (Pants, Jeans, Trousers, Chinos)
  // -------------------------------------------------------------
  {
    id: "levis-511-slim",
    name: "511™ Slim Fit All-Season Stretch Jeans",
    brandName: "Levi's",
    platform: "Levi's India",
    origin: "USA / India",
    category: "Bottomwear / Denim Jeans",
    gender: "Men",
    color: "Clean Indigo Dark Wash",
    material: "99% Cotton, 1% Elastane (Comfort Stretch Denim)",
    fitCut: "Slim Fit with Narrow Leg",
    price: "₹3,199",
    image: "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.levi.in/men/clothing/jeans/511-slim-fit-jeans/045115167.html",
    sizeChart: [
      { size: "28", waist: 73.5, hip: 89, inseam: 81, thigh: 53 },
      { size: "30", waist: 78.5, hip: 94, inseam: 81, thigh: 56 },
      { size: "32", waist: 83.5, hip: 99, inseam: 81, thigh: 59 },
      { size: "34", waist: 88.5, hip: 104, inseam: 81, thigh: 62 },
      { size: "36", waist: 93.5, hip: 109, inseam: 81, thigh: 65 },
      { size: "38", waist: 98.5, hip: 114, inseam: 81, thigh: 68 }
    ]
  },
  {
    id: "snitch-korean-chinos",
    name: "Tailored Korean Pleated Relaxed Trousers",
    brandName: "Snitch",
    platform: "Snitch Official",
    origin: "India",
    category: "Bottomwear / Trousers",
    gender: "Men",
    color: "Beige Sand",
    material: "65% Poly, 33% Rayon, 2% Spandex (Wrinkle Resistant)",
    fitCut: "Korean Tapered Relaxed Pleat",
    price: "₹1,499",
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.snitch.co.in/products/korean-pleated-trousers",
    sizeChart: [
      { size: "28", waist: 74, hip: 96, length: 100 },
      { size: "30", waist: 79, hip: 101, length: 102 },
      { size: "32", waist: 84, hip: 106, length: 104 },
      { size: "34", waist: 89, hip: 111, length: 106 },
      { size: "36", waist: 94, hip: 116, length: 108 }
    ]
  },
  {
    id: "zara-fluid-trouser",
    name: "Fluid Wide-Leg Drape Trousers",
    brandName: "Zara Man",
    platform: "Zara India",
    origin: "Spain",
    category: "Bottomwear / Wide Leg",
    gender: "Unisex",
    color: "Oatmeal Melange",
    material: "100% Viscose Twill with fluid drape",
    fitCut: "Wide Leg Relaxed Fall",
    price: "₹3,590",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.zara.com/in/en/wide-leg-fluid-trousers",
    sizeChart: [
      { size: "30", waist: 80, hip: 102, length: 106 },
      { size: "32", waist: 85, hip: 107, length: 108 },
      { size: "34", waist: 90, hip: 112, length: 110 },
      { size: "36", waist: 95, hip: 117, length: 112 }
    ]
  },

  // -------------------------------------------------------------
  // WOMEN'S CLOTHING & DRESSES
  // -------------------------------------------------------------
  {
    id: "zara-satin-midi",
    name: "Satin Halter Neck Midi Slip Dress",
    brandName: "Zara Woman",
    platform: "Zara India",
    origin: "Spain",
    category: "Dresses / Midi Slip",
    gender: "Women",
    color: "Emerald Green",
    material: "100% Hammered Satin Viscose",
    fitCut: "Bias Cut Fluid Drape",
    price: "₹2,990",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.zara.com/in/en/woman-satin-halter-dress",
    sizeChart: [
      { size: "XS", bust: 82, waist: 64, hip: 90, length: 122 },
      { size: "S", bust: 86, waist: 68, hip: 94, length: 124 },
      { size: "M", bust: 92, waist: 74, hip: 100, length: 126 },
      { size: "L", bust: 98, waist: 80, hip: 106, length: 128 },
      { size: "XL", bust: 104, waist: 86, hip: 112, length: 130 }
    ]
  },
  {
    id: "mango-wrap-dress",
    name: "Floral Print Crepe Wrap Summer Dress",
    brandName: "Mango",
    platform: "Myntra / Mango",
    origin: "Spain",
    category: "Dresses / Wrap Dress",
    gender: "Women",
    color: "Sunlit Terracotta Floral",
    material: "100% Lightweight Georgette Crepe",
    fitCut: "A-Line Fit & Flare Wrap",
    price: "₹3,990",
    image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.myntra.com/dresses/mango/floral-crepe-wrap-dress/1829103/buy",
    sizeChart: [
      { size: "XS", bust: 84, waist: 66, hip: 92, length: 114 },
      { size: "S", bust: 88, waist: 70, hip: 96, length: 116 },
      { size: "M", bust: 94, waist: 76, hip: 102, length: 118 },
      { size: "L", bust: 100, waist: 82, hip: 108, length: 120 }
    ]
  },
  {
    id: "libas-kurta-set",
    name: "Pure Cotton Embroidered Anarkali Kurta & Palazzo Set",
    brandName: "Libas",
    platform: "Libas Official",
    origin: "India",
    category: "Ethnic Wear / Kurta Set",
    gender: "Women",
    color: "Dusty Rose Pink",
    material: "100% Cambric Soft Cotton with Zari Embroidery",
    fitCut: "Anarkali Flare with Sitting Ease",
    price: "₹2,199",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www.libas.in/products/pure-cotton-anarkali-kurta-palazzo-set",
    sizeChart: [
      { size: "S (36)", bust: 91, waist: 76, hip: 101, length: 120 },
      { size: "M (38)", bust: 96, waist: 81, hip: 106, length: 122 },
      { size: "L (40)", bust: 101, waist: 86, hip: 111, length: 124 },
      { size: "XL (42)", bust: 106, waist: 91, hip: 116, length: 126 },
      { size: "XXL (44)", bust: 111, waist: 96, hip: 121, length: 128 }
    ]
  },
  {
    id: "hm-ribbed-bodycon",
    name: "Ribbed Stretch Bodycon Mini Dress",
    brandName: "H&M Divided",
    platform: "H&M India",
    origin: "Global",
    category: "Dresses / Bodycon Mini",
    gender: "Women",
    color: "Black",
    material: "95% Cotton, 5% Elastane (4-Way High Elastic Rib)",
    fitCut: "Contour Bodycon Snug",
    price: "₹1,299",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80",
    externalStoreUrl: "https://www2.hm.com/en_in/productpage.ribbed-bodycon-dress.html",
    sizeChart: [
      { size: "XS", bust: 80, waist: 62, hip: 88, length: 86 },
      { size: "S", bust: 84, waist: 66, hip: 92, length: 88 },
      { size: "M", bust: 90, waist: 72, hip: 98, length: 90 },
      { size: "L", bust: 96, waist: 78, hip: 104, length: 92 }
    ]
  }
];
