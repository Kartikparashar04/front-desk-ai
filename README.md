# Front Desk AI — Size Intelligence Protocol

> **Universal apparel sizing intelligence and deterministic garment fit recommendation engine.**  
> Live at: [frontdeskai.shop](https://frontdeskai.shop)

---

## ⚡ Overview

**Front Desk AI** eliminates sizing guesswork in online apparel shopping across major Indian and global fashion platforms (**Ajio, Myntra, Flipkart, Amazon Fashion, Meesho, Snitch, Zara, H&M, Bewakoof, The Souled Store**).

Users input any clothing product URL, and Front Desk AI automatically:
1. **Unfurls Garment Details:** Brand, product title, garment category (Shirt, T-Shirt, Polo, Jeans, Trousers, Jacket, Hoodie, Kurta, Dress), color, material, and live retail price.
2. **Loads Exact Garment Sizing Guides:** Resolves official brand cutting philosophies and garment measurements in centimetres (Chest, Waist, Shoulder, Length, Hip, Inseam).
3. **Calculates Calibrated Fit Recommendations:** Compares the garment's exact dimensions with the user's anatomical profile (considering ease allowances, fabric stretch tolerances, and silhouette preference: *Slim*, *Regular*, *Relaxed*).
4. **Interactive Overrides:** Supports 1-click browser extension/bookmarklet clipping, custom size table pasting, and direct photo updates.

---

## 🚀 Tech Stack

- **Frontend:** React 18, Vite 5, Custom Dark-Mode UI with CSS Variables, KaTeX rendering
- **Backend / API Server:** Node.js HTTP server with secure route handlers, reverse proxy, and OpenGraph/HTML metadata extractors
- **Database:** Google Cloud Firestore (multi-tenant user profiles, sessions, and authentication)
- **Deployment:** Containerized Docker build on **Google Cloud Run** with custom domain routing (`https://frontdeskai.shop`)
- **Authentication:** Phone OTP with Firebase Authentication, secure JWT session management, Row-Level Security

---

## 📁 Project Structure

```
FitCheck/
├── api/                  # Netlify / Serverless endpoints
├── data/                 # Reference garment and brand databases
├── extension/            # Chrome Extension for 1-click PDP scraping
├── public/               # Static assets, sitemap.xml, robots.txt, product media
├── server/               # Production Node.js backend server
│   ├── authHandler.js    # Registration, login, OTP, and session management
│   ├── firestoreDb.js    # Firestore database queries and collections
│   ├── index.js          # Core HTTP server entrypoint
│   └── productScraper.js # Universal e-commerce link scraper and analyzer
├── src/
│   ├── components/       # React UI components (Catalog, ProductDetail, AuthModal, etc.)
│   ├── data/             # Brand specifications and retailer registries
│   ├── utils/            # Sizing algorithms, AI assistants, URL analyzer, Firestore client
│   ├── App.jsx           # Main React root application
│   └── main.jsx          # Vite React DOM entrypoint
├── Dockerfile            # Multi-stage production container build
├── package.json          # Project metadata and dependencies
└── vite.config.js        # Vite build configuration
```

---

## 🛠️ Local Development

### 1. Prerequisites
- **Node.js** v18+ 
- **npm** v9+

### 2. Installation
```bash
git clone https://github.com/Kartikparashar04/front-desk-ai.git
cd front-desk-ai
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Production Build & Start
```bash
npm run build
npm start
```

---

## 📄 License

Private & Confidential © 2026 Front Desk AI. All Rights Reserved.
