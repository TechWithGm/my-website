js = r'''const latestPosts = [
  ["UPSC Civil Services Prelims 2025 – Admit Card Released","28 Sep 2025"],
  ["Bihar Police Constable Recruitment 2025 – Apply Online","27 Sep 2025"],
  ["SSC GD Constable Result 2025 – Check Now","26 Sep 2025"],
  ["JEE Main 2025 Session 2 Result – Download Score Card","25 Sep 2025"],
  ["PM Kisan 20th Installment – Beneficiary List Released","24 Sep 2025"],
  ["Bihar Board Exam 2025 – Latest Important Notice","22 Sep 2025"]
];

const latestList = document.getElementById("latestList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");

function renderPosts(posts = latestPosts) {
  latestList.innerHTML = "";
  posts.forEach(([title,date]) => {
    const item = document.createElement("div");
    item.className = "latest-item";
    item.innerHTML = `<span class="title">${title}</span><span class="date">${date}</span>`;
    latestList.appendChild(item);
  });
}

function searchPosts() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    renderPosts();
    return;
  }

  const matches = latestPosts.filter(([title]) =>
    title.toLowerCase().includes(query)
  );

  renderPosts(matches);

  if (!matches.length) {
    latestList.innerHTML = `<div class="latest-item"><span class="title">"${searchInput.value}" के लिए कोई update नहीं मिला।</span></div>`;
  }
}

searchBtn.addEventListener("click", searchPosts);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchPosts();
});

menuBtn.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

document.querySelectorAll(".nav-inner a").forEach(link => {
  link.addEventListener("click", () => mainNav.classList.remove("open"));
});

renderPosts();
'''

(base/"index.html").write_text(html, encoding="utf-8")
(base/"style.css").write_text(css, encoding="utf-8")
(base/"script.js").write_text(js, encoding="utf-8")

zip_path = Path("/mnt/data/Cyber-Help-Modern-Portal.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for p in [base/"index.html", base/"style.css", base/"script.js"]:
        z.write(p, p.name)

print("Created:")
print(base/"index.html")
print(base/"style.css")
print(base/"script.js")
print(zip_path)
