const updateFetchTimeLabel = () => {
  const labels = document.querySelectorAll(".updateOn_date");
  if (!labels.length || typeof moment === "undefined") return false;

  chrome.storage.local.get("TimeFormat", (data) => {
    const format = data.TimeFormat === "24h" ? "MMM D, HH:mm" : "MMM Do, h:mm A";
    const offset = typeof offsetUnix === "number" ? offsetUnix : 0;
    const fetchedAt = moment.unix(Math.floor(Date.now() / 1000) + offset);
    const text = `${chrome.i18n.getMessage("updatedOn")} ${fetchedAt.format(format)}`;
    labels.forEach((label) => {
      label.textContent = text;
    });
  });
  return true;
};

document.addEventListener("DOMContentLoaded", () => {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (updateFetchTimeLabel() || attempts >= 100) clearInterval(timer);
  }, 50);
});
