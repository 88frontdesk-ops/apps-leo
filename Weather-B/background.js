if (!self.document) {
  try {
    importScripts(
      "./libraries/tz.js",
      "./libraries/moment.js",
      "./libraries/moment-timezone-with-data-10-year-range.min.js",
      "./components/util.js",
      "./libraries/suncalc.js",
      "./components/nwsAdapter.js",
      "./components/weatherCast.js",
    );

    const setLocationDefaults = (location) => {
      chrome.storage.local.set({
        timezone: location.timezone,
        citys: location.citys,
        latlong: location.latlong,
        country: location.country,
        ipCountry: location.country,
        verUpdate: 1,
        badgeSize: "0",
        whiteIcon: "1",
        setSettingFC: "c",
        theme: "dark",
        animatedIcon: "1",
        badgeDataSource: "realtime",
        IntervalUpdate: "15",
        badgeAlert: true,
      });
      badgeTempUV(location.latlong, location.country, location.timezone);
    };

    const defaultCity = () => setLocationDefaults({
      citys: "New York",
      latlong: "40.713,-74.0072",
      timezone: "America/New_York",
      country: "US",
    });

    const initializeLocation = () => {
      chrome.storage.local.get("verUpdate", (data) => {
        if ([1, 2].includes(data.verUpdate)) return;
        // Do not send the user's IP to a third-party geolocation service.
        // Use the browser's location permission when available, otherwise use
        // the existing safe default. Weather providers only receive the
        // coordinates already selected for Weather-B.
        if (!navigator.geolocation) return defaultCity();

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const timezone = tzlookup(latitude, longitude);
            setLocationDefaults({
              citys: "Current location",
              latlong: `${latitude},${longitude}`,
              timezone,
              country: "",
            });
          },
          defaultCity,
          { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
        );
      });
    };

    const badgeTempUV = (latlong, country, timezone) => {
      if (!latlong || !timezone) return;
      timeZoneBadge = getTimezoneOffset(timezone);
      chrome.storage.local.get(["badgeDataSource", "IntervalUpdate"], (data) => {
        const requiresFreshData =
          data.badgeDataSource === "realtime" ||
          ["15", "30"].includes(String(data.IntervalUpdate));
        if (requiresFreshData) {
          chrome.storage.local.remove("wCast", () => weCast(latlong, country, timezone));
        } else {
          weCast(latlong, country, timezone);
        }
      });
    };

    const intervalUpdate = () => {
      chrome.storage.local.get("IntervalUpdate", (data) => {
        const interval = parseInt(data.IntervalUpdate, 10) || 60;
        if (!data.IntervalUpdate) chrome.storage.local.set({ IntervalUpdate: "60" });
        chrome.alarms.create("intervalUpdateTimes", {
          delayInMinutes: 0.05,
          periodInMinutes: Math.max(15, interval),
        });
      });
    };

    chrome.storage.local.get("verUpdate", (data) => {
      if (![1, 2].includes(data.verUpdate)) initializeLocation();
      else {
        chrome.storage.local.get(["latlong", "country", "timezone"], (location) => {
          badgeTempUV(location.latlong, location.country, location.timezone);
        });
      }
      intervalUpdate();
    });

    chrome.runtime.onStartup.addListener(() => {
      chrome.storage.local.get(["latlong", "country", "timezone"], (data) => {
        badgeTempUV(data.latlong, data.country, data.timezone);
      });
    });

    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        chrome.storage.local.set({ setSettingFC: "c", TimeFormat: "12h" });
        initializeLocation();
      } else if (details.reason === "update") {
        chrome.storage.local.get(["latlong", "country"], (data) => {
          if (!data.latlong) return initializeLocation();
          const [lat, lng] = data.latlong.split(",");
          const timezone = tzlookup(lat, lng);
          chrome.storage.local.set({ timezone });
          badgeTempUV(data.latlong, data.country, timezone);
        });
      }
    });

    chrome.runtime.onMessage.addListener((request, sender) => {
      if (sender.id !== chrome.runtime.id) return;
      if (request.msg === "intervalUpdateMessage") intervalUpdate();
    });

    chrome.idle.setDetectionInterval(900);
    chrome.idle.onStateChanged.addListener((state) => {
      if (state !== "active") return;
      chrome.storage.local.get(["latlong", "country", "timezone"], (data) => {
        badgeTempUV(data.latlong, data.country, data.timezone);
      });
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== "intervalUpdateTimes") return;
      chrome.storage.local.get(["latlong", "country", "timezone"], (data) => {
        badgeTempUV(data.latlong, data.country, data.timezone);
      });
    });
  } catch (e) {
    console.error("Weather-B background initialization failed", e);
  }
}
