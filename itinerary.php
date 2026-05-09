<?php
/**
 * save_itinerary.php – Save / retrieve user itineraries
 * Called via AJAX from planner.html
 */

header('Content-Type: application/json');
session_start();
require_once 'db_config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

/* ---- Helper: require login ---- */
function requireLogin() {
    if (empty($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Please log in to save your itinerary.']);
        exit;
    }
}

switch ($action) {

  /* ---- SAVE ITINERARY ---- */
  case 'save':
    requireLogin();
    $userId    = $_SESSION['user_id'];
    $title     = trim($_POST['title'] ?? 'My Trip');
    $data      = $_POST['data'] ?? '';   // JSON string of itinerary data
    $startDate = $_POST['start_date'] ?? null;
    $endDate   = $_POST['end_date'] ?? null;

    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'No itinerary data provided.']);
        exit;
    }

    // Upsert: update existing or insert new
    $stmt = $pdo->prepare('
        INSERT INTO itineraries (user_id, title, data, start_date, end_date, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE title=VALUES(title), data=VALUES(data),
          start_date=VALUES(start_date), end_date=VALUES(end_date), updated_at=NOW()
    ');
    $stmt->execute([$userId, $title, $data, $startDate, $endDate]);

    echo json_encode(['success' => true, 'message' => 'Itinerary saved successfully!']);
    break;

  /* ---- LOAD ITINERARIES ---- */
  case 'load':
    requireLogin();
    $userId = $_SESSION['user_id'];

    $stmt = $pdo->prepare('SELECT id, title, start_date, end_date, updated_at FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    echo json_encode(['success' => true, 'itineraries' => $rows]);
    break;

  /* ---- GET SINGLE ITINERARY ---- */
  case 'get':
    requireLogin();
    $userId = $_SESSION['user_id'];
    $id     = intval($_GET['id'] ?? 0);

    $stmt = $pdo->prepare('SELECT * FROM itineraries WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Itinerary not found.']);
        exit;
    }
    echo json_encode(['success' => true, 'itinerary' => $row]);
    break;

  /* ---- DELETE ITINERARY ---- */
  case 'delete':
    requireLogin();
    $userId = $_SESSION['user_id'];
    $id     = intval($_POST['id'] ?? 0);

    $stmt = $pdo->prepare('DELETE FROM itineraries WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    echo json_encode(['success' => true, 'message' => 'Itinerary deleted.']);
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
}