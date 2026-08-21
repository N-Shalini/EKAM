<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Honeypot check
    if (!empty($_POST['website'])) {
        header('Location: contact.html?error=1');
        exit;
    }

    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $mobile = isset($_POST['mobile']) ? trim($_POST['mobile']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $eventTypes = isset($_POST['event-type']) && is_array($_POST['event-type']) ? implode(', ', $_POST['event-type']) : '';
    $eventDate = isset($_POST['event-date']) ? trim($_POST['event-date']) : '';
    $venue = isset($_POST['venue']) ? trim($_POST['venue']) : '';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';

    if (empty($name) || empty($mobile)) {
        header('Location: contact.html?error=1');
        exit;
    }

    $to = "ekam.curates@gmail.com";
    $subject = "New Enquiry from $name";
    $body = "Name: $name\nMobile: $mobile\nEmail: $email\nEvent Type: $eventTypes\nEvent Date: $eventDate\nVenue: $venue\nMessage:\n$message\n";
    $headers = "From: webmaster@ekamcurates.com\r\nReply-To: " . ($email ? $email : "no-reply@ekamcurates.com");

    @mail($to, $subject, $body, $headers);

    header('Location: contact.html?sent=1');
    exit;
} else {
    header('Location: contact.html');
    exit;
}
?>
