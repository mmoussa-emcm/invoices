// Simple Express-based Shopify Order Printer App

require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 80;

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch order details from Shopify
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

// Endpoint to download invoice as HTML
app.get("/orders/:id/invoice", async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await getOrder(orderId);

    const html = `
      <html>
        <body>
          <h1>Invoice for ${order.name}</h1>
          <p>Customer: ${order.customer.first_name} ${order.customer.last_name}</p>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).send("Failed to fetch order invoice");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Printer App running on http://localhost:${PORT}`);
});
