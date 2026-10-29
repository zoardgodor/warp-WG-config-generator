<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function hiba($uzenet, $kod = 400) {
    http_response_code($kod);
    echo json_encode(['error' => $uzenet]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    hiba('Only POST requests are allowed.', 405);
}

if (!function_exists('curl_init')) {
    hiba('cURL is not available on this hosting account.', 500);
}

$nyers = file_get_contents('php://input');
if ($nyers === false || strlen($nyers) > 12000) {
    hiba('Invalid request body.');
}

$adat = json_decode($nyers, true);
if (!is_array($adat)) {
    hiba('Invalid JSON request.');
}

$kulcs = isset($adat['key']) ? trim($adat['key']) : '';
if (!preg_match('/^[A-Za-z0-9+\/]{42}[AEIMQUYcgkosw048]=$/', $kulcs) && !preg_match('/^[A-Za-z0-9+\/]{43}=$/', $kulcs)) {
    if (strlen(base64_decode($kulcs, true) ?: '') !== 32) {
        hiba('Invalid public key.');
    }
}

$tipus = isset($adat['type']) ? substr(trim((string)$adat['type']), 0, 40) : 'Linux';
$modell = isset($adat['model']) ? substr(trim((string)$adat['model']), 0, 80) : 'PC';
$nyelv = isset($adat['locale']) ? substr(trim((string)$adat['locale']), 0, 20) : 'en_US';

$test = [
    'key' => $kulcs,
    'install_id' => '',
    'fcm_token' => '',
    'tos' => gmdate('c'),
    'type' => $tipus ?: 'Linux',
    'model' => $modell ?: 'PC',
    'locale' => $nyelv ?: 'en_US',
    'warp_enabled' => true
];

$curl = curl_init('https://api.cloudflareclient.com/v0a737/reg');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($test),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: okhttp/3.12.1',
        'CF-Client-Version: a-6.30-3594'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 12,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_FOLLOWLOCATION => false
]);

$valasz = curl_exec($curl);
$hiba = curl_error($curl);
$kod = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($valasz === false) {
    hiba('Could not reach the registration API: ' . ($hiba ?: 'connection failed'), 502);
}

$eredmeny = json_decode($valasz, true);
if ($kod < 200 || $kod >= 300 || !is_array($eredmeny)) {
    hiba('WARP registration failed (HTTP ' . $kod . '). The service may have rejected the request or the hosting provider may block it.', 502);
}

if (empty($eredmeny['config']['peers'][0]['public_key']) || empty($eredmeny['config']['interface']['addresses'])) {
    hiba('The registration API response did not contain the expected WireGuard data.', 502);
}

echo json_encode($eredmeny);
?>
