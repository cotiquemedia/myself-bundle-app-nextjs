// src/pages/api/proxy.js
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "");
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-07";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "dummy",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "dummy",
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  isCustomStoreApp: true,
  apiVersion: LATEST_API_VERSION,
  hostName: SHOP,
});

// custom CORS middleware
function applyCors(req, res) {
  const allowedOrigins = [
    "https://myselflingerie.com",
    "https://www.myselflingerie.com",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};

    // --- REST product fetch ---
    if (body.rest === true && body.productHandle) {
      const restUrl = `https://${SHOP}/admin/api/${API_VERSION}/products.json?handle=${body.productHandle}`;
      const restResp = await fetch(restUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
      });

      const restJson = await restResp.json();
      if (restJson.products && restJson.products.length > 0) {
        return res.status(restResp.status).json({ product: restJson.products[0] });
      } else {
        return res.status(404).json({ error: "Product not found" });
      }
    }

    // --- GraphQL handling ---
    let { query, variables } = body;
    variables = variables || {};

    if (variables.input && Array.isArray(variables.input.components)) {
      variables.input.components = variables.input.components.map((component) => {
        if (!component.optionSelections?.length) delete component.optionSelections;
        return component;
      });
    }

    const client = new shopify.clients.Graphql({
      session: {
        shop: process.env.SHOPIFY_STORE_DOMAIN,
        accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
    });

    const response = await client.request(query, { variables });
    return res.status(200).json(response);

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
