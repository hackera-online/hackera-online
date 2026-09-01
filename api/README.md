# Stripe backend — paused, not wired up yet

These two files are early scaffolding for the Stripe subscription checkout
(€13/month plan) and are **not called by the live site right now** — the
"Subscribe" button on the pricing card is switched off in `js/app.js`
(`STRIPE_CHECKOUT_ENABLED = false`) until the Stripe account is approved.

- `stripe-config.php` — resolves `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  and the Price ID from environment variables first, falling back to a
  local file kept outside `public_html`. No real secret is committed here.
- `stripe-request.php` — a small dependency-free client for the Stripe
  REST API over cURL (no Composer / SDK needed), used by whichever
  endpoint calls it.

Still to build once Stripe is approved: `create-checkout-session.php`
(starts a Checkout Session), `webhook.php` (verifies and processes Stripe
webhook events), and `success.html` / `cancel.html` (+ `/bg/` versions).

**Important if the site ends up on GitHub Pages / Cloudflare Pages:**
those are static-only — they don't run PHP. This `/api/` folder only
works on a PHP host (e.g. staying on Namecheap for just this folder, or
rewriting it as Cloudflare Pages Functions in JS). See the main
`DEPLOY-GITHUB-CLOUDFLARE.txt` for the options.
