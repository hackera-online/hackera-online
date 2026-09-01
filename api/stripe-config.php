<?php
/**
 * stripe-config.php
 * -----------------------------------------------------------------------
 * Central place that resolves Stripe credentials and site settings.
 * NEVER put real secret values directly in this file if it lives inside
 * public_html — use one of the two options below instead.
 *
 * Resolution order for every secret:
 *   1. A real OS/PHP environment variable (getenv()) — used automatically
 *      if your host lets you set env vars (e.g. via cPanel's "Setup PHP
 *      environment variables" panel, if your plan has one).
 *   2. A local, non-web-accessible PHP file that just defines constants.
 *      By default this repo looks for it one directory ABOVE public_html:
 *        /home/<cpanel-username>/hackera-secrets.php
 *      That path is outside the web root, so it can never be downloaded
 *      by a browser, even if .htaccess protection is ever misconfigured.
 *      A ready-to-fill template is provided separately as
 *      hackera-secrets.example.php (see DEPLOY-STRIPE.txt).
 *
 * Nothing below ever echoes a secret back to the browser.
 */

// ---------------------------------------------------------------------
// 1) Try real environment variables first.
// ---------------------------------------------------------------------
$__stripe_secret_key    = getenv('STRIPE_SECRET_KEY') ?: null;
$__stripe_webhook_secret = getenv('STRIPE_WEBHOOK_SECRET') ?: null;
$__stripe_price_id      = getenv('STRIPE_PRICE_ID') ?: null;
$__site_url             = getenv('SITE_URL') ?: null;
$__notify_email         = getenv('HACKERA_NOTIFY_EMAIL') ?: null;

// ---------------------------------------------------------------------
// 2) Fall back to a local secrets file kept OUTSIDE public_html.
//    Adjust $secretsFile below if your account layout differs — on
//    Namecheap cPanel, public_html normally sits directly under your
//    home directory, so "one level up" is correct out of the box.
// ---------------------------------------------------------------------
if ($__stripe_secret_key === null || $__stripe_webhook_secret === null || $__stripe_price_id === null) {
    $secretsFile = dirname(__DIR__, 2) . '/hackera-secrets.php';
    if (is_readable($secretsFile)) {
        require $secretsFile; // expected to define the HACKERA_STRIPE_* constants below
        $__stripe_secret_key    = $__stripe_secret_key    ?? (defined('HACKERA_STRIPE_SECRET_KEY') ? HACKERA_STRIPE_SECRET_KEY : null);
        $__stripe_webhook_secret = $__stripe_webhook_secret ?? (defined('HACKERA_STRIPE_WEBHOOK_SECRET') ? HACKERA_STRIPE_WEBHOOK_SECRET : null);
        $__stripe_price_id      = $__stripe_price_id      ?? (defined('HACKERA_STRIPE_PRICE_ID') ? HACKERA_STRIPE_PRICE_ID : null);
        $__site_url             = $__site_url             ?? (defined('HACKERA_SITE_URL') ? HACKERA_SITE_URL : null);
        $__notify_email         = $__notify_email         ?? (defined('HACKERA_NOTIFY_EMAIL') ? HACKERA_NOTIFY_EMAIL : null);
    }
}

// ---------------------------------------------------------------------
// 3) Safe, non-secret defaults.
// ---------------------------------------------------------------------
if (!defined('STRIPE_SECRET_KEY'))     define('STRIPE_SECRET_KEY', $__stripe_secret_key);
if (!defined('STRIPE_WEBHOOK_SECRET')) define('STRIPE_WEBHOOK_SECRET', $__stripe_webhook_secret);
// The Price ID you gave us is the default, but it can still be overridden
// via env var / secrets file above without touching code.
if (!defined('STRIPE_PRICE_ID'))       define('STRIPE_PRICE_ID', $__stripe_price_id ?: 'price_1UAVyd5NcTQ1F4qiqpSZE36V');
if (!defined('SITE_URL'))              define('SITE_URL', rtrim($__site_url ?: 'https://hackera.online', '/'));
if (!defined('NOTIFY_EMAIL'))          define('NOTIFY_EMAIL', $__notify_email ?: 'ivan@hackera.online');

unset($__stripe_secret_key, $__stripe_webhook_secret, $__stripe_price_id, $__site_url, $__notify_email);

/**
 * Call this at the top of any endpoint that needs Stripe to fail loudly
 * (but safely — no secret values in the message) if setup isn't done yet.
 */
function stripe_require_configured(): void
{
    if (!STRIPE_SECRET_KEY) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Stripe is not configured on the server yet.']);
        exit;
    }
}
