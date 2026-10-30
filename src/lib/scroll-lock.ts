// Stops the page behind a pop-up from scrolling WITHOUT hiding the scrollbar. Hiding it makes the
// whole page jump sideways, so we keep the scrollbar track visible and freeze the page in place.

let locks = 0;
let saved = { scrollY: 0, bodyStyle: "", htmlOverflowY: "" };

export function lockScroll() {
  if (locks++ > 0) return;
  const body = document.body;
  const html = document.documentElement;
  saved = { scrollY: window.scrollY, bodyStyle: body.getAttribute("style") ?? "", htmlOverflowY: html.style.overflowY };
  html.style.overflowY = "scroll";
  body.style.position = "fixed";
  body.style.top = `-${saved.scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
}

export function unlockScroll() {
  if (locks === 0 || --locks > 0) return;
  const body = document.body;
  if (saved.bodyStyle) body.setAttribute("style", saved.bodyStyle);
  else body.removeAttribute("style");
  document.documentElement.style.overflowY = saved.htmlOverflowY;
  window.scrollTo({ top: saved.scrollY, behavior: "instant" });
}
