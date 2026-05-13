let currentCards = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", loadLists);

async function loadLists() {
  try {
    const res = await fetch("/api/vocab/lists");
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById("listsContainer");
      container.innerHTML = "";
      data.data.forEach((list) => {
        const div = document.createElement("div");
        div.className = "list-card";
        div.onclick = () => startFlashcards(list);
        div.innerHTML = `
          <span><b>📘 ${list.title}</b></span>
          <span style="color: #888;">${list.words.length} thẻ</span>
        `;
        container.appendChild(div);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

function startFlashcards(list) {
  currentCards = list.words;
  currentIndex = 0;
  document.getElementById("currentTitleText").innerText = list.title;
  document.getElementById("selectionStage").style.display = "none";
  document.getElementById("flashcardStage").style.display = "block";
  renderCard();
}

function renderCard() {
  const card = currentCards[currentIndex];
  const cardInner = document.querySelector(".flashcard");
  cardInner.classList.remove("is-flipped"); // Luôn hiện mặt trước khi đổi thẻ

  setTimeout(() => {
    document.getElementById("frontText").innerText = card.term;
    document.getElementById("backText").innerText = card.def;
    document.getElementById("cardCounter").innerText =
      `${currentIndex + 1} / ${currentCards.length}`;
  }, 100);
}

function nextCard() {
  if (currentIndex < currentCards.length - 1) {
    currentIndex++;
    renderCard();
  }
}

function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCard();
  }
}

function exitFlashcard() {
  document.getElementById("selectionStage").style.display = "block";
  document.getElementById("flashcardStage").style.display = "none";
}

// Điều khiển bằng bàn phím
document.addEventListener("keydown", (e) => {
  if (document.getElementById("flashcardStage").style.display === "block") {
    if (e.code === "Space") {
      document.querySelector(".flashcard").classList.toggle("is-flipped");
      e.preventDefault();
    }
    if (e.key === "ArrowRight") nextCard();
    if (e.key === "ArrowLeft") prevCard();
  }
});
