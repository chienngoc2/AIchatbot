let currentList = [];
let currentIndex = 0;
let score = 0;
let currentTitle = "";
let currentListId = null;
let isEditing = false;
let isAnsweredCorrectly = false; // Cờ khóa: phải trả lời đúng mới được Next

document.addEventListener("DOMContentLoaded", loadSavedLists);

// --- 1. HIỂN THỊ DANH SÁCH & NÚT SỬA ---
async function loadSavedLists() {
  try {
    const res = await fetch("/api/vocab/lists");
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById("savedListsContainer");
      container.innerHTML = "";

      if (data.data.length === 0) {
        container.innerHTML =
          "<p style='color:#888;text-align:center;'>Sếp chưa lưu bài nào cả!</p>";
        return;
      }

      data.data.forEach((list) => {
        const div = document.createElement("div");
        div.className = "list-card";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        div.innerHTML = `
          <div onclick="fetchAndPractice('${list._id}')" style="cursor:pointer; flex: 1;">
            <span class="list-title">📘 ${list.title}</span>
            <span class="list-count" style="display:block; font-size:0.85rem; color:#888;">${list.words.length} từ</span>
          </div>
          <button onclick="editList('${list._id}')" title="Sửa bài này" style="background:none; border:none; font-size:1.2rem; cursor:pointer; padding: 10px;">✏️</button>
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    console.error("Lỗi tải danh sách:", e);
  }
}

// --- LẤY DATA LÊN ĐỂ SỬA ---
async function editList(id) {
  try {
    const res = await fetch(`/api/vocab/list/${id}`);
    const data = await res.json();
    if (data.success) {
      const list = data.data;
      document.getElementById("listTitle").value = list.title;
      const rawText = list.words.map((w) => `${w.term} : ${w.def}`).join("\n");
      document.getElementById("vocabInput").value = rawText;

      isEditing = true;
      currentListId = id;

      const saveBtn = document.querySelector(
        ".vocab-input-card .btn-d4c-primary",
      );
      saveBtn.innerHTML = "🔄 Cập nhật bài học";
      saveBtn.style.background = "#f39c12";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (err) {
    alert("Lỗi khi tải dữ liệu bài học!");
  }
}

// --- 2. LƯU HOẶC CẬP NHẬT ---
async function processAndSaveList() {
  const title = document.getElementById("listTitle").value.trim();
  const rawText = document.getElementById("vocabInput").value;

  if (!title) return alert("Sếp quên đặt Tên bài học rồi!");
  if (!rawText.trim()) return alert("Sếp chưa nhập từ vựng kìa!");

  const parsedList = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"))
    .map((line) => {
      const [term, def] = line.split(":");
      return { term: term.trim(), def: def.trim(), correctCount: 0 };
    });

  if (parsedList.length === 0)
    return alert("Sai cú pháp! Phải có dấu ':' nhé.");

  try {
    let url = "/api/vocab/save";
    let method = "POST";
    if (isEditing && currentListId) {
      url = `/api/vocab/update/${currentListId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, list: parsedList }),
    });

    if ((await res.json()).success) {
      alert(
        isEditing ? "✅ Đã cập nhật thành công!" : "✅ Đã lưu vào MongoDB!",
      );
      document.getElementById("listTitle").value = "";
      document.getElementById("vocabInput").value = "";
      isEditing = false;
      currentListId = null;

      const saveBtn = document.querySelector(
        ".vocab-input-card .btn-d4c-primary",
      );
      saveBtn.innerHTML = "💾 Lưu vào DB & Học ngay";
      saveBtn.style.background = "#4285f4";
      loadSavedLists();
    }
  } catch (err) {
    alert("❌ Lỗi Server");
  }
}

// --- 3. BẮT ĐẦU HỌC ---
async function fetchAndPractice(id) {
  try {
    const res = await fetch(`/api/vocab/list/${id}`);
    const data = await res.json();
    if (data.success) {
      currentListId = id;
      startPractice(data.data.title, data.data.words);
    }
  } catch (err) {
    alert("❌ Lỗi tải bài học!");
  }
}

function startPractice(title, list) {
  currentList = [...list];
  currentTitle = title;
  currentIndex = 0;
  score = 0;

  document.getElementById("importSection").style.display = "none";
  document.getElementById("practiceSection").style.display = "block";
  document.getElementById("scoreDisplay").style.display = "block";
  document.getElementById("pageTitle").innerText = `✍️ Đang học: ${title}`;

  const btn = document.querySelector(".submit-btn");
  btn.innerText = "Kiểm tra";
  btn.onclick = checkAnswer;
  document.getElementById("answerInput").disabled = false;

  updateScore();
  renderQuestion();
}

// Logic làm sạch ngoặc (Anh/Nhật) và chia tách đáp án qua dấu /
function cleanAndSplitText(text) {
  if (!text) return [""];

  // 1. Xóa nội dung trong ngoặc đơn () và ngoặc Nhật （）
  let cleaned = text.replace(/\s*[(\（].*?[)\）]\s*/g, "");

  // 2. Tách các đáp án bằng dấu /
  // 3. Chuyển về chữ thường và trim khoảng trắng thừa từng phần tử
  return cleaned
    .split("/")
    .map((item) => item.toLowerCase().trim())
    .filter((item) => item !== ""); // Loại bỏ các phần tử rỗng nếu sếp gõ thừa dấu //
}

// --- 4. LOGIC TRẮC NGHIỆM KHÓA NEXT ---
function renderQuestion() {
  if (currentIndex >= currentList.length) {
    finishLesson();
    return;
  }

  isAnsweredCorrectly = false; // Reset cờ khóa
  const mode = document.getElementById("practiceMode").value;
  const word = currentList[currentIndex];

  document.getElementById("questionText").innerText =
    mode === "JP-VN" ? word.term : word.def;
  document.getElementById("questionCount").innerText =
    `${currentIndex + 1} / ${currentList.length}`;

  const input = document.getElementById("answerInput");
  input.value = "";
  input.placeholder =
    mode === "JP-VN" ? "Nhập nghĩa tiếng Việt..." : "Nhập bằng tiếng Nhật...";
  input.focus();

  document.getElementById("feedbackMsg").innerText = "";
  document.getElementById("hintText").style.display = "none";
}

function checkAnswer() {
  if (currentIndex >= currentList.length) return;

  const mode = document.getElementById("practiceMode").value;
  const word = currentList[currentIndex];
  const rawCorrect = mode === "JP-VN" ? word.def : word.term;

  // Tách đáp án người dùng gõ và đáp án chuẩn thành mảng
  const userAnswers = cleanAndSplitText(
    document.getElementById("answerInput").value,
  );
  const correctAnswers = cleanAndSplitText(rawCorrect);
  const feedbackMsg = document.getElementById("feedbackMsg");

  // Kiểm tra xem user gõ có khớp BẤT KỲ đáp án nào trong mảng correctAnswers không
  const isCorrect =
    userAnswers.some((ans) => correctAnswers.includes(ans)) &&
    userAnswers[0] !== "";

  if (isCorrect) {
    isAnsweredCorrectly = true; // Mở khóa cho phép Next
    score += 10;
    feedbackMsg.innerText = "🎉 Chính xác!";
    feedbackMsg.style.color = "#2ecc71";
    word.correctCount = (word.correctCount || 0) + 1;
    setTimeout(nextQuestion, 800);
  } else {
    feedbackMsg.innerText = "❌ Sai rồi! Từ này sẽ bị đẩy xuống cuối bài.";
    feedbackMsg.style.color = "#e74c3c";
    currentList.push({ ...word }); // Phạt đẩy xuống cuối
    addToReviewList(word); // Bắn từ sai vào rổ "Cần ôn tập"
  }
  updateScore();
}

function nextQuestion() {
  // NẾU CHƯA TRẢ LỜI ĐÚNG THÌ KHÔNG CHO NEXT
  if (!isAnsweredCorrectly) {
    const fb = document.getElementById("feedbackMsg");
    fb.innerText = "⚠️ Phải trả lời đúng mới được qua câu nhé sếp!";
    fb.style.color = "#f39c12";
    return;
  }
  currentIndex++;
  renderQuestion();
}

function showHint() {
  const mode = document.getElementById("practiceMode").value;
  const word = currentList[currentIndex];
  document.getElementById("hintText").innerText =
    `Gợi ý: ${mode === "JP-VN" ? word.def : word.term}`;
  document.getElementById("hintText").style.display = "block";
}

// --- 5. LOGIC LƯU "CẦN ÔN TẬP" DUY NHẤT & TỐT NGHIỆP ---
async function addToReviewList(word) {
  try {
    const resLists = await fetch("/api/vocab/lists");
    const dataLists = await resLists.json();
    let reviewList = dataLists.data.find((l) => l.title === "Cần ôn tập");

    if (reviewList) {
      // Đã có bài "Cần ôn tập", kiểm tra xem từ này có chưa
      const isExist = reviewList.words.some((w) => w.term === word.term);
      if (!isExist) {
        reviewList.words.push({ ...word, correctCount: 0 });
        await fetch(`/api/vocab/update/${reviewList._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Cần ôn tập", list: reviewList.words }),
        });
      }
    } else {
      // Chưa có thì tạo mới
      await fetch("/api/vocab/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Cần ôn tập",
          list: [{ ...word, correctCount: 0 }],
        }),
      });
    }
  } catch (e) {
    console.error("Lỗi thêm vào Cần ôn tập:", e);
  }
}

async function finishLesson() {
  document.getElementById("questionText").innerText = "🎉 Hoàn thành bài học!";
  document.getElementById("answerInput").disabled = true;

  const btn = document.querySelector(".submit-btn");
  btn.innerText = "🔙 Quay lại danh sách";
  btn.onclick = backToList;

  // Nếu đang học chính cái bài "Cần ôn tập", lọc ra các từ đã đúng 10 lần để xóa
  if (currentTitle === "Cần ôn tập") {
    const wordsToKeep = currentList
      .filter((w) => (w.correctCount || 0) < 10)
      .filter((v, i, a) => a.findIndex((t) => t.term === v.term) === i);

    try {
      await fetch(`/api/vocab/update/${currentListId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Cần ôn tập", list: wordsToKeep }),
      });
    } catch (e) {
      console.error("Lỗi xóa từ khỏi Cần ôn tập", e);
    }
  } else {
    // Nếu là bài học bình thường, chỉ lọc trùng lắp và lưu lại số đếm
    const uniqueList = currentList.filter(
      (v, i, a) => a.findIndex((t) => t.term === v.term) === i,
    );
    try {
      await fetch(`/api/vocab/update/${currentListId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: currentTitle, list: uniqueList }),
      });
    } catch (e) {}
  }
}

function updateScore() {
  document.getElementById("scoreDisplay").innerText = `Điểm: ${score}`;
}

function backToList() {
  document.getElementById("practiceSection").style.display = "none";
  document.getElementById("importSection").style.display = "block";
  document.getElementById("scoreDisplay").style.display = "none";
  document.getElementById("pageTitle").innerText = "📥 Nhập Danh Sách Từ Vựng";
  loadSavedLists();
}

document.getElementById("answerInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    if (currentIndex < currentList.length) checkAnswer();
    else backToList();
  }
});
