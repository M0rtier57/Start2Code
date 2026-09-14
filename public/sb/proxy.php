<?php
/**
 * Start2Code — Supabase through our own domain.
 *
 * A school or guest network that filters *.supabase.co lets the site itself
 * through (it is on this domain) and then blocks every request the app makes,
 * so nobody can log in. This hands those requests on from here: the browser
 * only ever talks to this domain, and the filter never sees a Supabase address.
 *
 * It is deliberately not a general proxy. The destination is fixed in the file,
 * and only the three Supabase services this app actually uses are allowed
 * through, so it cannot be pointed at anything else by whoever finds it.
 *
 * The app reaches for this by itself, and only after a direct connection has
 * already failed (src/lib/supabaseClient.js) — on a normal network nothing
 * comes through here at all.
 *
 * GET /sb/ping answers without touching Supabase, which is how the app tells
 * "the proxy is installed" from "this host rewrote my request to index.html".
 */

const TARGET = 'https://dzfdjvvwoygulhavwgdy.supabase.co';

/** Only what the app uses: sign-in, the tables, and the project files. */
const ALLOWED_PREFIXES = ['auth/v1/', 'rest/v1/', 'storage/v1/'];

/** Sent on: anything Supabase needs to understand the request. */
const FORWARD_REQUEST = [
    'apikey', 'authorization', 'content-type', 'accept', 'accept-profile',
    'content-profile', 'prefer', 'range', 'if-none-match', 'if-match',
    'x-client-info', 'x-supabase-api-version', 'x-upsert'
];

/** Sent back: everything the client reads, minus the hop-by-hop plumbing. */
const FORWARD_RESPONSE = [
    'content-type', 'content-length', 'content-range', 'content-disposition',
    'etag', 'cache-control', 'retry-after', 'www-authenticate', 'location',
    'x-supabase-api-version'
];

const TIMEOUT_SECONDS = 30;

// -----------------------------------------------------------------------------

$path = requestedPath();

if ($path === 'ping') {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['proxy' => 'ok']);
    exit;
}

if (!allowed($path)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'This proxy only forwards Supabase auth, rest and storage calls.']);
    exit;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$url = TARGET . '/' . $path . ($query !== '' ? '?' . $query : '');

$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST  => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    CURLOPT_HTTPHEADER     => requestHeaders(),
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_HEADER         => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT        => TIMEOUT_SECONDS,
    // Relay the answer as it arrives rather than holding a whole .sb3 in memory.
    CURLOPT_HEADERFUNCTION => 'relayHeader',
    CURLOPT_WRITEFUNCTION  => 'relayBody'
]);

$body = file_get_contents('php://input');
if ($body !== '' && $body !== false) {
    curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
}

curl_exec($curl);
$error = curl_error($curl);
curl_close($curl);

if ($error !== '') {
    // Nothing has been sent yet if the connection itself failed.
    if (!headers_sent()) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Could not reach the database: ' . $error]);
    }
}

// -----------------------------------------------------------------------------

/**
 * The part after /sb/. Taken from the URL rather than from a rewrite parameter,
 * so a host that passes the path differently cannot silently send every request
 * to the same place.
 */
function requestedPath(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $uri = ltrim($uri, '/');

    if (strpos($uri, 'sb/') === 0) {
        $uri = substr($uri, 3);
    }

    // No climbing out of the allowed prefixes with ../
    return str_replace(['../', '..\\'], '', $uri);
}

function allowed(string $path): bool
{
    foreach (ALLOWED_PREFIXES as $prefix) {
        if (strpos($path, $prefix) === 0) {
            return true;
        }
    }
    return false;
}

function requestHeaders(): array
{
    $incoming = [];

    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') !== 0) {
            continue;
        }
        $name = strtolower(str_replace('_', '-', substr($key, 5)));
        $incoming[$name] = $value;
    }

    // Not every server puts these in HTTP_*.
    if (isset($_SERVER['CONTENT_TYPE'])) {
        $incoming['content-type'] = $_SERVER['CONTENT_TYPE'];
    }

    $headers = [];
    foreach (FORWARD_REQUEST as $name) {
        if (isset($incoming[$name]) && $incoming[$name] !== '') {
            $headers[] = $name . ': ' . $incoming[$name];
        }
    }

    // Asking for it uncompressed keeps the relay honest: no content-encoding to
    // pass on, and nothing to re-encode.
    $headers[] = 'Accept-Encoding: identity';

    return $headers;
}

function relayHeader($curl, string $line): int
{
    $length = strlen($line);
    $trimmed = trim($line);

    if ($trimmed === '') {
        return $length;
    }

    if (stripos($trimmed, 'HTTP/') === 0) {
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($status) {
            http_response_code($status);
        }
        return $length;
    }

    $split = strpos($trimmed, ':');
    if ($split === false) {
        return $length;
    }

    $name = strtolower(trim(substr($trimmed, 0, $split)));
    $value = trim(substr($trimmed, $split + 1));

    if (in_array($name, FORWARD_RESPONSE, true)) {
        header($name . ': ' . $value, true);
    }

    return $length;
}

function relayBody($curl, string $chunk): int
{
    echo $chunk;
    return strlen($chunk);
}
