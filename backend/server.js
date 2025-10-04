// server.js

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import products from './products.json' with { type: 'json' };
//import fetch from 'node-fetch';


// -------------------- App & Sabitler --------------------
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// GoldAPI: canlı altın fiyatı (XAU/USD)
const GOLDAPI_URL = 'https://www.goldapi.io/api/XAU/USD';

// Troy ounce -> gram çevirimi
const TROY_OUNCE_TO_GRAMS = 31.1034768;

// TTL: GoldAPI çağrıları arasında bekleme (8 saat)
const GOLD_TTL_MS = Number(process.env.GOLD_TTL_MS ?? 8 * 60 * 60 * 1000); // 8 saat

// Servis hatasında kullanılacak fallback ons fiyatı (USD/oz)
const FALLBACK_XAUUSD_PER_OUNCE = Number(process.env.FALLBACK_XAUUSD_PER_OUNCE ?? 2400);

// Disk cache dosyası (restart sonrası da fiyatı tutmak için)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, process.env.CACHE_FILE ?? 'gold-cache.json');

// Bellek içi cache
let goldPricePerGramUsd = null; // USD/gram
let goldLastUpdated = 0;

// -------------------- Yardımcı Fonksiyonlar --------------------
const round2 = (n) => Math.round(Number(n) * 100) / 100;

const clamp01 = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
};

const toScore5 = (p) => Math.round(clamp01(p) * 50) / 10; // 1 ondalık

// Ödev formülü: Price = (popularityScore + 1) * weight * goldPrice(USD/gram)
const priceByAssignment = (pop, weight, goldPerGram) =>
  round2((clamp01(pop) + 1) * Math.max(0, Number(weight) || 0) * Number(goldPerGram));

// Basit filtreler (bonus): ?minPrice=&maxPrice=&minPop=&maxPop=
function applyFilters(items, q) {
  const has = (k) => Object.hasOwn(q, k) && q[k] !== '' && q[k] != null;
  let out = items;
  if (has('minPrice')) out = out.filter((x) => x.price >= Number(q.minPrice));
  if (has('maxPrice')) out = out.filter((x) => x.price <= Number(q.maxPrice));
  if (has('minPop')) out = out.filter((x) => x.popularityScore5 >= Number(q.minPop));
  if (has('maxPop')) out = out.filter((x) => x.popularityScore5 <= Number(q.maxPop));
  return out;
}

// -------------------- Disk Cache --------------------
async function loadCacheFromDisk() {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    const { pricePerGramUSD, lastUpdated } = JSON.parse(raw);
    if (typeof pricePerGramUSD === 'number') {
      goldPricePerGramUsd = pricePerGramUSD;
      goldLastUpdated = Number(lastUpdated) || Date.now();
      console.log('[gold-cache] Loaded from disk:', pricePerGramUSD);
    }
  } catch {
  }
}

async function saveCacheToDisk(pricePerGramUSD) {
  try {
    await fs.writeFile(
      CACHE_PATH,
      JSON.stringify({ pricePerGramUSD, lastUpdated: Date.now() }, null, 2)
    );
  } catch (e) {
    console.warn('[gold-cache] Write failed:', e.message);
  }
}

// -------------------- GoldAPI'den fiyat çekme --------------------
async function fetchGoldPricePerGramUSD() {
  const now = Date.now();
  // TTL içindeysek bellek cache'ini kullan
  if (goldPricePerGramUsd && now - goldLastUpdated < GOLD_TTL_MS) {
    return goldPricePerGramUsd;
  }

  let pricePerGramUSD;

  try {
    const resp = await fetch(GOLDAPI_URL, {
      headers: {
        'x-access-token': process.env.GOLDAPI_KEY,
        accept: 'application/json'
      }
    });
    if (!resp.ok) throw new Error(`GoldAPI HTTP ${resp.status}`);
    const data = await resp.json();

    // Planına göre doğrudan gram fiyatı gelebilir
    if (typeof data.price_gram_24k === 'number' && isFinite(data.price_gram_24k)) {
      pricePerGramUSD = data.price_gram_24k;
    } else if (typeof data.price === 'number' && isFinite(data.price)) {
      // Aksi halde ons -> gram dönüşümü
      pricePerGramUSD = data.price / TROY_OUNCE_TO_GRAMS;
    } else {
      throw new Error('GoldAPI response missing price fields');
    }
  } catch (e) {
    console.error('[GoldAPI] Fetch failed:', e.message);
    // Fallback: ons -> gram
    pricePerGramUSD = FALLBACK_XAUUSD_PER_OUNCE / TROY_OUNCE_TO_GRAMS;
  }

  goldPricePerGramUsd = pricePerGramUSD;
  goldLastUpdated = Date.now();
  await saveCacheToDisk(pricePerGramUSD);
  return goldPricePerGramUsd;
}

// -------------------- Rotalar --------------------
app.get('/products', async (req, res) => {
  try {
    const gold = await fetchGoldPricePerGramUSD(); // USD/gram
    let enriched = products.map((p, i) => ({
      id: p.id ?? i + 1,
      name: p.name,
      images: p.images,
      weight: p.weight,
      popularityScore: p.popularityScore,
      popularityScore5: toScore5(p.popularityScore),
      price: priceByAssignment(p.popularityScore, p.weight, gold)
    }));

    enriched = applyFilters(enriched, req.query);
    res.json(enriched);
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Canlı altın fiyatını (USD/gram) ve cache zamanını gösteren basit endpoint
app.get('/gold', async (_req, res) => {
  try {
    // cache boşsa yükle
    if (!goldPricePerGramUsd) await fetchGoldPricePerGramUSD();
    res.json({ goldPricePerGramUSD: round2(goldPricePerGramUsd), lastUpdated: goldLastUpdated });
  } catch {
    res.status(500).json({ error: 'Failed to fetch gold price' });
  }
});

// Sağlık
app.get('/', (_req, res) => res.send('OK'));

// -------------------- Başlatma --------------------
await loadCacheFromDisk();
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
