const COLORS = [
  { name: "hồng", bg: "#fff0f4", fg: "#d47d99", dot: "#e69ab0" },
  { name: "tím", bg: "#f2effb", fg: "#8d7dbb", dot: "#a995cf" },
  { name: "vàng", bg: "#fff7e6", fg: "#c69e51", dot: "#e6c471" },
  { name: "xanh lá", bg: "#edf6ef", fg: "#7da286", dot: "#9fc4a5" },
  { name: "xanh dương", bg: "#edf4fb", fg: "#759ab9", dot: "#91b4d3" },
  { name: "cam", bg: "#fff1e8", fg: "#d38b61", dot: "#e8aa80" },
];
const EMOJIS = [
  "📐",
  "🧪",
  "📚",
  "🌍",
  "🎨",
  "💻",
  "🧠",
  "✍️",
  "🎼",
  "🔬",
  "🪴",
  "🧮",
];
const seed = [
  {
    id: "math",
    name: "Toán cao cấp",
    emoji: "📐",
    color: 1,
    lessons: [
      {
        id: "math-1",
        title: "Giới hạn và tính liên tục",
        date: "2026-10-15",
        notes: "",
      },
      {
        id: "math-2",
        title: "Đạo hàm hàm số nhiều biến",
        date: "2026-10-10",
        notes: "",
      },
    ],
  },
  {
    id: "chem",
    name: "Hóa đại cương",
    emoji: "🧪",
    color: 2,
    lessons: [
      {
        id: "chem-1",
        title: "Cấu tạo nguyên tử",
        date: "2026-10-14",
        notes: "",
      },
    ],
  },
  {
    id: "eng",
    name: "Tiếng Anh học thuật",
    emoji: "📚",
    color: 4,
    lessons: [],
  },
  { id: "bio", name: "Sinh học tế bào", emoji: "🪴", color: 3, lessons: [] },
  { id: "phys", name: "Vật lý đại cương", emoji: "🌍", color: 0, lessons: [] },
];
const DB_NAME = "little-study-nook",
  STORE = "attachments";
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
function dbPut(item) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(false);
      return;
    }
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}
function dbGet(id) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const r = db.transaction(STORE).objectStore(STORE).get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => resolve(null);
  });
}
function dbDelete(id) {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}
let data;
try {
  data = JSON.parse(localStorage.getItem("little-study-nook-data")) || seed;
} catch {
  data = seed;
}
let activeCourse = null,
  activeLesson = null,
  toastTimer;
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
function save() {
  localStorage.setItem("little-study-nook-data", JSON.stringify(data));
  renderCounts();
}
function dateParts(value) {
  const d = new Date(value + "T12:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("vi-VN", { month: "short" }).replace(".", ""),
    full: d.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}
function renderCounts() {
  $("#subjectCount").textContent = data.length;
  $("#headingCount").textContent = data.length;
}
function renderNav() {
  const nav = $("#subjectNav");
  nav.innerHTML = data
    .map(
      (c) =>
        `<button class="subject-link" data-course="${c.id}"><span class="subject-dot" style="background:${COLORS[c.color].dot}"></span>${esc(c.name)}</button>`,
    )
    .join("");
  $$(".subject-link").forEach(
    (b) => (b.onclick = () => openCourse(b.dataset.course)),
  );
}
function renderGrid() {
  const grid = $("#subjectGrid");
  grid.innerHTML = data
    .map((c) => {
      const col = COLORS[c.color],
        lessons = c.lessons.length;
      return `<article class="subject-card" data-course="${c.id}"><div class="card-top"><div class="course-icon" style="background:${col.bg};color:${col.fg}">${c.emoji}</div><button class="card-menu" data-menu="${c.id}" title="Tùy chọn">···</button></div><h3>${esc(c.name)}</h3><p>${lessons ? `Ôn tập từng chút một ✨` : "Chờ những bài học đầu tiên ✨"}</p><div class="card-footer"><span>▤ ${lessons} bài học</span><span>Mở môn học →</span></div></article>`;
    })
    .join("");
  $$(".subject-card").forEach(
    (el) =>
      (el.onclick = (e) => {
        if (!e.target.closest(".card-menu")) openCourse(el.dataset.course);
      }),
  );
  $$(".card-menu").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Xóa môn học này cùng danh sách bài học?")) {
          data = data.filter((c) => c.id !== b.dataset.menu);
          save();
          render();
        }
      }),
  );
  renderCounts();
}
function render() {
  renderNav();
  renderGrid();
}
function openCourse(id) {
  activeCourse = data.find((c) => c.id === id);
  if (!activeCourse) return;
  activeLesson = null;
  $("#dashboard").classList.add("hidden");
  $("#courseView").classList.remove("hidden");
  $("#courseIcon").textContent = activeCourse.emoji;
  const col = COLORS[activeCourse.color];
  $("#courseIcon").style.background = col.bg;
  $("#courseIcon").style.color = col.fg;
  $("#courseTitle").textContent = activeCourse.name;
  $("#courseMeta").textContent =
    `${activeCourse.lessons.length} bài học · Góc học tập riêng của bạn`;
  $("#breadcrumb").innerHTML =
    `<span>Không gian học tập</span><b>/</b><strong>${esc(activeCourse.name)}</strong>`;
  renderLessons();
  selectLesson(null);
  window.scrollTo(0, 0);
}
function renderLessons() {
  const arr = [...activeCourse.lessons].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  $("#lessonCount").textContent = `${arr.length} bài`;
  $("#lessonList").innerHTML = arr
    .map((l) => {
      const d = dateParts(l.date);
      return `<button class="lesson-item ${activeLesson?.id === l.id ? "active" : ""}" data-lesson="${l.id}"><span class="date-box"><b>${d.day}</b><small>${d.month}</small></span><span class="lesson-copy"><b>${esc(l.title)}</b><small>${l.pdfName ? "📄 Có tài liệu" : "Chưa có tài liệu"}</small></span></button>`;
    })
    .join("");
  $("#lessonEmpty").classList.toggle("hidden", arr.length > 0);
  $("#selectLesson").classList.toggle("hidden", arr.length > 0);
  $$(".lesson-item").forEach(
    (b) =>
      (b.onclick = () =>
        selectLesson(
          activeCourse.lessons.find((l) => l.id === b.dataset.lesson),
        )),
  );
}
function selectLesson(lesson) {
  activeLesson = lesson;
  $("#lessonDetail").classList.toggle("hidden", !lesson);
  $("#selectLesson").classList.toggle(
    "hidden",
    !!lesson || activeCourse.lessons.length > 0,
  );
  if (!lesson) return;
  renderLessons();
  const d = dateParts(lesson.date);
  $("#lessonTitle").textContent = lesson.title;
  $("#lessonDateLabel").textContent = d.full.toUpperCase();
  $("#notesInput").value = lesson.notes || "";
  $("#savedState").textContent = "● Đã lưu";
  $$(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === "materials"),
  );
  $$(".tab-content").forEach((t) => t.classList.remove("active"));
  $("#materialsTab").classList.add("active");
  $("#boardTabCount").textContent = lesson.images?.length || 0;
  renderPdf();
  renderImages();
}
async function renderPdf() {
  const area = $("#pdfArea");
  area.innerHTML = "";
  if (!activeLesson.pdfId) {
    area.innerHTML =
      '<div class="pdf-empty"><span>📑</span><b>Chưa có tài liệu cho bài học này</b><small>Tải PDF từ Overleaf lên để đọc ngay tại đây.</small><label class="upload-button">＋ Chọn file PDF<input type="file" accept="application/pdf,.pdf" hidden /></label></div>';
    area.querySelector("input").onchange = (e) => uploadPdf(e.target.files[0]);
    return;
  }
  const file = await dbGet(activeLesson.pdfId);
  if (!file) {
    area.innerHTML =
      '<div class="pdf-empty"><span>🫧</span><b>Không tìm thấy file PDF trên thiết bị</b><small>Hãy tải lại tài liệu để tiếp tục xem.</small></div>';
    return;
  }
  const url = URL.createObjectURL(file.blob);
  area.innerHTML = `<div class="pdf-filebar"><span>📄 ${esc(file.name)}</span><button id="removePdf">Gỡ tài liệu</button></div><iframe class="pdf-viewer" title="Trình xem PDF" src="${url}#toolbar=1&navpanes=0"></iframe>`;
  $("#removePdf").onclick = async () => {
    await dbDelete(activeLesson.pdfId);
    activeLesson.pdfId = null;
    activeLesson.pdfName = null;
    save();
    renderPdf();
    renderLessons();
    toast("Đã gỡ tài liệu");
  };
  area.querySelector("iframe").onload = () => URL.revokeObjectURL(url);
}
async function uploadPdf(file) {
  if (!file || !activeLesson) return;
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    toast("Vui lòng chọn file PDF nhé");
    return;
  }
  const id = `pdf-${activeLesson.id}`;
  const ok = await dbPut({ id, name: file.name, blob: file });
  if (!ok) {
    toast("Trình duyệt chưa lưu được file này");
    return;
  }
  activeLesson.pdfId = id;
  activeLesson.pdfName = file.name;
  save();
  renderLessons();
  renderPdf();
  toast("Đã thêm tài liệu PDF");
}
async function renderImages() {
  const grid = $("#imageGrid");
  grid.innerHTML = "";
  $("#boardTabCount").textContent = activeLesson.images?.length || 0;
  if (!activeLesson.images?.length) {
    grid.innerHTML =
      '<div class="image-empty"><span>📷</span>Chưa có ảnh bảng nào — thêm ảnh để lưu lại nhé!</div>';
    return;
  }
  for (const item of activeLesson.images) {
    const saved = await dbGet(item.id);
    if (!saved) continue;
    const url = URL.createObjectURL(saved.blob);
    const div = document.createElement("div");
    div.className = "image-tile";
    div.innerHTML = `<img src="${url}" alt="${esc(item.name)}"><div><small>${esc(item.name)}</small><button title="Xóa ảnh">×</button></div>`;
    div.querySelector("img").onclick = () => window.open(url, "_blank");
    div.querySelector("button").onclick = async () => {
      await dbDelete(item.id);
      activeLesson.images = activeLesson.images.filter((x) => x.id !== item.id);
      save();
      renderImages();
    };
    grid.append(div);
  }
}
async function uploadImages(files) {
  for (const file of files) {
    const id = `img-${activeLesson.id}-${crypto.randomUUID()}`;
    if (await dbPut({ id, name: file.name, blob: file })) {
      activeLesson.images ??= [];
      activeLesson.images.push({ id, name: file.name });
    }
  }
  save();
  renderImages();
  toast("Đã thêm ảnh chụp bảng");
}
function showModal(content, icon = "✿") {
  $("#modalIcon").textContent = icon;
  $("#modalContent").innerHTML = content;
  $("#modal").classList.remove("hidden");
  $("#modalContent").querySelector("input")?.focus();
}
function closeModal() {
  $("#modal").classList.add("hidden");
}
function subjectModal() {
  let color = 0,
    emoji = EMOJIS[0];
  showModal(
    `<h3>Thêm môn học mới</h3><p>Tạo một góc nhỏ dành riêng cho môn học nhé.</p><label class="form-label">Tên môn học</label><input id="newSubjectName" class="form-input" placeholder="Ví dụ: Giải tích 2" maxlength="50"><label class="form-label">Chọn biểu tượng</label><div class="emoji-options">${EMOJIS.map((e, i) => `<button class="emoji-choice ${i === 0 ? "selected" : ""}" data-emoji="${e}">${e}</button>`).join("")}</div><label class="form-label">Màu sắc</label><div class="color-options">${COLORS.map((c, i) => `<button class="color-swatch ${i === 0 ? "selected" : ""}" data-color="${i}" style="background:${c.dot}" title="${c.name}"></button>`).join("")}</div><div class="modal-actions"><button class="secondary-button" id="cancelModal">Để sau</button><button class="primary-button" id="saveSubject">Tạo môn học</button></div>`,
  );
  $$(".emoji-choice").forEach(
    (b) =>
      (b.onclick = () => {
        emoji = b.dataset.emoji;
        $$(".emoji-choice").forEach((x) =>
          x.classList.toggle("selected", x === b),
        );
      }),
  );
  $$(".color-swatch").forEach(
    (b) =>
      (b.onclick = () => {
        color = +b.dataset.color;
        $$(".color-swatch").forEach((x) =>
          x.classList.toggle("selected", x === b),
        );
      }),
  );
  $("#cancelModal").onclick = closeModal;
  $("#saveSubject").onclick = () => {
    const name = $("#newSubjectName").value.trim();
    if (!name) {
      $("#newSubjectName").focus();
      return;
    }
    const course = { id: crypto.randomUUID(), name, emoji, color, lessons: [] };
    data.push(course);
    save();
    render();
    closeModal();
    openCourse(course.id);
    toast("Đã tạo môn học mới");
  };
  $("#newSubjectName").onkeydown = (e) => {
    if (e.key === "Enter") $("#saveSubject").click();
  };
}
function lessonModal() {
  showModal(
    `<h3>Tạo bài học mới</h3><p>Đặt tên và chọn ngày học để sắp xếp sổ tay.</p><label class="form-label">Tên bài học</label><input id="newLessonName" class="form-input" placeholder="Ví dụ: Chương 3 — Tích phân" maxlength="90"><label class="form-label">Ngày học</label><input id="newLessonDate" type="date" class="form-input" value="${new Date().toISOString().slice(0, 10)}"><div class="modal-actions"><button class="secondary-button" id="cancelModal">Để sau</button><button class="primary-button" id="saveLesson">Tạo bài học</button></div>`,
    "📝",
  );
  $("#cancelModal").onclick = closeModal;
  $("#saveLesson").onclick = () => {
    const title = $("#newLessonName").value.trim(),
      date = $("#newLessonDate").value;
    if (!title || !date) {
      $("#newLessonName").focus();
      return;
    }
    const lesson = {
      id: crypto.randomUUID(),
      title,
      date,
      notes: "",
      images: [],
    };
    activeCourse.lessons.push(lesson);
    save();
    closeModal();
    renderLessons();
    selectLesson(lesson);
    toast("Đã tạo bài học mới");
  };
  $("#newLessonName").onkeydown = (e) => {
    if (e.key === "Enter") $("#saveLesson").click();
  };
}
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}
function esc(s = "") {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
$("#todayText").textContent = new Date()
  .toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
  .replace(",", " ·");
$("#addSubject").onclick = subjectModal;
$("#addSubjectSide").onclick = subjectModal;
$("#backHome").onclick = () => {
  $("#courseView").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#breadcrumb").innerHTML =
    "<span>Không gian học tập</span><b>/</b><strong>Tất cả môn học</strong>";
  window.scrollTo(0, 0);
};
$("#homeNav").onclick = $("#backHome").onclick;
$("#addLesson").onclick = lessonModal;
$("#addLessonSmall").onclick = lessonModal;
$("#firstLesson").onclick = lessonModal;
$("#emptyAddLesson").onclick = lessonModal;
$("#modalClose").onclick = closeModal;
$(".modal-backdrop").onclick = closeModal;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
$$(".tab").forEach(
  (t) =>
    (t.onclick = () => {
      $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
      $$(".tab-content").forEach((x) =>
        x.classList.toggle("active", x.id === `${t.dataset.tab}Tab`),
      );
    }),
);
$("#pdfInput").onchange = (e) => uploadPdf(e.target.files[0]);
$("#imageInput").onchange = (e) => uploadImages([...e.target.files]);
let noteTimer;
$("#notesInput").oninput = () => {
  if (!activeLesson) return;
  $("#savedState").textContent = "● Đang lưu...";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    activeLesson.notes = $("#notesInput").value;
    save();
    $("#savedState").textContent = "● Đã lưu";
  }, 400);
};
$("#deleteLesson").onclick = () => {
  if (!activeLesson || !confirm("Xóa bài học này cùng tài liệu và ghi chú?"))
    return;
  const id = activeLesson.id;
  const lesson = activeLesson;
  activeCourse.lessons = activeCourse.lessons.filter((l) => l.id !== id);
  if (lesson.pdfId) dbDelete(lesson.pdfId);
  (lesson.images || []).forEach((i) => dbDelete(i.id));
  save();
  renderLessons();
  selectLesson(null);
  toast("Đã xóa bài học");
};
openDB().then((x) => {
  db = x;
});
render();
