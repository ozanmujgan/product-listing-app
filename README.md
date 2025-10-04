# Product Listing App

Canlı bağlantılar:

- **Frontend (Render Static Site):** https://product-listing-app-2-lo9n.onrender.com  
- **Backend (Render Web Service):** https://product-listing-app-1-7cgq.onrender.com  
- **Repo:** https://github.com/ozanmujgan/product-listing-app

> İnceleme için: `GET /gold` ve `GET /products` uç noktaları herkese açıktır.

---

## İçerik

- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [API](#api)
  - [/gold](#get-gold)
  - [/products](#get-products)
- [Frontend](#frontend)
- [Backend](#backend)
- [Lokalde Çalıştırma](#lokalde-çalıştırma)
- [Canlıya Alma (Render)](#canlıya-alma-render)
- [Notlar ve Kısıtlar](#notlar-ve-kısıtlar)

---

## Mimari

Monorepo yapı:

product-listing-app/
├─ backend/ # Node.js + Express API
│ ├─ server.js
│ └─ products.json
└─ frontend/ # React (CRA)
└─ src/
