#!/usr/bin/env python3
"""Tiny mock of api.unirateapi.com for astro-unirate's CI build.

Returns canned JSON for the endpoints the integration touches at build
time:

  GET /api/rates       {"rates": {...}}   when `to` is omitted
                       {"rate": "..."}    when single `to` is set
                       {"rates": {...}}   when multi `to` is comma-listed

The exampleSite uses a multi-currency `to` list so we cover that branch.
"""
from __future__ import annotations

import http.server
import json
import urllib.parse

RATES = {
    ("USD", "EUR"): 0.9250,
    ("USD", "GBP"): 0.7900,
    ("USD", "JPY"): 147.32,
}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        path, _, qs = self.path.partition("?")
        params = dict(urllib.parse.parse_qsl(qs))
        body, status = b"", 200

        if path == "/api/rates":
            from_ = params.get("from", "USD")
            to = params.get("to")
            if not to:
                rates = {to_: f"{r:.4f}" for (f_, to_), r in RATES.items() if f_ == from_}
                body = json.dumps({"rates": rates}).encode()
            elif "," in to:
                wants = to.split(",")
                rates = {
                    code: f"{RATES.get((from_, code), 1.0):.4f}"
                    for code in wants
                }
                body = json.dumps({"rates": rates}).encode()
            else:
                rate = RATES.get((from_, to), 1.0)
                body = json.dumps({"rate": f"{rate:.4f}"}).encode()
        else:
            status = 404
            body = json.dumps({"error": f"unknown endpoint {path}"}).encode()

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args, **_kwargs):  # silence per-request stderr noise
        pass


if __name__ == "__main__":
    http.server.HTTPServer(("0.0.0.0", 9999), Handler).serve_forever()  # noqa: S104
