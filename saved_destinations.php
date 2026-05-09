<?php


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
session_start();
require_once 'db_config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

/* ---- Helper: require login ---- */
function requireLogin() {
    if (empty($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Please log in to save destinations.']);
        exit;
    }
}

switch ($action) {

  /* ---- SAVE DESTINATION ---- */
  case 'save':
    requireLogin();
    $userId   = $_SESSION['user_id'];
    $city     = trim($_POST['city']     ?? '');
    $country  = trim($_POST['country']  ?? '');
    $imageUrl = trim($_POST['image_url'] ?? '');
    $notes    = trim($_POST['notes']    ?? '');

    if (!$city || !$country) {
        echo json_encode(['success' => false, 'message' => 'City and country are required.']);
        exit;
    }

    // Check if already saved
    $check = $pdo->prepare('SELECT id FROM saved_destinations WHERE user_id = ? AND city = ? AND country = ?');
    $check->execute([$userId, $city, $country]);
    if ($check->fetch()) {
        echo json_encode(['success' => false, 'message' => $city . ' is already in your wishlist.']);
        exit;
    }

    $stmt = $pdo->prepare('
        INSERT INTO saved_destinations (user_id, city, country, image_url, notes, saved_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ');
    $stmt->execute([$userId, $city, $country, $imageUrl, $notes]);

    echo json_encode(['success' => true, 'message' => $city . ' saved to your wishlist!', 'id' => $pdo->lastInsertId()]);
    break;

  /* ---- LOAD SAVED DESTINATIONS ---- */
  case 'load':
    requireLogin();
    $userId = $_SESSION['user_id'];

    $stmt = $pdo->prepare('SELECT * FROM saved_destinations WHERE user_id = ? ORDER BY saved_at DESC');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    echo json_encode(['success' => true, 'destinations' => $rows]);
    break;

  /* ---- DELETE SAVED DESTINATION ---- */
  case 'delete':
    requireLogin();
    $userId = $_SESSION['user_id'];
    $id     = intval($_POST['id'] ?? 0);

    $stmt = $pdo->prepare('DELETE FROM saved_destinations WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    echo json_encode(['success' => true, 'message' => 'Destination removed from wishlist.']);
    break;

  /* ---- CHECK IF DESTINATION IS SAVED ---- */
  case 'check':
    requireLogin();
    $userId  = $_SESSION['user_id'];
    $city    = trim($_GET['city']    ?? '');
    $country = trim($_GET['country'] ?? '');

    $stmt = $pdo->prepare('SELECT id FROM saved_destinations WHERE user_id = ? AND city = ? AND country = ?');
    $stmt->execute([$userId, $city, $country]);
    $row = $stmt->fetch();

    echo json_encode(['success' => true, 'saved' => (bool)$row, 'id' => $row ? $row['id'] : null]);
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
}