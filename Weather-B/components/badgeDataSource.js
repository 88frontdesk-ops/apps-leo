const refreshBadgeDataSource = (badgeDataSource) => {
  chrome.storage.local.set({ badgeDataSource }, () => {
    chrome.storage.local.remove("wCast", () => {
      if (typeof popup === "function") popup();
      applyBadgeDataSourceSelection(badgeDataSource);
    });
  });
};

const refreshBadgeInterval = (interval) => {
  chrome.storage.local.set({ IntervalUpdate: interval }, () => {
    chrome.runtime.sendMessage({ msg: "intervalUpdateMessage" });
    chrome.storage.local.remove("wCast", () => {
      if (typeof popup === "function") popup();
      document.getElementById(`setting_defualt_button_${interval}`).checked = true;
    });
  });
};

const applyBadgeDataSourceSelection = (badgeDataSource) => {
  const source = badgeDataSource === "modeled" ? "modeled" : "realtime";
  const element = document.getElementById(`setting_badge_source_${source}`);
  if (element) element.checked = true;
};

const applyWeatherApiSource = (source) => {
  const sourceElement = document.getElementById("weather_api_source");
  if (!sourceElement) return;
  const allowedSources = ["Open-Meteo", "Open-Meteo + National Weather Service"];
  sourceElement.textContent = allowedSources.includes(source) ? `API: ${source}` : "API: Open-Meteo";
};

// Remove the legacy Express/UVW QR panel if it is present in an older popup
// template. This also prevents the legacy panel from remaining visible after
// an extension update without requiring the user to clear extension data.
const removeLegacyUvwUi = () => {
  document.getElementById("express_qr")?.remove();
  document.getElementById("support_Class")?.remove();
};

if (document.documentElement) {
  removeLegacyUvwUi();
  new MutationObserver(removeLegacyUvwUi).observe(document.documentElement, { childList: true, subtree: true });
}

document.addEventListener("click", (event) => {
  const sourceOption = event.target.closest(
    "#setting_badge_source_realtime_all, #setting_badge_source_modeled_all, " +
      "#setting_defualt_button_15_all, #setting_defualt_button_30_all",
  );
  if (!sourceOption) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (sourceOption.id === "setting_badge_source_realtime_all") refreshBadgeDataSource("realtime");
  else if (sourceOption.id === "setting_badge_source_modeled_all") refreshBadgeDataSource("modeled");
  else refreshBadgeInterval(sourceOption.id.includes("_15_") ? "15" : "30");
}, true);

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.remove("weatherApiSource");
  chrome.storage.local.get("weatherApiSource", (data) => applyWeatherApiSource(data.weatherApiSource));

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.weatherApiSource) applyWeatherApiSource(changes.weatherApiSource.newValue);
  });

  chrome.storage.local.get("badgeDataSource", (data) => {
    applyBadgeDataSourceSelection(data.badgeDataSource);
    if (data.badgeDataSource === undefined) chrome.storage.local.set({ badgeDataSource: "realtime" });
  });

  chrome.storage.local.get("IntervalUpdate", (data) => {
    const interval = data.IntervalUpdate === undefined ? "15" : String(data.IntervalUpdate);
    const intervalButton = document.getElementById(`setting_defualt_button_${interval}`);
    if (intervalButton) intervalButton.checked = true;
    if (data.IntervalUpdate === undefined) {
      chrome.storage.local.set({ IntervalUpdate: "15" });
      chrome.runtime.sendMessage({ msg: "intervalUpdateMessage" });
    }
  });
});

const preserveBadgeDataSourceSelection = (handler) => {
  if (typeof handler !== "function") return handler;
  return (...args) => {
    const result = handler(...args);
    chrome.storage.local.get("badgeDataSource", (data) => applyBadgeDataSourceSelection(data.badgeDataSource));
    return result;
  };
};

if (typeof basicUser === "function") basicUser = preserveBadgeDataSourceSelection(basicUser);
if (typeof proUser === "function") proUser = preserveBadgeDataSourceSelection(proUser);
