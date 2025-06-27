// Simple Express-based Shopify Order Printer App with Admin Config Toggle

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 80;

// --- ENV ---
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // set a secret token for admin panel access

// --- CONFIG ---
const CONFIG_PATH = path.join(__dirname, "config.json");
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (e) {
    const defaultConfig = { allowInvoiceDownload: true };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
}
let config = loadConfig();
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// --- MIDDLEWARE ---
app.use(express.urlencoded({ extended: true }));

// Admin authentication (simple token-based)
app.use("/admin", (req, res, next) => {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (token !== ADMIN_TOKEN) {
    return res.status(401).send("Unauthorized");
  }
  next();
});

// --- Shopify helper ---
async function getOrder(orderId) {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}.json`;
  const res = await axios.get(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
  });
  return res.data.order;
}

// --- Invoice route ---
app.get("/orders/:id/invoice", async (req, res) => {
  try {
    if (!config.allowInvoiceDownload) {
      return res
        .status(403)
        .send("Invoice downloads are disabled by the store admin.");
    }

    const { id: orderId } = req.params;
    const order = await getOrder(orderId);

    // Optional customer‑email verification – append ?email={{ customer.email }} in the link
    const requestedEmail = (req.query.email || "").toLowerCase();
    if (requestedEmail && requestedEmail !== order.email.toLowerCase()) {
      return res.status(403).send("Unauthorized access");
    }

    const html = `
      <html>
        <head><title>Invoice ${order.name}</title></head>
        <body>
          <h1>Invoice for ${order.name}</h1>
          <p>Customer: ${order.customer.first_name} ${order.customer.last_name}</p>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("Error fetching order:", err.response?.data || err.message);
    res.status(500).send("Failed to fetch order invoice");
  }
});

// --- Admin Config UI ---
app.get("/admin/config", (req, res) => {
  res.send(`
    <html>
      <head><title>Invoice Settings</title></head>
      <body>
        <h2>Invoice Settings</h2>
        <form method="POST" action="/admin/config?token=${ADMIN_TOKEN}">
          <label>
            <input type="checkbox" name="allowInvoiceDownload" value="true" ${
              config.allowInvoiceDownload ? "checked" : ""
            } />
            Allow customers to download invoices
          </label>
          <br /><br />
          <button type="submit">Save</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/admin/config", (req, res) => {
  config.allowInvoiceDownload = req.body.allowInvoiceDownload === "true";
  saveConfig();
  res.send(
    'Settings updated. <a href="/admin/config?token=' +
      ADMIN_TOKEN +
      '">Back</a>'
  );
});

// --- Embedded landing (optional, for Shopify Admin) ---
app.get("/embedded", (req, res) => {
  const shop = req.query.shop || SHOPIFY_STORE_DOMAIN;
  res.send(`
        <div class="">test</div>
  `);
});

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Printer App running on http://0.0.0.0:${PORT}`);
});
