if (typeof globalThis.fetch === "function" && !globalThis.__weatherFetchTracked) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.__weatherFetchTracked = true;
  globalThis.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url;
    if (requestUrl?.startsWith("https://weather.uvw.workers.dev/")) {
      globalThis._lastWeatherFetchAt = Math.floor(Date.now() / 1000);
    }
    return response;
  };
}

const updateFetchTimeLabel = () => {
  const labels = document.querySelectorAll(".updateOn_date");
  const fetchLabel = document.getElementById("fetch_time_label");
  const weather = window.wCast;
  if (!labels.length || !fetchLabel || !weather?.currentWeather?.asOf || typeof moment === "undefined") return false;

  chrome.storage.local.get("TimeFormat", (data) => {
    const format = data.TimeFormat === "24h" ? "MMM D, HH:mm" : "MMM Do, h:mm A";
    const offset = typeof offsetUnix === "number" ? offsetUnix : 0;
    const sourceTime = moment.unix(toTimestamp(weather.currentWeather.asOf) + offset);
    const fetchedAt = moment.unix((globalThis._lastWeatherFetchAt || weather._fetchedAt || Math.floor(Date.now() / 1000)) + offset);
    const text = `NWS data from ${sourceTime.format(format)}`;
    labels.forEach((label) => {
      label.textContent = text;
    });
    fetchLabel.textContent = `Fetched ${fetchedAt.format(format)}`;
  });
  return Boolean(weather);
};

document.addEventListener("DOMContentLoaded", () => {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (updateFetchTimeLabel() || attempts >= 100) clearInterval(timer);
  }, 50);
});
