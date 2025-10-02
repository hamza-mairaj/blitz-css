# Blitz CSS

**Blitz CSS** is the fastest Critical CSS generation library for web pages.  
Unlike other tools, it does **not rely on a browser or headless engines** — making it blazing fast and lightweight.  

---

## ✨ Features
- ⚡ Ultra-fast Critical CSS extraction
- 🖥️ Works without a browser or headless Chrome
- 📄 Supports full-page HTML + CSS
- 🧩 Simple API for developers
- 🪶 Lightweight

---

## 📦 Installation
```bash
npm install snap-css
```

or 
```bash
yarn add snap-css
```

---

## 🔧 Usage
```js
import { blitzcss } from "blitz-css";

const criticalCSS = blitzcss({
  pageurl: "https://example.com",
  html: "<!DOCTYPE html><html>...</html>",
  css: "body{margin:0;} .hero{color:red;}"
});

console.log(criticalCSS);
```

---

## ⚙️ API

### `blitzcss(options)`

**Parameters:**
- `pageurl` *(string)* – The full URL of the page (used for relative resource resolution).
- `html` *(string)* – The raw HTML source of the page.
- `css` *(string)* – The full CSS stylesheet(s) applied to the page.

**Returns:**
- *(string)* – A string of critical CSS.

---

## 📌 Why Blitz CSS?
Most critical CSS generators depend on browsers (like Puppeteer), which makes them **slow and resource-heavy**.  
Blitz CSS analyzes HTML and CSS **directly in Node.js**, giving you:
- Faster builds
- Lower resource usage
- Easier integration in CI/CD or build tools

---

## 📄 License
MIT © 2025 Hamza Mairaj
