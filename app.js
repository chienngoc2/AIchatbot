const micBtn = document.getElementById("micBtn");
const chat = document.getElementById("chat");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "vi-VN";
recognition.continuous = false;

micBtn.onclick = () => {
  recognition.start();
  micBtn.style.background = "#ff3030"; // đỏ đậm khi ghi âm
};

recognition.onresult = (event) => {
  const text = event.results[0][0].transcript;

  // in người nói
  chat.innerHTML += `<p class="msg-user"><b>Bạn:</b> ${text}</p>`;
  chat.scrollTop = chat.scrollHeight;

  sendToAI(text);
};

recognition.onend = () => {
  micBtn.style.background = "red"; // reset lại
};
// hàm in đậm chữ
function formatText(text) {
    // Dùng [\s\S] để bắt cả ký tự xuống dòng nằm giữa dấu **
    let formatted = text.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    
    // In nghiêng
    formatted = formatted.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');

    // Xuống dòng
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

// === Gửi text lên AI ===
async function sendToAI(text) {
  alert("ĐANG CHẠY CODE TEST!");
  try {
    
    // --- TEST CỨNG: Giả vờ như Server đã trả về text này ---
    const textTuServer = "Đây là **chữ in đậm** test thử.";
    
    // Format nó
    const htmlReply = formatText(textTuServer);

    // In ra màn hình
    chat.innerHTML += `<p class="msg-bot"><b>AI:</b> ${htmlReply}</p>`;
    chat.scrollTop = chat.scrollHeight;

  } catch (err) {
    chat.innerHTML += `<p class="msg-bot"><b>Lỗi:</b> ${err.message}</p>`;
    chat.scrollTop = chat.scrollHeight;
  }
}
