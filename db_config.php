<?php
/**
 * db_config.php – Database connection
 * Update these credentials to match your MySQL setup.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'wanderlust_db');
define('DB_USER', 'root');         // Change to your DB username
define('DB_PASS', '');             // Change to your DB password

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}