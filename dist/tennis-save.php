<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$dataDir = __DIR__ . '/tennis-data/';
if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);

// Code must be exactly 6 uppercase alphanumeric characters
$code = preg_replace('/[^A-Z0-9]/', '', strtoupper($_GET['code'] ?? ''));
if (strlen($code) !== 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid room code']);
    exit;
}

$file = $dataDir . $code . '.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($file)) {
        http_response_code(404);
        echo json_encode(['error' => 'Room not found']);
        exit;
    }
    echo file_get_contents($file);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');

    // Sanity-check: must be valid JSON
    if (!json_decode($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // 512 KB limit — a 14-court, 56-player tournament is well under 50 KB
    if (strlen($body) > 524288) {
        http_response_code(413);
        echo json_encode(['error' => 'Payload too large']);
        exit;
    }

    file_put_contents($file, $body, LOCK_EX);
    echo json_encode(['ok' => true, 'code' => $code]);
}
