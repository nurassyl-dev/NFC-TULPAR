/* Поведение кнопок и галереи. Контакты и фотографии меняются в index.html. */
const $ = selector => document.querySelector(selector);
const page = $(".page");
const gallery = $("#gallery-track");
/* Каждая строка <img> в index.html превращается в карточку галереи. */
const items = [...gallery.children]
  .filter(element => element.tagName === "IMG")
  .map((img, index) => {
    const title = img.alt.trim() || "Автобус " + (index + 1);
    const button = document.createElement("button");
    const caption = document.createElement("span");
    button.className = "gallery-item";
    button.type = "button";
    button.dataset.title = title;
    button.dataset.demo = img.dataset.demo === "true" ? "true" : "false";
    button.setAttribute("aria-label", "Открыть фото: " + title);
    img.alt = title;
    img.loading = index === 0 ? "eager" : "lazy";
    img.decoding = "async";
    caption.textContent = title;
    gallery.replaceChild(button, img);
    button.append(img, caption);
    return button;
  });
const settings = {
  phone: page.dataset.phone,
  whatsapp: page.dataset.whatsapp,
  instagram: page.dataset.instagram,
  tiktok: page.dataset.tiktok
};
const companyName = "TULPAR";
const routeFrom = "Алматы";
const routeTo = "Сарыағаш";
let currentIndex = 0;
let lightboxIndex = 0;
let toastTimer;

function phoneDigits(value) {
  const text = String(value || "").trim();
  if (!/^\+?[\d\s()-]{7,25}$/.test(text)) return "";
  const result = text.replace(/\D/g, "");
  return result.length >= 7 && result.length <= 15 ? result : "";
}

function socialUrl(value, host) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (url.hostname !== host && url.hostname !== "www." + host && !url.hostname.endsWith("." + host)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function setLink(element, href) {
  if (href) {
    element.href = href;
    element.classList.remove("is-disabled");
    element.removeAttribute("aria-disabled");
    element.removeAttribute("tabindex");
    if (href.startsWith("https:")) {
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    } else {
      element.removeAttribute("target");
      element.removeAttribute("rel");
    }
  } else {
    element.removeAttribute("href");
    element.classList.add("is-disabled");
    element.setAttribute("aria-disabled", "true");
    element.setAttribute("tabindex", "-1");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

function setupContacts() {
  const phone = phoneDigits(settings.phone);
  const whatsapp = phoneDigits(settings.whatsapp);
  const bookingText = "Здравствуйте! Хочу узнать о поездке TULPAR по маршруту " + routeFrom + " — " + routeTo + ". Подскажите, пожалуйста, наличие мест.";
  setLink($("#whatsapp-link"), whatsapp ? "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(bookingText) : "");
  setLink($("#instagram-link"), socialUrl(settings.instagram, "instagram.com"));
  setLink($("#tiktok-link"), socialUrl(settings.tiktok, "tiktok.com"));
  setLink($("#call-link"), phone ? "tel:+" + phone : "");
  setLink($("#phone-link"), phone ? "tel:+" + phone : "");
  $("#phone-text").textContent = phone ? settings.phone : "Номер пока не указан";
  $("#save-contact").disabled = !(phone || whatsapp);
}

function escapeVcard(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldVcard(line) {
  const encoder = new TextEncoder();
  let folded = "";
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      folded += "\r\n ";
      bytes = 1;
    }
    folded += character;
    bytes += length;
  }
  return folded;
}

function publicUrl() {
  if (location.protocol !== "https:") return "";
  return location.origin + location.pathname;
}

function makeVcard() {
  const phone = phoneDigits(settings.phone);
  const whatsapp = phoneDigits(settings.whatsapp);
  if (!phone && !whatsapp) return "";
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:;" + escapeVcard(companyName) + ";;;",
    "FN:" + escapeVcard(companyName + " — " + routeFrom + " " + routeTo),
    "ORG:" + escapeVcard(companyName),
    "NOTE:" + escapeVcard("Маршрут " + routeFrom + " ⇄ " + routeTo)
  ];
  if (phone) lines.push("TEL;TYPE=CELL,VOICE:+" + phone);
  if (whatsapp && whatsapp !== phone) lines.push("TEL;TYPE=CELL:+" + whatsapp);
  if (whatsapp) lines.push("X-WHATSAPP:+" + whatsapp);
  if (publicUrl()) lines.push("URL:" + escapeVcard(publicUrl()));
  lines.push("END:VCARD");
  return lines.map(foldVcard).join("\r\n") + "\r\n";
}

async function saveContact() {
  const text = makeVcard();
  if (!text) return;
  try {
    const blob = new Blob([text], {type: "text/vcard;charset=utf-8"});
    if (typeof File === "function" && navigator.canShare && navigator.share) {
      const file = new File([blob], "TULPAR.vcf", {type: blob.type});
      if (navigator.canShare({files: [file]})) {
        try {
          await navigator.share({files: [file], title: companyName});
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TULPAR.vcf";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showToast("Откройте файл .vcf и подтвердите сохранение контакта.");
  } catch {
    showToast("Не удалось подготовить контакт.");
  }
}

function photoAt(index) {
  const item = items[index];
  return {
    img: item.querySelector("img"),
    title: item.dataset.title || item.querySelector("span").textContent,
    demo: item.dataset.demo === "true"
  };
}

function setupPhotos() {
  if (!items.length) {
    $(".gallery").hidden = true;
    $(".hero-photo-wrap").hidden = true;
    return;
  }
  const first = photoAt(0);
  const hero = $("#hero-photo");
  hero.src = first.img.currentSrc || first.img.src;
  hero.alt = first.img.alt;
  $(".photo-caption").hidden = !first.demo;
  $(".gallery-note").hidden = items.every(item => item.dataset.demo !== "true");
  hero.addEventListener("error", () => {
    hero.hidden = true;
    $(".photo-caption").textContent = "ФОТО НЕДОСТУПНО";
    $(".photo-caption").hidden = false;
  });

  items.forEach((item, index) => {
    item.addEventListener("click", () => openLightbox(index));
    const img = item.querySelector("img");
    const markError = () => {
      img.hidden = true;
      item.classList.add("photo-error");
      item.disabled = true;
    };
    img.addEventListener("error", markError);
    if (img.complete && img.naturalWidth === 0) markError();
  });
  updateCount();
}

function updateCount() {
  $("#gallery-count").textContent =
    String(currentIndex + 1).padStart(2, "0") + " / " +
    String(items.length).padStart(2, "0");
}

function goToPhoto(index) {
  currentIndex = Math.max(0, Math.min(items.length - 1, index));
  gallery.scrollTo({
    left: items[currentIndex].offsetLeft - items[0].offsetLeft,
    behavior: "smooth"
  });
  updateCount();
}

function showLightboxPhoto() {
  const photo = photoAt(lightboxIndex);
  $("#lightbox-image").src = photo.img.currentSrc || photo.img.src;
  $("#lightbox-image").alt = photo.img.alt;
  $("#lightbox-caption").textContent =
    photo.title + (photo.demo ? " · демонстрационное фото" : "");
}

function openLightbox(index) {
  lightboxIndex = index;
  showLightboxPhoto();
  $("#lightbox").showModal();
}

function changeLightbox(delta) {
  lightboxIndex = (lightboxIndex + delta + items.length) % items.length;
  showLightboxPhoto();
}

$("#save-contact").addEventListener("click", saveContact);
$("#gallery-prev").addEventListener("click", () => goToPhoto(currentIndex - 1));
$("#gallery-next").addEventListener("click", () => goToPhoto(currentIndex + 1));
gallery.addEventListener("scroll", () => {
  if (!items.length) return;
  const step = items[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(gallery).columnGap) || 0);
  currentIndex = Math.max(0, Math.min(items.length - 1, Math.round(gallery.scrollLeft / step)));
  updateCount();
}, {passive: true});

$("#lightbox-close").addEventListener("click", () => $("#lightbox").close());
$("#lightbox-prev").addEventListener("click", () => changeLightbox(-1));
$("#lightbox-next").addEventListener("click", () => changeLightbox(1));
$("#lightbox").addEventListener("click", event => {
  if (event.target === $("#lightbox")) $("#lightbox").close();
});
document.addEventListener("keydown", event => {
  if (!$("#lightbox").open) return;
  if (event.key === "ArrowLeft") changeLightbox(-1);
  if (event.key === "ArrowRight") changeLightbox(1);
});
let touchStart = 0;
$("#lightbox").addEventListener("touchstart", event => {
  touchStart = event.changedTouches[0].screenX;
}, {passive: true});
$("#lightbox").addEventListener("touchend", event => {
  const movement = event.changedTouches[0].screenX - touchStart;
  if (Math.abs(movement) > 50) changeLightbox(movement > 0 ? -1 : 1);
}, {passive: true});

setupContacts();
setupPhotos();
