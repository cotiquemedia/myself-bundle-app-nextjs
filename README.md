This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

```bash
$("button#giftItBtn").click(function () {
  if (!$(this).hasClass("disabled")) {
  let $btn = $(this).prop("disabled", true).html(`<div class="loader-cs"></div>`);

  loadGiftOptions().then(() => {
        console.log("✅ All gift options loaded on button click!");
        let input = buildBundleInput();
        console.log("🔥 Final Bundle Input:", input);
          (async () => {
              const activeProductId = await createAndActivateBundle(input);
              let variantIdBundle = activeProductId.variants.nodes[0].id;
              variantIdBundle = variantIdBundle.split("/ProductVariant/");
              variantIdBundle = variantIdBundle[1];

              let messageGiftBoxFrom = $("span.gift_message_items_From").text().trim();
              let messageGiftBoxMsg = $("span.gift_message_items_message").text().trim();
                
                $.ajax({
                  type: "POST",
                  url: "/cart/add.js",
                  data: {
                    quantity: 1,
                    id: variantIdBundle,
                    properties: {
                      "From": messageGiftBoxFrom,
                      "Message": messageGiftBoxMsg
                    }
                  },
                  dataType: "json",
                  success: function (data) {
                    $btn.prop("disabled", false).html("Gift It");
                    console.log("✅ Bundle added with message:", data);
                
                    // Optional: redirect to checkout
                    // window.location.href = "/checkout";
                  }
                });
              // console.log("🛒 Active Bundle Product ID:", activeProductId,variantIdBundle);
          })();
      });
      }
    });

function loadGiftOptions() {
  let requests = [];

  $(".gift-two-sidebar-item .gift-two-sidebar-item-info").each(function () {
    let getProductUrl = $(this).attr("data-product-url");
    let itemCurrent = $(this);

    let req = $.getJSON(getProductUrl).then(function (data) {
      let optionsGet = data?.product?.options || [];
      optionsGet.forEach(function (option, index) {
        itemCurrent.attr(`option-data-${index}`, `${option.id}:${option.name}`);
      });
    });

    requests.push(req);
  });

  return Promise.all(requests);
}
```

```bash
# Create bundle get product id and make it published and return variant id

// create the bundle

(async () => {
  try {
    const response = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation CreateBundle($input: ProductBundleCreateInput!) {
            productBundleCreate(input: $input) {
              productBundleOperation {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            title: "Console Test Bundle 3",
            components: [
              {
                productId: "gid://shopify/Product/8353637990687",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238572831",
                    name: "Color",   // 👈 required
                    values: ["Blue"],
                  },
                ],
              },
              {
                productId: "gid://shopify/Product/8353638023455",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238605599",
                    name: "Color",   // 👈 required
                    values: ["Gold"],
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const data = await response.json();
    console.log("✅ Bundle created:", data);
  } catch (err) {
    console.error("❌ Error creating bundle:", err);
  }
})();


// get the product data using the bundle opreation id


(async () => {
  try {
    const operationId = "gid://shopify/ProductBundleOperation/36914594079"; // 👈 your bundle operation id

    const response = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GetBundleProductFromOperation($id: ID!) {
            productOperation(id: $id) {
              ... on ProductBundleOperation {
                id
                status
                product {
                  id
                  title
                  status
                  variants(first: 5) {
                    nodes {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id: operationId },
      }),
    });

    const data = await response.json();
    console.log("📦 Raw response:", data);

    const product = data?.data?.productOperation?.product;
    if (product) {
      console.log("✅ Product found:", product);
    } else {
      console.warn("⚠️ No product returned from bundle operation");
    }
  } catch (err) {
    console.error("❌ Error fetching bundle product:", err);
  }
})();


// create bundle and get the product data


// ⏳ Helper: wait function
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  try {
    // 1️⃣ Create the bundle
    const createResponse = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation CreateBundle($input: ProductBundleCreateInput!) {
            productBundleCreate(input: $input) {
              productBundleOperation {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            title: "Console Test Bundle 12",
            components: [
              {
                productId: "gid://shopify/Product/8353637990687",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238572831",
                    name: "Color",
                    values: ["Blue"],
                  },
                ],
              },
              {
                productId: "gid://shopify/Product/8353638023455",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238605599",
                    name: "Color",
                    values: ["Gold"],
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const createData = await createResponse.json();
    console.log("✅ Bundle created:", createData);

    const operationId =
      createData?.data?.productBundleCreate?.productBundleOperation?.id;

    if (!operationId) {
      throw new Error("❌ No operation ID returned from bundle creation");
    }

    // ⏳ Wait 3 seconds before fetching product data
    console.log("⌛ Waiting 3s for bundle to process...");
    await wait(3000);

    // 2️⃣ Fetch product data from operation
    const productResponse = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GetBundleProductFromOperation($id: ID!) {
            productOperation(id: $id) {
              ... on ProductBundleOperation {
                id
                status
                product {
                  id
                  title
                  status
                  variants(first: 5) {
                    nodes {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id: operationId },
      }),
    });

    const productData = await productResponse.json();
    console.log("📦 Bundle product:", productData);

    const product = productData?.data?.productOperation?.product;
    if (product) {
      console.log("🎯 Product ready:", product);
      console.log("🛒 First variant ID:", product.variants.nodes[0].id);
    } else {
      console.warn("⚠️ No product returned yet — might still be processing");
    }
  } catch (err) {
    console.error("❌ Error in bundle flow:", err);
  }
})();


// make the product active


async function activateBundle(productId) {
  const API_URL = "http://localhost:3000/api/proxy"; // your proxy URL

  const query = `
    mutation ActivateProduct($id: ID!) {
      productUpdate(input: { id: $id, status: ACTIVE }) {
        product {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = { id: productId };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    console.log("✅ Activated bundle:", data);
    return data;
  } catch (err) {
    console.error("❌ Error activating bundle:", err);
  }
}

activateBundle("gid://shopify/Product/10246944031007");


// get the option ids


(async () => {
  const PROXY_URL = "http://localhost:3000/api/proxy";
  const productHandle = "chain-bracelet";
  
  // Call proxy REST endpoint
  const restResp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rest: true,
      productHandle: productHandle
    }),
  });
  
  const restJson = await restResp.json();
  
  // restJson.product.options should be available
  const product = restJson.product;
  console.log("Product from admin REST:", product);
  
  const option = product.options.find(o =>
    o.name.toLowerCase() === "Color".toLowerCase()
  );
  if (!option) {
    console.error("Option Color not found in product options");
    return;
  }
  
  // Convert numeric option.id to GraphQL GID:
  const componentOptionGid = `gid://shopify/ProductOption/${option.id}`;
  console.log("ComponentOption GID:", componentOptionGid);
})();

```

$.get("https://vercel-proxy-three-xi.vercel.app/api/proxy?endpoint=products.json?ids=8978766954783",function (data) {
console.log(data)
})

```bash
// create the bundle

(async () => {
  try {
    const response = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation CreateBundle($input: ProductBundleCreateInput!) {
            productBundleCreate(input: $input) {
              productBundleOperation {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            title: "Console Test Bundle 3",
            components: [
              {
                productId: "gid://shopify/Product/8353637990687",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238572831",
                    name: "Color",   // 👈 required
                    values: ["Blue"],
                  },
                ],
              },
              {
                productId: "gid://shopify/Product/8353638023455",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238605599",
                    name: "Color",   // 👈 required
                    values: ["Gold"],
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const data = await response.json();
    console.log("✅ Bundle created:", data);
  } catch (err) {
    console.error("❌ Error creating bundle:", err);
  }
})();


// get the product data using the bundle opreation id


(async () => {
  try {
    const operationId = "gid://shopify/ProductBundleOperation/36914594079"; // 👈 your bundle operation id

    const response = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GetBundleProductFromOperation($id: ID!) {
            productOperation(id: $id) {
              ... on ProductBundleOperation {
                id
                status
                product {
                  id
                  title
                  status
                  variants(first: 5) {
                    nodes {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id: operationId },
      }),
    });

    const data = await response.json();
    console.log("📦 Raw response:", data);

    const product = data?.data?.productOperation?.product;
    if (product) {
      console.log("✅ Product found:", product);
    } else {
      console.warn("⚠️ No product returned from bundle operation");
    }
  } catch (err) {
    console.error("❌ Error fetching bundle product:", err);
  }
})();


// create bundle and get the product data


// ⏳ Helper: wait function
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  try {
    // 1️⃣ Create the bundle
    const createResponse = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation CreateBundle($input: ProductBundleCreateInput!) {
            productBundleCreate(input: $input) {
              productBundleOperation {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            title: "Console Test Bundle 12",
            components: [
              {
                productId: "gid://shopify/Product/8353637990687",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238572831",
                    name: "Color",
                    values: ["Blue"],
                  },
                ],
              },
              {
                productId: "gid://shopify/Product/8353638023455",
                quantity: 1,
                optionSelections: [
                  {
                    componentOptionId: "gid://shopify/ProductOption/10590238605599",
                    name: "Color",
                    values: ["Gold"],
                  },
                ],
              },
            ],
          },
        },
      }),
    });

    const createData = await createResponse.json();
    console.log("✅ Bundle created:", createData);

    const operationId =
      createData?.data?.productBundleCreate?.productBundleOperation?.id;

    if (!operationId) {
      throw new Error("❌ No operation ID returned from bundle creation");
    }

    // ⏳ Wait 3 seconds before fetching product data
    console.log("⌛ Waiting 3s for bundle to process...");
    await wait(3000);

    // 2️⃣ Fetch product data from operation
    const productResponse = await fetch("http://localhost:3000/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query GetBundleProductFromOperation($id: ID!) {
            productOperation(id: $id) {
              ... on ProductBundleOperation {
                id
                status
                product {
                  id
                  title
                  status
                  variants(first: 5) {
                    nodes {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id: operationId },
      }),
    });

    const productData = await productResponse.json();
    console.log("📦 Bundle product:", productData);

    const product = productData?.data?.productOperation?.product;
    if (product) {
      console.log("🎯 Product ready:", product);
      console.log("🛒 First variant ID:", product.variants.nodes[0].id);
    } else {
      console.warn("⚠️ No product returned yet — might still be processing");
    }
  } catch (err) {
    console.error("❌ Error in bundle flow:", err);
  }
})();


// make the product active


async function activateBundle(productId) {
  const API_URL = "http://localhost:3000/api/proxy"; // your proxy URL

  const query = `
    mutation ActivateProduct($id: ID!) {
      productUpdate(input: { id: $id, status: ACTIVE }) {
        product {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = { id: productId };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    console.log("✅ Activated bundle:", data);
    return data;
  } catch (err) {
    console.error("❌ Error activating bundle:", err);
  }
}

activateBundle("gid://shopify/Product/10246944031007");


// get the option ids


(async () => {
  const PROXY_URL = "http://localhost:3000/api/proxy";
  const productHandle = "chain-bracelet";
  
  // Call proxy REST endpoint
  const restResp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rest: true,
      productHandle: productHandle
    }),
  });
  
  const restJson = await restResp.json();
  
  // restJson.product.options should be available
  const product = restJson.product;
  console.log("Product from admin REST:", product);
  
  const option = product.options.find(o =>
    o.name.toLowerCase() === "Color".toLowerCase()
  );
  if (!option) {
    console.error("Option Color not found in product options");
    return;
  }
  
  // Convert numeric option.id to GraphQL GID:
  const componentOptionGid = `gid://shopify/ProductOption/${option.id}`;
  console.log("ComponentOption GID:", componentOptionGid);
})();

```