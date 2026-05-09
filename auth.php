<?php
/**
 * auth.php – Wanderlust Login / Signup Handler
 * Handles AJAX requests from the frontend.
 * Connects to MySQL database defined in db_config.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_config.php';

$action = $_POST['action'] ?? '';

switch ($action) {

  /* ---- SIGN UP ---- */
  case 'signup':
    $name     = trim($_POST['name'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$name || !$email || !$password) {
      echo json_encode(['success' => false, 'message' => 'All fields are required.']);
      exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
      exit;
    }
    if (strlen($password) < 6) {
      echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']);
      exit;
    }

    // Check existing user
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
      echo json_encode(['success' => false, 'message' => 'Email already registered.']);
      exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())');
    $stmt->execute([$name, $email, $hash]);

    session_start();
    $_SESSION['user_id']   = $pdo->lastInsertId();
    $_SESSION['user_name'] = $name;

    echo json_encode(['success' => true, 'message' => 'Account created! Welcome, ' . htmlspecialchars($name) . '.']);
    break;

  /* ---- LOGIN ---- */
  case 'login':
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$email || !$password) {
      echo json_encode(['success' => false, 'message' => 'Email and password required.']);
      exit;
    }

    $stmt = $pdo->prepare('SELECT id, name, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
      echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
      exit;
    }

    session_start();
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['name'];

    echo json_encode(['success' => true, 'message' => 'Welcome back, ' . htmlspecialchars($user['name']) . '!']);
    break;

  /* ---- LOGOUT ---- */
  case 'logout':
    session_start();
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out.']);
    break;

  default:
    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
}