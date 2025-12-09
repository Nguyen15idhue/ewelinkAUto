TÀI LIỆU MÔ TẢ MÃ NGUỒN HIỆN TẠI
1. Kiến Trúc Hệ Thống
Hệ thống hoạt động theo mô hình Producer-Consumer tách biệt:
Producer (index.js): Quét dữ liệu, hiển thị Web, ra quyết định và đẩy lệnh vào hàng chờ (Queue).
Consumer (queue-worker.js): Chạy ngầm, lấy lệnh từ hàng chờ và thực thi điều khiển phần cứng.
Database (MySQL): Là nơi trung gian lưu trữ trạng thái và hàng chờ.
2. Cơ Sở Dữ Liệu (MySQL: cgbas_monitor)
Hiện tại có 3 bảng chính:
stations: Lưu thông tin trạm phần mềm.
station_id (PK), station_name.
connect_status: Trạng thái CGBAS (1: Online, Khác: Offline).
ewelink_id: Khóa ngoại liên kết với bảng device (do người dùng gán trên Web).
automation_status: Cờ bật/tắt tự động (1: Bật, 0: Tắt).
ewelink_devices: Lưu thông tin phần cứng (Sync từ eWeLink về).
device_id (PK), name.
online: Trạng thái Cloud (1: Online, 0: Offline).
rssi (Sóng WiFi), voltage (Điện áp), ch1_status, ch2_status.
command_queue: Hàng chờ lệnh.
id, device_id, command_type (ON/OFF).
status: 'PENDING', 'PROCESSING', 'COMPLETED', 'RETRY', 'FAILED'.
retry_count, error_log.
3. Chi Tiết Các File Mã Nguồn
A. Thư mục gốc (Root)
File	Chức năng chi tiết
index.js	Web Server & Main Loop<br>- Khởi chạy Express server tại port 3000.<br>- Render giao diện dashboard.ejs.<br>- API AJAX /api/update-mapping để gán thiết bị.<br>- Vòng lặp (60s): Gọi API CGBAS & eWeLink -> Sync vào DB -> So sánh giờ & trạng thái -> Nếu lệch pha thì queue.addToQueue.
queue-worker.js	Background Worker<br>- Quét bảng command_queue mỗi 5s.<br>- Xử lý Đa luồng (Concurrency Limit = 5).<br>- Gọi logic sequenceOn / sequenceOff.<br>- Xử lý Retry nếu gặp lỗi mạng.
ewelink-tokens.json	Lưu trữ at (Access Token) và rt (Refresh Token) của eWeLink. File này được tạo ra và cập nhật tự động.
check-region-advanced.js	Tool quét Server eWeLink chuẩn (đã dùng để tìm ra as-apia.coolkit.cc).
auto-match-db.js	Tool chạy 1 lần để tự động ghép cặp tên trạm CGBAS với tên thiết bị eWeLink và lưu vào DB.
Các file test-*.js	Các script kiểm thử đơn lẻ (Test CGBAS, Test eWeLink list, Test quy trình bật/tắt thủ công).
B. Thư mục src/providers/ (Giao tiếp bên thứ 3)
File	Chức năng chi tiết
cgbas-provider.js	- Tạo chữ ký HMAC-SHA256 chuẩn (fix lỗi tách query params).<br>- getStationList: Lấy danh sách trạm.<br>- getStationStatus: Lấy trạng thái Online/Offline (Payload {ids: [...]}).
ewelink-provider.js	- Kết nối Server https://as-apia.coolkit.cc.<br>- Tự động Refresh Token khi gặp lỗi 401.<br>- getDeviceList: Lấy toàn bộ thiết bị.<br>- getDeviceState: Lấy trạng thái realtime.<br>- toggleDevice: Bật/Tắt kênh.<br>- isDeviceOnline: Check nhanh trạng thái online.
C. Thư mục src/services/ (Logic nội bộ)
File	Chức năng chi tiết
db-service.js	- Quản lý kết nối MySQL (đã fix lỗi chữ hoa/thường).<br>- saveStations: Lưu trạm CGBAS. Quan trọng: Đã chặn việc ghi đè ewelink_id thành NULL.<br>- saveEwelinkDevices: Lưu thông tin phần cứng (parse dữ liệu JSON phức tạp từ eWeLink).
queue-service.js	- addToQueue: Thêm lệnh, có logic chống trùng lặp (Deduplication) và hủy lệnh ngược chiều.<br>- getPendingTasks: Lấy lệnh PENDING hoặc RETRY cũ.
station-logic.js	- getTargetState: Xác định giờ hiện tại là ON hay OFF.<br>- sequenceOn: Quy trình Bật (CH1 -> Wait -> CH2 -> Wait -> Off CH2).<br>- sequenceOff: Quy trình Tắt.
D. Thư mục views/ (Giao diện)
File	Chức năng chi tiết
dashboard.ejs	- Giao diện Bootstrap 5.<br>- Bảng điều khiển:<br> + Toggle Auto (Bật/Tắt tự động).<br> + Dropdown gán thiết bị (AJAX).<br> + Hiển thị trạng thái Online/Offline/Mất kết nối/Sai ID.<br> + Hiển thị thông số điện áp/sóng.<br> + Nút Bật/Tắt thủ công.<br>- Tự động refresh trang mỗi 30s.
E. Thư mục config/
File	Chức năng chi tiết
index.js	Chứa thông tin đăng nhập MySQL, eWeLink AppID/Secret, CGBAS AK/SK, Khung giờ ON/OFF.
4. Trạng thái Vận hành Hiện tại
Những gì ĐÃ LÀM ĐƯỢC:
Kết nối API: Đã thông suốt cả CGBAS và eWeLink (OAuth 2.0).
Đồng bộ dữ liệu: Dữ liệu từ 2 nguồn đã đổ về Database chung và hiển thị lên Web.
Gán ghép: Người dùng gán thiết bị trên Web -> Lưu vào DB -> Không bị mất khi server quét lại.
Hàng chờ: Server đẩy lệnh -> Worker thực thi (Cơ chế bất đồng bộ hoạt động tốt).
Fix lỗi: Đã xử lý các lỗi Auth MySQL, lỗi chữ ký API, lỗi ghi đè dữ liệu.
Những gì CẦN NÂNG CẤP (Theo kế hoạch mới):
Logic "Strict": Hiện tại code station-logic.js mới chỉ chạy tuần tự (sleep) mà chưa có bước Verify (Kiểm tra lại) sau mỗi hành động.
Logic check điều kiện: index.js hiện tại chưa kiểm tra kỹ điều kiện "Kênh 1 đang Bật/Tắt" trước khi đẩy vào Queue.
Xác thực kết quả: Chưa có cơ chế check lại sau 2 phút để xác nhận trạm đã thực sự lên/xuống chưa.