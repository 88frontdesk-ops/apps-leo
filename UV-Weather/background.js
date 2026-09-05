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

    const tokanID = "b82c08a7b8bd216c445c2fc968c6cb71";
    const projectID = "2595739";

    const mp_SetProfile = () => {
      deviceId = uuidv4();
      versionApp = chrome.runtime.getManifest().version;
      currentTime = new Date();
      currentTimeISO = currentTime.toISOString();

      chrome.storage.local.set({
        deviceId: deviceId,
        installedAt: currentTimeISO,
      });

      chrome.storage.local.get(
        [
          "setAsHomepage",
          "selectedLocationNumber",
          "theme",
          "IntervalUpdate",
          "whiteIcon",
          "badgeSize",
          "setSettingUT",
          "animatedIcon",
          "autoDark",
          "badgeAlert",
        ],
        (data) => {
          setAsHomepage =
            typeof data.setAsHomepage !== "undefined"
              ? data.setAsHomepage
              : "home";

          selectedLocationNumber =
            typeof data.selectedLocationNumber !== "undefined"
              ? data.selectedLocationNumber
              : 1;

          theme =
            typeof data.theme !== "undefined" && data.theme === "dark"
              ? "Dark"
              : "Light";

          IntervalUpdate =
            typeof data.IntervalUpdate !== "undefined"
              ? data.IntervalUpdate
              : "60";

          badgeColor =
            typeof data.whiteIcon !== "undefined" && data.whiteIcon === 1
              ? "White"
              : "Black";

          badgeSize =
            typeof data.badgeSize !== "undefined" && data.badgeSize === 1
              ? "Large"
              : "Small";

          badgeAlert =
            typeof data.badgeAlert !== "undefined" && data.badgeAlert
              ? true
              : false;

          setSettingUT =
            typeof data.setSettingUT !== "undefined" &&
            data.setSettingUT === "u"
              ? "UVI"
              : "Temperature";

          animatedIcon =
            typeof data.animatedIcon !== "undefined" && data.animatedIcon === 1
              ? "On"
              : "Off";

          autoDark =
            typeof data.autoDark !== "undefined" && data.autoDark === 1
              ? "On"
              : "Off";

          const profileSetData = {
            $token: tokanID,
            $distinct_id: deviceId,
            $set: {
              "Install Date": currentTimeISO,
              "First Version": versionApp,
              "Current Version": versionApp,
              "Set as Homepage": setAsHomepage,
              "Selected Locations": selectedLocationNumber,
              "Theme Mode": theme,
              "Interval Update": IntervalUpdate,
              "Badge Color": badgeColor,
              "Badge Size": badgeSize,
              "Badge Type": setSettingUT,
              "Badge Alert": badgeAlert,
              "Animated Icon": animatedIcon,
              "Auto Dark Mode": autoDark,
              Pinned: false,
              ...(ip ? { IP: ip } : {}),
            },
          };

          const option_setProfile = {
            method: "POST",
            headers: {
              Accept: "text/plain",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              data: JSON.stringify(profileSetData),
            }),
          };

          fetch(
            "https://api.mixpanel.com/engage#profile-set",
            option_setProfile,
          )
            .then((response) => response.json())
            .then(() => {
              chrome.alarms.create("bgUpdateTimes", {
                delayInMinutes: 0.05,
                periodInMinutes: 120,
              });
              intervalUpdate();
            });
        },
      );
    };

    const mp_UpdateProfile = () => {
      chrome.storage.local.get(["deviceId", "userId"], (data) => {
        if (data.userId && !data.deviceId) {
          deviceId = data.userId;
          chrome.storage.local.set({ deviceId });
        } else {
          deviceId = data.deviceId;
        }

        versionApp = chrome.runtime.getManifest().version;
        currentTime = new Date();
        currentTimeISO = currentTime.toISOString();

        const profileData = {
          $token: tokanID,
          $distinct_id: deviceId,
          $set: {
            "App Update Date": currentTimeISO,
            "Current Version": versionApp,
          },
        };

        const option_updateProfile = {
          method: "POST",
          headers: {
            Accept: "text/plain",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            data: JSON.stringify(profileData),
          }),
        };

        fetch(
          "https://api.mixpanel.com/engage#profile-set",
          option_updateProfile,
        )
          .then((response) => response.json())
          .then(() => {
            chrome.alarms.create("bgUpdateTimes", {
              delayInMinutes: 0.05,
              periodInMinutes: 120,
            });
          });
      });
    };

    chrome.storage.local.get("verUpdate", (data) => {
      verUpdate = data.verUpdate;
      if (![1, 2].includes(verUpdate)) {
        const options_myLocation_bg = {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "uvweather.net (info@uvweather.net)",
            "X-Extension-Auth": "uvweather.net",
          },
        };

        fetchPlus(() =>
          fetch("https://geolocation.uvw.workers.dev", options_myLocation_bg),
        )
          .then((response) => response.json())
          .then((resultGeo) => {
            if (typeof JSON.stringify(resultGeo.error) == "undefined") {
              ipAPI = JSON.stringify(resultGeo.userIP);
              ip = ipAPI.split('"')[1];
              countryAPI = JSON.stringify(resultGeo.country);
              country = countryAPI.split('"')[1];
              country = country === "ZZ" ? "" : country;
              city = JSON.stringify(resultGeo.city);
              cityName =
                city.split('"')[1].charAt(0).toUpperCase() +
                city.split('"')[1].slice(1);
              citys = truncateCityName(cityName);
              latlong = JSON.stringify(resultGeo.cityLatLong).split('"')[1];
              timezone = JSON.stringify(resultGeo.cityData[0].timezone).split(
                '"',
              )[1];

              chrome.storage.local.set({
                timezone: timezone,
                citys: citys,
                latlong: latlong,
                country: country,
                ipCountry: country,
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
              mp_SetProfile();
              badgeTempUV(latlong, country, timezone);
            } else {
              ip2address_alter();
            }
          })
          .catch((err) => {
            ip2address_alter();
          });
      }

      const ip2address_alter = () => {
        const options_myLocation_alter = {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "uvweather.net (info@uvweather.net)",
          },
        };

        fetchPlus(() =>
          fetch("https://ipinfo.io/json", options_myLocation_alter),
        )
          .then((response) => response.json())
          .then((resultIp) => {
            if (typeof JSON.stringify(resultIp.error) == "undefined") {
              ipAPI = JSON.stringify(resultIp.ip);
              ip = ipAPI.split('"')[1];
              countryAPI = JSON.stringify(resultIp.country);
              country = countryAPI.split('"')[1];
              country = country === "ZZ" ? "" : country;
              city = JSON.stringify(resultIp.city);
              cityName =
                city.split('"')[1].charAt(0).toUpperCase() +
                city.split('"')[1].slice(1);
              citys = truncateCityName(cityName);
              latlong = JSON.stringify(resultIp.loc).split('"')[1];
              timezone = JSON.stringify(resultIp.timezone).split('"')[1];

              chrome.storage.local.set({
                timezone: timezone,
                citys: citys,
                latlong: latlong,
                country: country,
                ipCountry: country,
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
              mp_SetProfile();

              badgeTempUV(latlong, country, timezone);
            } else {
              ip2address_alter();
            }
          })
          .catch((err) => {
            ip2address_alter2();
          });
      };

      const ip2address_alter2 = () => {
        fetchPlus(() => fetch("https://api.ip.sb/geoip"))
          .then((response) => response.json())
          .then((resultIp) => {
            if (resultIp.ip) {
              ip = resultIp.ip;
              country =
                resultIp.country_code === "ZZ" ? "" : resultIp.country_code;
              cityName =
                resultIp.city.charAt(0).toUpperCase() + resultIp.city.slice(1);
              citys = truncateCityName(cityName);
              latlong = `${resultIp.latitude},${resultIp.longitude}`;
              timezone = resultIp.timezone;

              chrome.storage.local.set({
                timezone: timezone,
                citys: citys,
                latlong: latlong,
                country: country,
                ipCountry: country,
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
              mp_SetProfile();
              badgeTempUV(latlong, country, timezone);
            } else {
              defaultCity();
            }
          })
          .catch((err) => {
            defaultCity();
          });
      };

      const defaultCity = () => {
        citys = "New York";
        latlong = "40.713,-74.0072";
        timezone = "America/New_York";
        country = "US";

        chrome.storage.local.set({
          timezone,
          citys,
          latlong,
          country,
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
        mp_SetProfile();

        badgeTempUV(latlong, country, timezone);
      };
    });

    chrome.runtime.onStartup.addListener((details) => {
      chrome.storage.local.get(
        ["latlong", "country", "citys", "timezone"],
        (data) => {
          latlong = data.latlong;
          country = data.country;
          citys = data.citys;
          timezone = data.timezone;
          mp_bgUpdate();

          badgeTempUV(latlong, country, timezone);
        },
      );
    });

    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason == "update") {
        chrome.storage.local.get(
          ["latlong", "country", "citys", "deviceId", "userId"],
          (data) => {
            versionApp = chrome.runtime.getManifest().version;
            latClick = data.latlong.split(",")[0];
            lngClick = data.latlong.split(",")[1];
            latlong = data.latlong;
            country = data.country;
            citys = data.citys;
            timezone = tzlookup(latClick, lngClick);
            chrome.storage.local.set({
              timezone: timezone,
            });

            if (data.userId && !data.deviceId) {
              deviceId = data.userId;
              chrome.storage.local.set({ deviceId });
            } else {
              deviceId = data.deviceId;
            }

            if (!deviceId) {
              mp_SetProfile();
            } else {
              mp_UpdateProfile();
              // mp_bgUpdate();
            }

            badgeTempUV(latlong, country, timezone);
          },
        );
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id) return;
      if (request.msg == "intervalUpdateMessage") {
        intervalUpdate();
      }
    });

    chrome.idle.setDetectionInterval(900);

    chrome.idle.onStateChanged.addListener((state) => {
      if (state == "active") {
        chrome.storage.local.get(
          ["latlong", "country", "citys", "timezone"],
          (data) => {
            latlong = data.latlong;
            country = data.country;
            citys = data.citys;
            timezone = data.timezone;
            mp_bgUpdate();

            badgeTempUV(latlong, country, timezone);
          },
        );
      }
    });

    const intervalUpdate = () => {
      chrome.storage.local.get("IntervalUpdate", (data) => {
        const intervalUpdateNumber = parseInt(data.IntervalUpdate) || 60;
        if (!data.IntervalUpdate) {
          chrome.storage.local.set({
            IntervalUpdate: "60",
          });
        }
        chrome.alarms.create("intervalUpdateTimes", {
          delayInMinutes: 0.05,
          periodInMinutes: Math.max(15, intervalUpdateNumber),
        });
      });
    };

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "intervalUpdateTimes") {
        chrome.storage.local.get(
          ["latlong", "country", "citys", "timezone"],
          (data) => {
            latlong = data.latlong;
            country = data.country;
            citys = data.citys;
            timezone = data.timezone;

            badgeTempUV(latlong, country, timezone);
          },
        );
      } else if (alarm.name === "bgUpdateTimes") {
        chrome.storage.local.get("country", (data) => {
          country = data.country;
          mp_bgUpdate();
        });
      }
    });

    const mp_bgUpdate = () => {
      chrome.storage.local.get(["deviceId", "userId"], (data) => {
        if (data.userId && !data.deviceId) {
          deviceId = data.userId;
          chrome.storage.local.set({ deviceId });
        } else {
          deviceId = data.deviceId;
        }

        async function mp_bgUpdateApi() {
          let userSettings = await chrome.action.getUserSettings();
          let isPinned = userSettings.isOnToolbar ? true : false;

          currentTime = new Date();
          currentTimeISO = currentTime.toISOString();

          const profileUpdateData = {
            $token: tokanID,
            $distinct_id: deviceId,
            $set: {
              "BG Update Date": currentTimeISO,
              Pinned: isPinned,
            },
          };

          const option_updateProfileBG = {
            method: "POST",
            headers: {
              Accept: "text/plain",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              data: JSON.stringify(profileUpdateData),
            }),
          };

          fetch(
            "https://api.mixpanel.com/engage#profile-set",
            option_updateProfileBG,
          ).then((response) => response.json());
        }

        mp_bgUpdateApi();
      });
    };

    const badgeTempUV = (latlong, country, timezone) => {
      if (!self.document) {
        timeZoneBadge = getTimezoneOffset(timezone);
        chrome.storage.local.get(["badgeDataSource", "IntervalUpdate"], (data) => {
          const requiresFreshData =
            data.badgeDataSource === "realtime" ||
            ["15", "30"].includes(String(data.IntervalUpdate));

          if (requiresFreshData) {
            chrome.storage.local.remove("wCast", () => {
              weCast(latlong, country, timezone);
            });
          } else {
            weCast(latlong, country, timezone);
          }
        });
      }
    };

    chrome.runtime.onInstalled.addListener((details) => {
      if (chrome.runtime.setUninstallURL) {
        chrome.runtime.setUninstallURL("");
      }

      if (details.reason == "install") {
        chrome.storage.local.set({
          installTime: Date.now(),
          setSettingFC: "c",
        });
      }
    });
  } catch (e) {
    //error
  }
}
