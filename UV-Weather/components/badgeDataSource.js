const refreshBadgeDataSource = (badgeDataSource) => {
  chrome.storage.local.set({ badgeDataSource }, () => {
    chrome.storage.local.remove("wCast", () => {
      if (typeof popup === "function") {
        popup();
      }
      applyBadgeDataSourceSelection(badgeDataSource);
    });
  });
};

const refreshBadgeInterval = (interval) => {
  chrome.storage.local.set({ IntervalUpdate: interval }, () => {
    chrome.runtime.sendMessage({ msg: "intervalUpdateMessage" });
    chrome.storage.local.remove("wCast", () => {
      if (typeof popup === "function") {
        popup();
      }
      document.getElementById(`setting_defualt_button_${interval}`).checked = true;
    });
  });
};

const applyBadgeDataSourceSelection = (badgeDataSource) => {
  const source = badgeDataSource === "realtime" ? "realtime" : "modeled";
  document.getElementById(`setting_badge_source_${source}`).checked = true;
};

document.addEventListener(
  "click",
  (event) => {
    const sourceOption = event.target.closest(
      "#setting_badge_source_realtime_all, #setting_badge_source_modeled_all, " +
        "#setting_defualt_button_15_all, #setting_defualt_button_30_all",
    );
    if (!sourceOption) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (sourceOption.id === "setting_badge_source_realtime_all") {
      refreshBadgeDataSource("realtime");
    } else if (sourceOption.id === "setting_badge_source_modeled_all") {
      refreshBadgeDataSource("modeled");
    } else {
      refreshBadgeInterval(sourceOption.id.includes("_15_") ? "15" : "30");
    }
  },
  true,
);

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("badgeDataSource", (data) => {
    applyBadgeDataSourceSelection(data.badgeDataSource);
  });

  chrome.storage.local.get("IntervalUpdate", (data) => {
    const interval = data.IntervalUpdate === undefined
      ? "15"
      : String(data.IntervalUpdate);
    const intervalButton = document.getElementById(
      `setting_defualt_button_${interval}`,
    );
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
    chrome.storage.local.get("badgeDataSource", (data) => {
      applyBadgeDataSourceSelection(data.badgeDataSource);
    });
    return result;
  };
};

if (typeof basicUser === "function") {
  basicUser = preserveBadgeDataSourceSelection(basicUser);
}

if (typeof proUser === "function") {
  proUser = preserveBadgeDataSourceSelection(proUser);
}
