-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert tài khoản admin
INSERT INTO users (username, password, role) VALUES
('admin', '$2b$10$grvKvvZ2i54DrCdxnhS0peSd7znPvMVHqmqX03tf0tH4sjIUXRGrO', 'admin')
ON DUPLICATE KEY UPDATE password='$2b$10$grvKvvZ2i54DrCdxnhS0peSd7znPvMVHqmqX03tf0tH4sjIUXRGrO';

-- Note: Password đã hash bằng bcrypt với salt rounds 10 cho 'Geotek@2025'