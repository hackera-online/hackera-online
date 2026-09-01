<?php
/**
 * stripe-request.php
 * -----------------------------------------------------------------------
 * A tiny, dependency-free client for the Stripe REST API using PHP's
 * built-in cURL extension. No Composer / Stripe PHP SDK required, so this
 * works on plain shared hosting (Namecheap cPanel) with zero setup beyond
 * PHP + curl, which is standard on every cPanel PHP hosting plan.
 *
 * If you later install the Composer-based Stripe PHP SDK, you can swap
 * calls to stripe_api_request() for the SDK's equivalents without
 * changing any other file.
 */

class StripeApiException extends Exception
{
    public array $body;
    public int $statusCode;

    public function __construct(string $message, int $statusCode, array $body)
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->body = $body;
    }
}

/**
 * Perform a request against the Stripe API.
 *
 * @param string $method GET|POST|DELETE
 * @param string $path   e.g. "/v1/checkout/sessions"
 * @param array  $params Form params (Stripe's API is form-encoded, not JSON)
 * @return array Decoded JSON response body
 * @throws StripeApiException on network error or a 4xx/5xx from Stripe
 */
function stripe_api_request(string $method, string $path, array $params = []): array
{
    $method = strtoupper($method);
    $url = 'https://api.stripe.com' . $path;

    $ch = curl_init();

    if ($method === 'GET' && !empty($params)) {
        $url .= '?' . http_build_query($params);
    }

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERPWD => STRIPE_SECRET_KEY . ':',
        CURLOPT_HTTPHEADER => [
            'Stripe-Version: 2024-06-20',
        ],
        CURLOPT_CUSTOMREQUEST => $method,
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    }

    $responseBody = curl_exec($ch);
    $curlErrno = curl_errno($ch);
    $curlError = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlErrno !== 0) {
        throw new StripeApiException('Network error contacting Stripe: ' . $curlError, 0, []);
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        throw new StripeApiException('Stripe returned an unreadable response.', $statusCode, []);
    }

    if ($statusCode >= 400) {
        $message = $decoded['error']['message'] ?? 'Stripe API error.';
        throw new StripeApiException($message, $statusCode, $decoded);
    }

    return $decoded;
}
