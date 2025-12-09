KẾ HOẠCH NÂNG CẤP HỆ THỐNG: QUY TRÌNH TỰ ĐỘNG HÓA CHẶT CHẼ (STRICT AUTOMATION)
1. MỤC TIÊU & NGUYÊN TẮC CỐT LÕI
An toàn là số 1: Không bao giờ thực hiện bước tiếp theo nếu bước trước đó thất bại (Tránh treo máy, tránh bật/tắt nguồn không kiểm soát).
Kiểm tra kép (Double Check): Kiểm tra kỹ trạng thái trước khi ra lệnh và kiểm tra lại kết quả sau khi thực hiện lệnh.
Xác thực kết quả (Post-Verification): Quy trình chỉ được coi là "Hoàn thành" sau khi kiểm tra lại trạng thái CGBAS sau 2 phút.
2. QUY TRÌNH CHI TIẾT: TẮT TRẠM (KHUNG GIỜ 23:30 - 05:00)
Giai đoạn A: Kiểm tra Điều kiện kích hoạt (Pre-conditions)
Hệ thống chỉ đẩy lệnh TẮT vào hàng chờ khi và chỉ khi thỏa mãn toàn bộ 6 điều kiện sau:
Thời gian: Hiện tại nằm trong khung giờ Tắt.
Cấu hình: automation_status = 1.
Thiết bị: Trạm có gán thiết bị eWeLink (ID hợp lệ).
Trạng thái Phần mềm: CGBAS đang báo ONLINE.
Trạng thái Phần cứng: Thiết bị eWeLink đang báo ONLINE.
Trạng thái Nguồn: Kênh 1 (Nguồn tổng) đang ON (Nếu Kênh 1 đã tắt thì coi như trạm đã tắt, không làm gì thêm).
Giai đoạn B: Thực thi tuần tự (Strict Sequence Execution)
Nếu thỏa mãn Giai đoạn A, Worker sẽ thực hiện quy trình TẮT như sau:
Bước 1: Bật Kênh 2 (Nhấn nút nguồn).
Action: Gửi lệnh ON CH2.
Verify: Gọi API check lại xem CH2 đã thực sự ON chưa?
Failure Handler: Nếu thất bại/Timeout -> DỪNG NGAY LẬP TỨC. (Log lỗi: Không kích được nút nguồn).
Bước 2: Chờ (Timeout) 5 giây.
Bước 3: Tắt Kênh 2 (Nhả nút nguồn).
Action: Gửi lệnh OFF CH2.
Verify: Gọi API check lại xem CH2 đã thực sự OFF chưa?
Failure Handler: Nếu thất bại -> BÁO ĐỘNG KHẨN CẤP (Trạm đang bị dính phím nguồn).
Bước 4: Chờ (Timeout) 10 giây (Để Windows Shutdown).
Bước 5: Tắt Kênh 1 (Cắt nguồn tổng).
Action: Gửi lệnh OFF CH1.
Verify: Gọi API check lại xem CH1 đã thực sự OFF chưa?
Failure Handler: Nếu thất bại -> Báo lỗi: Không cắt được nguồn.
Giai đoạn C: Xác thực sau 2 phút (Post-Verification)
Sau khi Giai đoạn B chạy xong, trạng thái lệnh chưa phải là COMPLETED. Trạng thái chuyển thành VERIFYING.
Hệ thống hẹn giờ 2 phút sau.
Kiểm tra:
Trạm CGBAS đã chuyển sang OFFLINE chưa?
Kênh 1 eWeLink có đang OFF không?
Kết quả:
Nếu ĐÚNG: Đánh dấu COMPLETED.
Nếu SAI: Đánh dấu FAILED và gửi cảnh báo (Tắt không thành công).
3. QUY TRÌNH CHI TIẾT: BẬT TRẠM (KHUNG GIỜ 05:00 - 23:30)
Giai đoạn A: Kiểm tra Điều kiện kích hoạt (Pre-conditions)
Hệ thống chỉ đẩy lệnh BẬT vào hàng chờ khi và chỉ khi thỏa mãn toàn bộ 6 điều kiện sau:
Thời gian: Hiện tại nằm trong khung giờ Bật.
Cấu hình: automation_status = 1.
Thiết bị: Trạm có gán thiết bị eWeLink.
Trạng thái Phần mềm: CGBAS đang báo OFFLINE.
Trạng thái Phần cứng: Thiết bị eWeLink đang báo ONLINE.
Trạng thái Nguồn: Kênh 1 (Nguồn tổng) đang OFF.
Lưu ý quan trọng: Nếu Kênh 1 đang ON mà trạm CGBAS Offline (có thể do treo máy), ta không được chạy quy trình Bật này ngay (vì bật CH1 lần nữa không giải quyết được gì, hoặc bật CH2 sẽ thành tắt máy). Trường hợp treo máy cần quy trình Reset riêng (Reset cứng).
Giai đoạn B: Thực thi tuần tự (Strict Sequence Execution)
Nếu thỏa mãn Giai đoạn A, Worker sẽ thực hiện quy trình BẬT như sau:
Bước 1: Bật Kênh 1 (Cấp nguồn).
Action: Gửi lệnh ON CH1.
Verify: Gọi API check lại xem CH1 đã thực sự ON chưa?
Failure Handler: Nếu thất bại (Lỗi 4002/Offline ảo) -> DỪNG NGAY LẬP TỨC. Không thực hiện Bước 2.
Bước 2: Chờ (Timeout) 10 giây (Mainboard nạp điện).
Bước 3: Bật Kênh 2 (Nhấn nút nguồn).
Action: Gửi lệnh ON CH2.
Verify: Check CH2 ON?
Failure Handler: Nếu thất bại -> DỪNG. (Đã cấp điện nhưng không kích được nguồn).
Bước 4: Chờ (Timeout) 5 giây.
Bước 5: Tắt Kênh 2 (Nhả nút nguồn).
Action: Gửi lệnh OFF CH2.
Verify: Check CH2 OFF?
Giai đoạn C: Xác thực sau 2 phút (Post-Verification)
Chuyển trạng thái lệnh sang VERIFYING. Hẹn giờ 2 phút sau:
Kiểm tra:
Trạm CGBAS đã chuyển sang ONLINE chưa?
Kênh 1 eWeLink có đang ON không?
Kết quả:
Nếu ĐÚNG: Đánh dấu COMPLETED.
Nếu SAI: Đánh dấu FAILED -> Cảnh báo (Trạm không lên sau khi bật).
4. CHIẾN LƯỢC XỬ LÝ "THÁCH THỨC" (MẤT KẾT NỐI & LỖI MẠNG)
Vấn đề: eWeLink lúc online, lúc offline. Bật được kênh 1 nhưng kênh 2 thất bại.
Giải pháp kỹ thuật:
Atomic Step (Bước nguyên tử): Coi mỗi hành động bật/tắt 1 kênh là một bước nguyên tử.
Retry cục bộ (Local Retry): Tại mỗi bước (ví dụ Bước 1: Bật CH1), nếu API báo lỗi (4002, Timeout), hệ thống sẽ thử lại 3 lần, mỗi lần cách nhau 3 giây.
Nếu sau 3 lần vẫn lỗi -> Hủy bỏ toàn bộ quy trình (Abort).
TUYỆT ĐỐI KHÔNG nhảy sang Bước 2 (Bật CH2) nếu Bước 1 chưa được xác nhận thành công.
Cơ chế bảo vệ:
Trường hợp: Bật Kênh 1 xong (thành công), sang Bật Kênh 2 thì mất mạng (thất bại).
Hệ thống sẽ dừng lại, báo lỗi FAILED.
Trạng thái lúc này: CH1 = ON, Máy chưa chạy.
Lần quét tiếp theo (sau 1 phút):
Hệ thống thấy: Giờ Bật + CGBAS Offline + CH1 ON.
Nó sẽ phát hiện ra sự bất thường (Trạm chưa lên dù CH1 đã ON).
Option nâng cao: Hệ thống có thể tự sinh ra lệnh "Tắt CH1" để Reset lại trạng thái về OFF, sau đó quy trình Bật chuẩn sẽ được kích hoạt lại từ đầu.
5. NHIỆM VỤ SỬA ĐỔI CODE
Để hiện thực hóa bản kế hoạch này, tôi sẽ thực hiện các sửa đổi sau:
Database (command_queue): Thêm trạng thái VERIFYING và cột verified_at.
src/services/station-logic.js:
Viết lại hàm sequenceOn/Off để trả về kết quả từng bước.
Thêm logic checkDeviceChannelState để verify sau mỗi lệnh.
index.js (Main Loop):
Sửa câu lệnh IF/ELSE để bao gồm đủ 6 điều kiện (đặc biệt là check CH1 status).
queue-worker.js:
Thêm logic xử lý trạng thái VERIFYING.
Worker sẽ không chỉ thực thi lệnh, mà còn chạy một task phụ để check kết quả sau 2 phút.