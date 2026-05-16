#!/usr/bin/env node
// Node-only mirror of mock_api.py — used inside the node:22 dev container
// which doesn't have Python. Same response shapes; same port.
import { createServer } from "node:http";

const RATES = {
  "USD,EUR": 0.925,
  "USD,GBP": 0.79,
  "USD,JPY": 147.32,
};

const send = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/rates") {
    const from = url.searchParams.get("from") ?? "USD";
    const to = url.searchParams.get("to");
    if (!to) {
      const rates = {};
      for (const [k, v] of Object.entries(RATES)) {
        const [f, t] = k.split(",");
        if (f === from) rates[t] = v.toFixed(4);
      }
      return send(res, 200, { rates });
    }
    if (to.includes(",")) {
      const rates = {};
      for (const code of to.split(",")) {
        rates[code] = (RATES[`${from},${code}`] ?? 1).toFixed(4);
      }
      return send(res, 200, { rates });
    }
    return send(res, 200, { rate: (RATES[`${from},${to}`] ?? 1).toFixed(4) });
  }
  send(res, 404, { error: `unknown endpoint ${url.pathname}` });
}).listen(9999, "0.0.0.0", () => console.log("mock API listening on :9999"));
