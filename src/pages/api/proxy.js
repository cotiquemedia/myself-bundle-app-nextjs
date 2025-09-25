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

export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader("Access-Control-Allow-Origin", "https://myselflingerie-com.myshopify.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    // If frontend asks for REST product data, handle here:
    // inside proxy handler
    if (body.rest === true && body.productHandle) {
      // fetch by handle via REST
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


    // Otherwise fall back to your GraphQL handling (existing code)
    let { query, variables } = body;
    variables = variables || {};

    if (variables.input && Array.isArray(variables.input.components)) {
      variables.input.components = variables.input.components.map((component) => {
        if (!component.optionSelections || !Array.isArray(component.optionSelections) || component.optionSelections.length === 0) {
          delete component.optionSelections;
        }
        return component;
      });
    }

    console.log("➡️ Query:", query);
    console.log("➡️ Variables:", JSON.stringify(variables, null, 2));

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
