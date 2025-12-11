-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Dec 11, 2025 at 04:15 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cgbas_monitor`
--

-- --------------------------------------------------------

--
-- Table structure for table `command_queue`
--

CREATE TABLE `command_queue` (
  `id` int NOT NULL,
  `device_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `station_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `command_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ON hoặc OFF',
  `trigger_source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'AUTO',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' COMMENT 'PENDING, PROCESSING, VERIFYING, COMPLETED, FAILED, RETRY, CANCELLED',
  `retry_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `error_log` text COLLATE utf8mb4_unicode_ci,
  `verified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `command_queue`
--

INSERT INTO `command_queue` (`id`, `device_id`, `station_name`, `command_type`, `trigger_source`, `status`, `retry_count`, `created_at`, `updated_at`, `error_log`, `verified_at`) VALUES
(3, '10023e4db1', 'AGG1', 'ON', 'AUTO', 'COMPLETED', 0, '2025-12-09 18:03:08', '2025-12-09 18:03:25', NULL, NULL),
(4, '10023e4f66', 'HNI0', 'OFF', 'AUTO', 'COMPLETED', 0, '2025-12-09 18:04:32', '2025-12-09 18:04:51', NULL, NULL),
(5, '10023e4f66', 'HNI0', 'ON', 'AUTO', 'COMPLETED', 0, '2025-12-09 18:05:24', '2025-12-09 18:05:43', NULL, NULL),
(6, '10023e4f66', 'HNI0', 'OFF', 'MANUAL', 'COMPLETED', 2, '2025-12-09 22:08:20', '2025-12-09 22:23:43', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 22:23:42'),
(7, '10023e4f66', 'HNI0', 'ON', 'MANUAL', 'COMPLETED', 0, '2025-12-09 22:24:52', '2025-12-09 22:27:19', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-09 22:27:19'),
(8, '10024cc284', 'BKN2', 'OFF', 'AUTO', 'COMPLETED', 2, '2025-12-09 23:20:57', '2025-12-09 23:34:12', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 23:34:12'),
(9, '10023e46f3', 'BKN5', 'OFF', 'AUTO', 'COMPLETED', 0, '2025-12-09 23:25:57', '2025-12-09 23:28:36', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 23:28:32'),
(11, '10023e360c', 'YBI8', 'ON', 'AUTO', 'COMPLETED', 0, '2025-12-10 10:22:46', '2025-12-10 10:25:17', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-10 10:25:16'),
(12, '10023e4f2d', 'YBI2', 'ON', 'AUTO', 'COMPLETED', 0, '2025-12-11 21:20:31', '2025-12-11 21:22:58', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-11 21:22:57'),
(13, '10023e360c', 'YBI8', 'OFF', 'AUTO', 'RETRY', 2, '2025-12-11 23:08:03', '2025-12-11 23:13:08', 'Thiết bị đang Offline. Đợi thử lại sau...', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ewelink_devices`
--

CREATE TABLE `ewelink_devices` (
  `device_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `online` tinyint(1) DEFAULT NULL COMMENT '1: Online, 0: Offline',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `firmware` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rssi` int DEFAULT NULL COMMENT 'Tín hiệu WiFi (dBm)',
  `mac` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uiid` int DEFAULT NULL,
  `ch1_status` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ch2_status` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ch1_power` decimal(10,2) DEFAULT '0.00',
  `ch2_power` decimal(10,2) DEFAULT '0.00',
  `voltage` decimal(10,2) DEFAULT '0.00',
  `ch1_current` decimal(10,2) DEFAULT '0.00',
  `ch2_current` decimal(10,2) DEFAULT '0.00',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ewelink_devices`
--

INSERT INTO `ewelink_devices` (`device_id`, `name`, `online`, `model`, `brand`, `firmware`, `rssi`, `mac`, `uiid`, `ch1_status`, `ch2_status`, `ch1_power`, `ch2_power`, `voltage`, `ch1_current`, `ch2_current`, `last_updated`) VALUES
('10014366c6', 'CMU4 Cái Nước Cà Mau', 1, 'DUALR3', 'SONOFF', '', -14, '', NULL, 'off', 'off', 0.00, 0.00, 22717.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('1001436808', 'CMU4 Cái Nước SW2', 1, 'DUALR3', 'SONOFF', '', -12, '', NULL, 'off', 'off', 1388.00, 0.00, 22480.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('100143692f', 'KGG1 Giồng Riềng SW2', 1, 'DUALR3', 'SONOFF', '', -38, '', NULL, 'on', 'off', 86.00, 0.00, 21489.00, 1.00, 0.00, '2025-12-11 23:11:02'),
('100143710e', 'Vĩnh Thuận', 1, 'DUALR3', 'SONOFF', '', -55, '', NULL, 'off', 'off', 0.00, 0.00, 22824.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100143712f', 'Nhanh', 0, 'DUALR3', 'SONOFF', '', -61, '', NULL, 'off', 'off', 0.00, 0.00, 23389.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('1001437aed', 'KGG5 Nam Du SW2', 1, 'DUALR3', 'SONOFF', '', -51, '', NULL, 'off', 'off', 0.00, 0.00, 21760.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100155b259', 'KGG1 Giồng Riềng KG', 1, 'DUALR3', 'SONOFF', '', -39, '', NULL, 'off', 'off', 1295.00, 0.00, 22187.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('100155b2f7', 'D Hải (Dự phòng)', 0, 'DUALR3', 'SONOFF', '', -77, '', NULL, 'off', 'off', 0.00, 0.00, 22336.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100155b3cb', 'VĩnhThuận(dự phg)', 0, 'DUALR3', 'SONOFF', '', -54, '', NULL, 'off', 'off', 0.00, 0.00, 22521.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100155b3ff', 'KGG5 Nam Du KG', 1, 'DUALR3', 'SONOFF', '', -54, '', NULL, 'off', 'off', 0.00, 0.00, 21856.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100155b401', 'PYN1 Tuy Hòa, Phú Yên', 0, 'DUALR3', 'SONOFF', '', -35, '', NULL, 'off', 'off', 1544.00, 0.00, 24311.00, 10.00, 0.00, '2025-12-11 23:11:02'),
('100155bb15', 'CMU2 Đầm Dơi Cà Mau', 1, 'DUALR3', 'SONOFF', '', -47, '', NULL, 'off', 'off', 1334.00, 0.00, 22428.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('1001e5daf8', 'Trạm Anh Hoàng Vĩnh Long', 0, 'BASICR2', 'SONOFF', '', -52, '', NULL, 'off', 'N/A', 0.00, 0.00, 0.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('1001e61e4b', 'TRAM TAM NONG', 0, 'BASICR2', 'SONOFF', '', -68, '', NULL, 'off', 'N/A', 0.00, 0.00, 0.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100206369a', 'Trạm Bình Thuận', 1, 'DUALR3', 'SONOFF', '', -50, '', NULL, 'on', 'off', 1751.00, 0.00, 23413.00, 11.00, 0.00, '2025-12-11 23:11:02'),
('1002063d06', 'DTP4 Cao Lãnh Đồng Tháp', 1, 'DUALR3', 'SONOFF', '', -50, '', NULL, 'off', 'off', 1550.00, 0.00, 22589.00, 9.00, 0.00, '2025-12-11 23:11:02'),
('1002064b63', 'Duyên Hải', 1, 'DUALR3', 'SONOFF', '', -52, '', NULL, 'off', 'off', 0.00, 0.00, 22133.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('1002064dd1', 'VPDK Kế Sách', 0, 'DUALR3', 'SONOFF', '', -86, '', NULL, 'on', 'off', 0.00, 0.00, 22492.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('1002064e17', 'TP - Trà Vinh', 1, 'DUALR3', 'SONOFF', '', -69, '', NULL, 'off', 'off', 1907.00, 0.00, 24332.00, 11.00, 0.00, '2025-12-11 23:11:02'),
('1002359f86', 'HUG2 Vị Thủy HG', 1, 'DUALR3', 'SONOFF', '', -46, '', NULL, 'on', 'off', 2331.00, 0.00, 23671.00, 11.00, 0.00, '2025-12-11 23:11:02'),
('1002359f89', 'HNI3 Quốc Oai', 0, 'DUALR3', 'SONOFF', '', -2, '', NULL, 'on', 'off', 1127.00, 0.00, 22154.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('100235b6ce', 'Tủ nguồn 02', 0, 'DUALR3', 'SONOFF', '', -52, '', NULL, 'on', 'off', 2215.00, 0.00, 23714.00, 11.00, 0.00, '2025-12-11 23:11:02'),
('100235c154', 'TGG2 Châu Thành Bến Tre', 1, 'DUALR3', 'SONOFF', '', -77, '', NULL, 'off', 'off', 0.00, 0.00, 23760.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100235c183', 'LSN2 Lộc Bình LS', 1, 'DUALR3', 'SONOFF', '', -73, '', NULL, 'off', 'off', 1499.00, 0.00, 24561.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('100235c5fc', 'Son La', 0, 'DUALR3', 'SONOFF', '', -47, '', NULL, 'on', 'off', 0.00, 0.00, 22730.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100235c65e', 'NAN-a', 0, 'DUALR3', 'SONOFF', '', -24, '', NULL, 'on', 'off', 0.00, 0.00, 22771.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100235c700', 'tủ nguồn 04 1125', 0, 'DUALR3', 'SONOFF', '', -50, '', NULL, 'on', 'off', 0.00, 0.00, 23900.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('100235c705', 'CTO2 Geotex Cần Thơ', 1, 'DUALR3', 'SONOFF', '', -39, '', NULL, 'off', 'off', 2067.00, 0.00, 24394.00, 9.00, 0.00, '2025-12-11 23:11:02'),
('10023e35a4', 'BNH1 Gia Bình Bắc Ninh', 0, 'DUALR3', 'SONOFF', '', -4, '', NULL, 'on', 'off', 1290.00, 0.00, 23509.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e360c', 'YBI8_Mù Căng Chải', 0, 'DUALR3', 'SONOFF', '', -54, '', NULL, 'on', 'off', 548.00, 0.00, 23176.00, 5.00, 0.00, '2025-12-11 23:11:02'),
('10023e3621', 'HPG2_Vĩnh Bảo', 1, 'DUALR3', 'SONOFF', '', -53, '', NULL, 'off', 'off', 1206.00, 0.00, 22253.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e363e', 'HDG_Chí Linh', 1, 'DUALR3', 'SONOFF', '', -24, '', NULL, 'off', 'off', 0.00, 0.00, 24333.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e3736', 'TNN1_TP Thái Nguyen', 1, 'DUALR3', 'SONOFF', '', -68, '', NULL, 'off', 'off', 936.00, 0.00, 22487.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e38e0', 'PYN6 Sông Hinh', 1, 'DUALR3', 'SONOFF', '', -91, '', NULL, 'off', 'off', 1262.00, 0.00, 24123.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e3915', 'BKN1 Na Rì', 0, 'DUALR3', 'SONOFF', '', -56, '', NULL, 'on', 'off', 986.00, 0.00, 22694.00, 5.00, 0.00, '2025-12-11 23:11:02'),
('10023e3df1', 'YBI5_Lục Yên', 1, 'DUALR3', 'SONOFF', '', -76, '', NULL, 'off', 'off', 2536.00, 0.00, 23608.00, 13.00, 0.00, '2025-12-11 23:11:02'),
('10023e3e21', 'BGG3 Đồi Ngô Bắc Giang', 0, 'DUALR3', 'SONOFF', '', -12, '', NULL, 'on', 'off', 1244.00, 0.00, 23038.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e44fa', 'HPG3 Văn Phòng An Dương', 1, 'DUALR3', 'SONOFF', '', -78, '', NULL, 'off', 'off', 1291.00, 0.00, 23705.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e46f3', 'BKN5 Tp Bắc Kạn', 1, 'DUALR3', 'SONOFF', '', -11, '', NULL, 'off', 'off', 1264.00, 0.00, 24118.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4acc', 'QNH5_Hạ Long_2', 1, 'DUALR3', 'SONOFF', '', -17, '', NULL, 'off', 'off', 582.00, 0.00, 23367.00, 4.00, 0.00, '2025-12-11 23:11:02'),
('10023e4ace', 'YBI7_Văn Yên', 1, 'DUALR3', 'SONOFF', '', -42, '', NULL, 'off', 'off', 1141.00, 0.00, 22268.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4ad5', 'Tủ nguồn 6', 0, 'DUALR3', 'SONOFF', '', -63, '', NULL, 'off', 'off', 0.00, 0.00, 23445.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4ad9', 'BKN6 Chợ Đồn Bắc Kạn', 1, 'DUALR3', 'SONOFF', '', -3, '', NULL, 'off', 'off', 1162.00, 0.00, 24438.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('10023e4b38', 'AGG4 Tri Tôn An Giang', 1, 'DUALR3', 'SONOFF', '', -62, '', NULL, 'off', 'off', 1393.00, 0.00, 24503.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4ba6', 'SLA2_Mộc Châu ', 1, 'DUALR3', 'SONOFF', '', -53, '', NULL, 'off', 'off', 1024.00, 0.00, 23456.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4d12', 'TNN6_Định Hóa ', 1, 'DUALR3', 'SONOFF', '', -27, '', NULL, 'off', 'off', 0.00, 0.00, 25094.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4d13', 'NDH1 Tp Nam Định', 1, 'DUALR3', 'SONOFF', '', -24, '', NULL, 'off', 'off', 0.00, 0.00, 23379.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4d2a', 'YBI6_Trạm Tấu', 1, 'DUALR3', 'SONOFF', '', -47, '', NULL, 'off', 'off', 1125.00, 0.00, 24804.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('10023e4d31', 'YBI1 TP YEN BAI', 1, 'DUALR3', 'SONOFF', '', -68, '', NULL, 'off', 'off', 920.00, 0.00, 22782.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e4daa', 'Hp', 0, 'DUALR3', 'SONOFF', '', -51, '', NULL, 'off', 'off', 0.00, 0.00, 20846.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4db1', 'AGG1 Lấp Vò Đồng Tháp', 1, 'DUALR3', 'SONOFF', '', -47, '', NULL, 'off', 'off', 716.00, 0.00, 23504.00, 4.00, 0.00, '2025-12-11 23:11:02'),
('10023e4dbb', 'SL12_TP Sơn La', 1, 'DUALR3', 'SONOFF', '', -75, '', NULL, 'off', 'off', 0.00, 0.00, 23301.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4dc3', 'HPG01_VP_W1', 1, 'DUALR3', 'SONOFF', '', -74, '', NULL, 'off', 'off', 969.00, 0.00, 22607.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e4de2', 'TNN5_Phổ Yên', 1, 'DUALR3', 'SONOFF', '', -24, '', NULL, 'off', 'off', 1239.00, 0.00, 22961.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e4e12', 'YBI4_Nghĩa Lộ', 1, 'DUALR3', 'SONOFF', '', -40, '', NULL, 'off', 'off', 986.00, 0.00, 22611.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e4e2f', 'TNN4_Đại Từ', 1, 'DUALR3', 'SONOFF', '', -12, '', NULL, 'off', 'off', 1271.00, 0.00, 23457.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f2d', 'YBI2_Xuân Ai, Văn Yên', 1, 'DUALR3', 'SONOFF', '', -82, '', NULL, 'off', 'off', 566.00, 0.00, 24333.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f59', 'DTP3 Tân Hồng Đồng Tháp', 1, 'DUALR3', 'SONOFF', '', -58, '', NULL, 'off', 'off', 2405.00, 0.00, 25169.00, 11.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f5d', 'TNN3_Võ Nhai', 1, 'DUALR3', 'SONOFF', '', -63, '', NULL, 'off', 'off', 1490.00, 0.00, 24173.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f5f', 'VLG1 TP Vĩnh Long', 1, 'DUALR3', 'SONOFF', '', -70, '', NULL, 'off', 'off', 1613.00, 0.00, 23183.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f64', 'HYN1_Ân Thi Hưng Yên', 1, 'DUALR3', 'SONOFF', '', -26, '', NULL, 'off', 'off', 1506.00, 0.00, 22689.00, 8.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f65', 'QNH5_Hạ Long_1', 0, 'DUALR3', 'SONOFF', '', -85, '', NULL, 'on', 'off', 0.00, 0.00, 23767.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f66', 'HNI0_Cầu Giấy', 1, 'DUALR3', 'SONOFF', '', -81, '', NULL, 'off', 'off', 1025.00, 0.00, 23397.00, 5.00, 0.00, '2025-12-11 23:11:02'),
('10023e4f67', 'HPG01_VP_W2', 1, 'DUALR3', 'SONOFF', '', -87, '', NULL, 'off', 'off', 0.00, 0.00, 21804.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10024cc11f', 'BGG1 Tp Bắc Giang', 0, 'DUALR3', 'SONOFF', '', -11, '', NULL, 'on', 'off', 735.00, 0.00, 24304.00, 4.00, 0.00, '2025-12-11 23:11:02'),
('10024cc284', 'BKN2 Ba bể', 1, 'DUALR3', 'SONOFF', '', -16, '', NULL, 'off', 'off', 1492.00, 0.00, 24863.00, 7.00, 0.00, '2025-12-11 23:11:02'),
('10024cc29a', 'THA4_Thọ Xuân, Thanh Hóa', 1, 'DUALR3', 'SONOFF', '', -56, '', NULL, 'off', 'off', 1215.00, 0.00, 23032.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10024cc8e0', 'HDG2_Gia Lộc', 1, 'DUALR3', 'SONOFF', '', -11, '', NULL, 'on', 'off', 683.00, 0.00, 23374.00, 4.00, 0.00, '2025-12-11 23:11:02'),
('10026b57c6', 'QBH3 - Lệ Thủy, Quảng Bình', 1, 'DUALR3', 'SONOFF', '', -15, '', NULL, 'off', 'off', 1295.00, 0.00, 24017.00, 6.00, 0.00, '2025-12-11 23:11:02'),
('10026b6625', 'tủ nguồn 03 1125', 0, 'DUALR3', 'SONOFF', '', -35, '', NULL, 'on', 'off', 0.00, 0.00, 23506.00, 0.00, 0.00, '2025-12-11 23:11:02'),
('10026b6626', 'tủ nguồn 02 1125', 0, 'DUALR3', 'SONOFF', '', -37, '', NULL, 'on', 'off', 0.00, 0.00, 23557.00, 0.00, 0.00, '2025-12-11 23:11:02');

-- --------------------------------------------------------

--
-- Table structure for table `stations`
--

CREATE TABLE `stations` (
  `station_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `station_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `identification_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Địa điểm',
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `receiver_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `connect_status` int DEFAULT NULL COMMENT '1: Online, Khác: Offline',
  `ewelink_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID thiết bị phần cứng',
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP,
  `automation_status` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stations`
--

INSERT INTO `stations` (`station_id`, `station_name`, `identification_name`, `lat`, `lng`, `receiver_type`, `connect_status`, `ewelink_id`, `last_updated`, `automation_status`) VALUES
('10', 'PYN1', 'Tuy Hoà', 13.06536887388889, 109.33150530777779, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('15', 'QNH5', 'Nhà cậu a Dũng - Hạ Long|Toản - 0934496886', 20.94945477111111, 107.1072756686111, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('16', 'SL12', 'Nhà anh Tân - Tp Son La| Anh Tân - 0335027798', 21.32203734722222, 103.91525562222222, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('17', 'SLA2', 'Nhà a Trung - Mộc Châu - Sơn La|A Trung - 0976698698', 20.84681692472222, 104.63940302916669, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('19', 'TNN1', 'Nhà A Hưng râu - TP Thái Nguyên|A Hưng - 0982892196', 21.573653528333338, 105.8402919572222, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('2', 'CTO1', 'Trạm Ô Môn', 10.0675, 105.66691666666668, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('20', 'TNN3', 'Nhà anh Thoi - Võ Nhai|Anh Việt - 0353177492', 21.75413356, 106.07747531916668, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('21', 'TNN4', 'vpdkdd Đại Từ|Đỗ Đình Long - 0355055740', 21.633503577499997, 105.63708271499999, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('22', 'TNN5', 'Nhà anh Long - Phổ Yên|Anh Long - 0986650808', 21.416232244166668, 105.86204897916669, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('23', 'TNN6', 'Nhà anh Phú - Định hoá| a Phú - 0867666929', 21.911147277500003, 105.64930905388889, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('24', 'TVH1', 'Trạm TP-TraVinh', 9.97435346111111, 106.35228861388887, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('25', 'VLG1', 'Trạm Vĩnh Long', 10.236670697222223, 105.93118046666667, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('26', 'YBI1', 'Nhà a Việt Béo - TP Yên bái|A Việt - 0947366066', 21.711390815555554, 104.90687266111111, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('27', 'YBI2', 'Nhà anh Tuấn - Văn Yên|Anh Tuấn - 0963844634', 21.850058284166664, 104.70566167916667, 'CHC', 3, '10023e4f2d', '2025-12-11 23:11:02', 1),
('28', 'YBI4', 'Nhà bố mẹ vợ anh Hiếu| Anh Hiếu - 0868334383', 21.60156285361111, 104.51197793388891, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('29', 'YBI5', 'VP ban quan lý dự án Lục Yên|Hải - 0378639689', 22.111581580555555, 104.76650895083333, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('3', 'HNI0', 'VP Hà Nội - 216 Trung Kính', 20.994563382777777, 105.79917258388889, 'CHC', 3, '10023e4f66', '2025-12-11 23:11:02', 0),
('30', 'YBI6', 'Nhà con gái a Tuấn - Trạm Tấu|A Tuấn - 0859596050', 21.46598854777778, 104.38109117944447, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('31', 'YBI7', 'Nhà anh Chiến - Văn Yên|A Chiến - 0977886300', 21.96978893972222, 104.56571339777777, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('32', 'YBI8', 'Nhà anh Tuân - Mù Cang Chải|A Tuân - 0987019029', 21.851307787777777, 104.08920803694444, 'CHC', 1, '10023e360c', '2025-12-11 23:11:02', 1),
('34', 'THA4', 'Tho Xuan, Thanh Hoa', 19.87453401388889, 105.46313930777778, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('35', 'NDH1', 'Tp Nam Định', 20.444342780833335, 106.21418920055555, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('36', 'BGG3', 'tt Đồi Ngô', 21.311513981944444, 106.3864189386111, 'CHC P5U', 3, '10023e3e21', '2025-12-11 23:11:02', 0),
('37', 'HNI3', 'Quốc Oai, Hà Nội', 20.92616439472222, 105.60029841527776, 'CHC P5U', 1, '1002359f89', '2025-12-11 23:11:02', 0),
('39', 'HNI4', 'Sóc Sơn|Thầy Trung', 21.234666165367514, 105.7638672494069, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('4', 'HPG1', 'VP Hải Phòng - 136 Dương Đình Nghệ', 20.830434236111113, 106.67063354194444, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('40', 'KGG2', 'Phú Quốc', 10.25054035134495, 103.9946727538428, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('41', 'KGG3', 'Phú Quốc 2|Thầy Trung', 10.043995784752028, 104.00835367062469, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('42', 'PTO6', 'Vĩnh Yên|Thầy Trung', 21.319784368747705, 105.61333192572637, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('44', 'TQG4', 'TP Tuyên Quang|Thầy Chung', 21.561395499038234, 105.2694292220386, 'CHC P5U', 2, NULL, '2025-12-11 23:11:02', 0),
('46', 'CMU4', 'Cái Nước, Cà Mau', 8.928867686111111, 105.05431737777776, 'CHC P5U', 0, NULL, '2025-12-11 23:11:02', 0),
('48', 'AGG4', 'Tri Tôn, An Giang', 10.426359919444444, 105.00377233333333, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('49', 'BTN1', 'Vĩnh Tiến, Bình Thuận', 11.309630038888889, 108.78121213611111, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('5', 'HPG2', 'Nhà a Cương - Vĩnh Bảo|Hưng - 0379527233', 20.719294399444443, 106.46120752166665, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('51', 'CTO2', 'Ninh Kiều, Cần Thơ', 10.04844230277778, 105.78338580277776, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('52', 'NAN2', 'Yên Thành, Nghệ An', 18.954837730555553, 105.45334151111113, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('53', 'DTP4', 'CaoLanh-DongThap', 10.466130966666668, 105.64679365833334, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('54', 'HDG2', 'Gia Lộc Hải Dương', 20.873108210555554, 106.27970494694445, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('55', 'HDG1', 'Chí Linh Hải Dương', 21.13751340111111, 106.42735374166668, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('56', 'BKN2', 'Ba bể', 22.455140968333335, 105.72247775944444, 'CHC P5U', 3, '10024cc284', '2025-12-11 23:11:02', 1),
('57', 'AGG1', 'Lấp Vò, Đồng Tháp', 10.364767827777777, 105.58307684444443, 'CHC P5U', 3, '10023e4db1', '2025-12-11 23:11:02', 0),
('58', 'BKN1', 'Na Rì', 22.23776060916666, 106.18305597083334, 'CHC P5U', 1, '10023e3915', '2025-12-11 23:11:02', 0),
('59', 'BKN5', 'Tp Bắc Kạn', 22.152687676944442, 105.84053144583334, 'CHC P5U', 3, '10023e46f3', '2025-12-11 23:11:02', 1),
('6', 'HPG3', 'An Dương', 20.867606863888888, 106.61829600555554, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('60', 'BKN6', 'Chợ Đồn Bắc Kạn', 22.15629272388889, 105.5956881088889, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('61', 'DTP3', 'Tân Hồng, Đồng Tháp', 10.870782709444445, 105.46636794194445, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('62', 'PYN6', 'Trạm Sông Hinh, Phú Yên', 12.990773838888888, 108.8895583638889, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('63', 'BNH1', 'Gia Bình, Bắc Ninh', 21.050511636944446, 106.17557031388891, 'CHC P5U', 1, '10023e35a4', '2025-12-11 23:11:02', 0),
('64', 'BGG1', 'tp Bac Giang', 21.279629543611108, 106.21233417666666, 'CHC P5U', 3, '10024cc11f', '2025-12-11 23:11:02', 0),
('65', 'CMU2', 'Đầm Dơi, Cà Mau', 8.988275072222223, 105.20691520277778, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('66', 'TGG2', 'Châu Thành, Bến Tre', 10.29576265, 106.35644650277777, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('67', 'KGG5', 'Đảo Nam Du, Kiên Giang', 9.668539952777778, 104.3994903888889, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('68', 'LSN2', 'Lộc Bình', 21.755723222222226, 106.926685065, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('69', 'QBH3', 'Lệ Thủy, Quảng Bình', 17.240949440833333, 106.81627814527778, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('7', 'HYN1', 'Nhà a Hữu - bạn a Dũng - Ân Thi|A Hữu - 0979514287', 20.828243766944446, 106.08992895277778, 'CHC', 3, NULL, '2025-12-11 23:11:02', 0),
('70', 'QBH7', 'Quảng Ninh, Quảng Bình', 17.38561633277778, 106.65494590222222, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('72', 'Demo', 'Trạm test thầy Trung', 20.994565746666666, 105.79916236277779, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('73', 'LCI7', 'Sa pa | A Công', 22.33870799, 103.84191782638888, 'CHC P5U', 3, NULL, '2025-12-11 23:11:02', 0),
('74', 'HUG2', 'Vị Thủy, Hậu Giang', 9.750906305555555, 105.52865463888888, 'CHC P5U', 1, NULL, '2025-12-11 23:11:02', 0),
('75', 'luan', NULL, 20.994563382777777, 105.79917258388889, 'CHC P5U', 2, NULL, '2025-12-11 23:11:02', 0),
('8', 'KGG1', 'Giồng Riềng', 9.910623722222223, 105.30918593333334, 'CHC', 1, NULL, '2025-12-11 23:11:02', 0);

-- --------------------------------------------------------

--
-- Table structure for table `station_logs`
--

CREATE TABLE `station_logs` (
  `id` int NOT NULL,
  `station_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `station_logs`
--

INSERT INTO `station_logs` (`id`, `station_name`, `device_id`, `action`, `source`, `result`, `message`, `created_at`) VALUES
(1, 'HNI0', '10023e4f66', 'OFF', 'MANUAL', 'SUCCESS', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 22:23:43'),
(2, 'HNI0', '10023e4f66', 'ON', 'MANUAL', 'SUCCESS', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-09 22:27:19'),
(3, 'BKN5', '10023e46f3', 'OFF', 'AUTO', 'SUCCESS', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 23:28:36'),
(4, 'BKN2', '10024cc284', 'OFF', 'AUTO', 'SUCCESS', 'Xác thực TẮT thành công (CGBAS Off + CH1 Off)', '2025-12-09 23:34:12'),
(5, 'YBI8', '10023e360c', 'ON', 'AUTO', 'SUCCESS', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-10 10:25:17'),
(6, 'YBI2', '10023e4f2d', 'ON', 'AUTO', 'SUCCESS', 'Xác thực BẬT thành công (CGBAS On + CH1 On)', '2025-12-11 21:22:58');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `created_at`) VALUES
(1, 'admin', '$2b$10$grvKvvZ2i54DrCdxnhS0peSd7znPvMVHqmqX03tf0tH4sjIUXRGrO', 'admin', '2025-12-11 14:34:16');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `command_queue`
--
ALTER TABLE `command_queue`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ewelink_devices`
--
ALTER TABLE `ewelink_devices`
  ADD PRIMARY KEY (`device_id`);

--
-- Indexes for table `stations`
--
ALTER TABLE `stations`
  ADD PRIMARY KEY (`station_id`);

--
-- Indexes for table `station_logs`
--
ALTER TABLE `station_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `command_queue`
--
ALTER TABLE `command_queue`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `station_logs`
--
ALTER TABLE `station_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
