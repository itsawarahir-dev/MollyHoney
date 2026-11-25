/* ==========================================================
   MOLLY HONEY — script.js (ใช้ร่วมกันทุกหน้า)
   ตรวจจาก element ที่มีในหน้า แล้วรันเฉพาะส่วนที่เกี่ยวข้อง
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

var APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKpuFHLxdzvoj8HUu8o8tiTuwC_LvPcrENoFybFLG0QVZO8mi3P--EMjEdsXq50smj/exec";

var ORDERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS7adN9ZWTUHLY2Vdcel_k3w3WZGyKwAvod9kEmHMNZ7aGE-Ftb0Efr26X0jvOkW3DIeSuRQbPn9leA/pub?gid=0&single=true&output=csv";

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.querySelector("#ordersTable tbody")) initAdminPage();
});

/* ==========================================================
   1) หน้าสินค้า (product.html)
   ========================================================== */
function initProductPage() {
  var listEl = document.getElementById("product-list");
  var barEl = document.getElementById("filter-bar");
  var products = [];

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ (" + res.status + ")");
      return res.json();
    })
    .then(function (data) {
      products = data;
      var param = new URLSearchParams(window.location.search).get("mood");
      buildFilterBar(param);
      applyFilter(param || "all");
    })
    .catch(function (error) {
      console.error(error);
      listEl.innerHTML = "";
      listEl.appendChild(messageEl("ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง"));
    });

  // ปุ่มกรอง: "ทั้งหมด" + หนึ่งปุ่มต่อหนึ่งกลิ่น (ชื่อสินค้า)
  function buildFilterBar(activeKey) {
    if (!barEl) return;
    barEl.innerHTML = "";
    barEl.appendChild(makeFilterButton("all", "ทั้งหมด"));
    products.forEach(function (p) {
      barEl.appendChild(makeFilterButton(p.id, p.name));
    });
  }

  function makeFilterButton(key, label) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = label;
    btn.dataset.filter = key;
    btn.addEventListener("click", function () {
      applyFilter(key);
    });
    return btn;
  }

  // key อาจเป็น "all", id สินค้า, ชื่อสินค้า หรือ mood (จาก ?mood=xxx)
  function applyFilter(key) {
    var shown = products.filter(function (p) {
      return key === "all" || p.id === key || p.name === key || p.mood === key;
    });

    // ถ้าพารามิเตอร์ไม่ตรงกับสินค้าใดเลย ให้แสดงทั้งหมด
    if (shown.length === 0) {
      key = "all";
      shown = products;
    }

    if (barEl) {
      Array.prototype.forEach.call(barEl.querySelectorAll("button"), function (b) {
        var active = b.dataset.filter === key;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    listEl.innerHTML = "";
    shown.forEach(function (p) {
      listEl.appendChild(renderCard(p));
    });
  }

  function renderCard(p) {
    var card = document.createElement("article");
    card.className = "card mood-" + p.mood;

    var img = document.createElement("img");
    img.className = "card__image";
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";

    var title = document.createElement("h3");
    title.className = "card__title";
    var dot = document.createElement("span");
    dot.className = "mood-dot";
    title.appendChild(dot);
    title.appendChild(document.createTextNode(p.name));

    var meta = document.createElement("p");
    meta.className = "card__meta";
    meta.textContent = p.size;

    var price = document.createElement("p");
    price.className = "card__price";
    price.textContent = formatPrice(p.price) + " ";
    var unit = document.createElement("small");
    unit.textContent = "บาท";
    price.appendChild(unit);

    var order = document.createElement("a");
    order.className = "btn btn--gold btn--block";
    order.textContent = "สั่งซื้อ";
    order.href = buildOrderUrl(p);

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(price);
    card.appendChild(order);
    return card;
  }

  // ตัวอย่าง: order.html?item=น้ำผึ้งดอกไม้ 100ml&price=150 (encode ให้ปลอดภัยแล้ว)
  function buildOrderUrl(p) {
    var itemName = p.name + " " + String(p.size).replace(/\s+/g, "");
    return (
      "order.html?item=" + encodeURIComponent(itemName) +
      "&price=" + encodeURIComponent(p.price)
    );
  }
}

/* ==========================================================
   2) หน้าสั่งซื้อ (order.html)
   ========================================================== */
function initOrderPage() {
  var form = document.getElementById("orderForm");
  var params = new URLSearchParams(window.location.search);

  // เติมทั้งชื่อสินค้า (#items) และราคา (#total) ทันทีที่โหลดหน้า
  var itemsEl = document.getElementById("items");
  var totalEl = document.getElementById("total");
  var item = params.get("item");
  var price = params.get("price");

  if (itemsEl && item !== null) itemsEl.value = item;
  if (totalEl && price !== null) totalEl.value = price;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim()
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================
   3) หน้าแอดมิน (admin.html)
   ========================================================== */
function initAdminPage() {
  var tbody = document.querySelector("#ordersTable tbody");
  var COLS = 6;

  showRow("กำลังโหลดข้อมูล...");

  fetch(ORDERS_CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ (" + res.status + ")");
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องแรกไม่มีตัวเลขเลย) ให้ข้ามไป
      if (rows.length && !/\d/.test(rows[0][0] || "")) rows.shift();

      if (rows.length === 0) {
        showRow("ยังไม่มีคำสั่งซื้อ");
        return;
      }

      // แถวถูกเพิ่มต่อท้ายตามเวลา จึงกลับลำดับให้รายการล่าสุดขึ้นก่อน
      rows.reverse();

      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        for (var i = 0; i < COLS; i++) {
          var td = document.createElement("td");
          td.textContent = r[i] !== undefined ? r[i] : "";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showRow("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    });

  function showRow(message) {
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = COLS;
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

/* ---------- CSV parser (ไม่ใช้ library) ----------
   รองรับ: เครื่องหมายคำพูด, "" แทน ", คอมมาและขึ้นบรรทัดใหม่ในช่อง,
   ทั้ง \n และ \r\n, และ BOM ต้นไฟล์ */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่างทิ้ง
  return rows.filter(function (r) {
    return r.some(function (cell) { return cell.trim() !== ""; });
  });
}

/* ---------- Helpers ---------- */
function formatPrice(n) {
  var num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString("th-TH");
}

function messageEl(text) {
  var p = document.createElement("p");
  p.className = "muted";
  p.textContent = text;
  return p;
}
