<?php
/**
 * Feed-In Tournament shared-room backend.
 *
 * Storage: one JSON file per 6-character room code, in ./tennis-data/.
 *
 * Endpoints (relative to where this file is deployed):
 *   GET  ?code=ABC123          -> returns the room JSON (public read).
 *   POST ?code=ABC123          -> overwrites the room JSON. If the room is
 *                                 PIN-protected, requires X-Tournament-Pin
 *                                 header matching the stored hash.
 *   POST ?code=ABC123&check=1  -> verifies the PIN without writing. Returns
 *                                 200 on success, 403 on failure.
 *
 * The PIN is hashed client-side (SHA-256 with a static prefix) and stored in
 * the room JSON under tournament.pinHash. The server compares hashes only.
 */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Tournament-Pin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$dataDir = __DIR__ . '/tennis-data/';
if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);

// Code must be exactly 6 alphanumeric characters from the safe alphabet
$code = preg_replace('/[^A-Z0-9]/', '', strtoupper($_GET['code'] ?? ''));
if (strlen($code) !== 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid room code']);
    exit;
}

$file = $dataDir . $code . '.json';

function existing_pin_hash($file) {
    if (!file_exists($file)) return null;
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    if (!is_array($data)) return null;
    if (!isset($data['tournament']) || !is_array($data['tournament'])) return null;
    $hash = $data['tournament']['pinHash'] ?? null;
    return is_string($hash) && $hash !== '' ? $hash : null;
}

function client_pin_hash() {
    // The client sends the raw PIN; we hash it here with the same scheme
    // used in src/utils/share.js (`feedin:` + pin, SHA-256, lowercase hex).
    $pin = $_SERVER['HTTP_X_TOURNAMENT_PIN'] ?? '';
    if ($pin === '') return null;
    return hash('sha256', 'feedin:' . $pin);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!file_exists($file)) {
        http_response_code(404);
        echo json_encode(['error' => 'Room not found']);
        exit;
    }
    echo file_get_contents($file);
    exit;
}

if ($method === 'POST') {
    $isCheck = isset($_GET['check']);
    $existingHash = existing_pin_hash($file);

    // PIN check on write: only enforced if a hash already exists for this room.
    if ($existingHash !== null) {
        $providedHash = client_pin_hash();
        if ($providedHash !== $existingHash) {
            http_response_code(403);
            echo json_encode(['error' => 'Wrong or missing PIN']);
            exit;
        }
    }

    if ($isCheck) {
        echo json_encode(['ok' => true]);
        exit;
    }

    $body = file_get_contents('php://input');
    if ($body === false || $body === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Empty body']);
        exit;
    }

    $parsed = json_decode($body, true);
    if (!is_array($parsed)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // Reject attempts to change the pin hash without first matching the old one.
    // (existing_pin_hash() above already enforced "must know current pin to write".)
    if ($existingHash !== null) {
        $newHash = $parsed['tournament']['pinHash'] ?? null;
        if (!is_string($newHash) || $newHash === '') {
            // Don't let a writer null out the pin hash they just authenticated against.
            $parsed['tournament']['pinHash'] = $existingHash;
            $body = json_encode($parsed);
        }
    }

    if (strlen($body) > 524288) { // 512 KB
        http_response_code(413);
        echo json_encode(['error' => 'Payload too large']);
        exit;
    }

    file_put_contents($file, $body, LOCK_EX);
    echo json_encode(['ok' => true, 'code' => $code]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
