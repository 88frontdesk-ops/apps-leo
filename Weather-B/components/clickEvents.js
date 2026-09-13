const clickEvents = () => {
  document
    .getElementById("myLocationIp_icon")
    .addEventListener("click", () => {
      myLocation(selectedLocation);
    });

  document
    .querySelector(".sidebarIconToggle")
    .addEventListener("click", () => {
      cardUpdate.style.display = "none";
    });

  dailyPage = () => {
    closeAllPopup();
    displayModal();
    chrome.storage.local.set({ setAsHome: 1 });
    modal7days.style.display = "block";
    favIcon_daily.style.display = "block";

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "daily") {
        favIcon_daily.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });

    dailyIcon.classList.add("sub_menu_icon_active_Class");
    dailyIcon.classList.add("sub_menu_current_icon_Class");
    dailySub.classList.add("sub_menu_current_Class");
  };

  worldPage = () => {
    document.getElementById("world_popup").style.display = "block";
    document.querySelector(".world_Class").style.visibility = "visible";
    closeAllPopup();

    setTimeout(() => {
      worldClose.style.visibility = "visible";
    }, 200);

    world(wCast);
    mapInnerWorld.style.visibility = "visible";
  };

  hourlyPage = () => {
    closeAllPopup();
    displayModal();
    chrome.storage.local.set({ setAsHome: 1 });
    modal48hours.style.display = "block";
    favIcon_hourly.style.display = "block";

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "hourly") {
        favIcon_hourly.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });

    hourlyIcon.classList.add("sub_menu_icon_active_Class");
    hourlyIcon.classList.add("sub_menu_current_icon_Class");
    hourlySub.classList.add("sub_menu_current_Class");
  };

  document.querySelectorAll(".daily_hourly_page").forEach((item) => {
    item.addEventListener("click", () => {
      chrome.storage.local.get(
        ["hourlySelected", "weeklySelected"],
        (data) => {
          if (data.hourlySelected) {
            hourlyPage();
          } else if (data.weeklySelected) {
            dailyPage();
          } else {
            worldPage();
          }
        },
      );
    });
  });

  document.querySelectorAll(".daily_page_Class").forEach((item) => {
    item.addEventListener("click", () => {
      dailyPage();
    });
  });

  document.querySelectorAll(".hourly_page_Class").forEach((item) => {
    item.addEventListener("click", () => {
      hourlyPage();
    });
  });

  document
    .getElementById("setting_defualt_theme_d_all")
    .addEventListener("click", () => {
      darkDisplay();

      document.getElementById(
        "setting_defualt_theme_d_all",
      ).style.pointerEvents = "none";

      document.getElementById(
        "setting_defualt_theme_l_all",
      ).style.pointerEvents = "none";

      setTimeout(() => {
        document.getElementById(
          "setting_defualt_theme_d_all",
        ).style.pointerEvents = "auto";

        document.getElementById(
          "setting_defualt_theme_l_all",
        ).style.pointerEvents = "auto";
      }, 1000);
    });

  document
    .getElementById("setting_defualt_theme_l_all")
    .addEventListener("click", () => {
      lightDisplay();

      document.getElementById(
        "setting_defualt_theme_d_all",
      ).style.pointerEvents = "none";

      document.getElementById(
        "setting_defualt_theme_l_all",
      ).style.pointerEvents = "none";

      setTimeout(() => {
        document.getElementById(
          "setting_defualt_theme_d_all",
        ).style.pointerEvents = "auto";

        document.getElementById(
          "setting_defualt_theme_l_all",
        ).style.pointerEvents = "auto";
      }, 1000);
    });

  document
    .getElementById("setting_defualt_button_u_all")
    .addEventListener("click", () => {
      setSettingUT = "u";

      chrome.storage.local.set({
        setSettingUT: "u",
      });

      delayButtons();

      setBadge(
        daylight,
        iconBadge,
        temperature,
        updateTime,
        citys,
        uvIndex,
        isWeatherAlert,
      );

      document.getElementById("setting_defualt_button_u").checked = true;
      document.getElementById("setting_defualt_button_t").checked = false;

      releaseButtons();
    });

  document
    .getElementById("setting_badge_source_realtime_all")
    .addEventListener("click", () => {
      /*
       * The old implementation used this control as a Pro-only gate.
       * Subscription checks have been removed from the free version.
       *
       * No alternate provider behavior is invented here because the
       * underlying realtime badge-source implementation is not required
       * for the normal badge selection.
       */
    });

  document
    .getElementById("setting_defualt_button_t_all")
    .addEventListener("click", () => {
      setSettingUT = "t";

      chrome.storage.local.set({
        setSettingUT: "t",
      });

      delayButtons();

      setBadge(
        daylight,
        iconBadge,
        temperature,
        updateTime,
        citys,
        uvIndex,
        isWeatherAlert,
      );

      document.getElementById("setting_defualt_button_t").checked = true;
      document.getElementById("setting_defualt_button_u").checked = false;

      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_c_all")
    .addEventListener("click", () => {
      chrome.storage.local.get("setSettingFC", (data) => {
        if (data.setSettingFC !== "c") {
          chrome.storage.local.set(
            {
              setSettingFC: "c",
            },
            () => {
              refreshPopup(wCast);

              setBadge(
                daylight,
                iconBadge,
                temperature,
                updateTime,
                citys,
                uvIndex,
                isWeatherAlert,
              );
            },
          );
        }

        delayButtons();
        releaseButtons();
      });
    });

  document
    .getElementById("setting_defualt_button_f_all")
    .addEventListener("click", () => {
      chrome.storage.local.get("setSettingFC", (data) => {
        if (data.setSettingFC !== "f") {
          chrome.storage.local.set(
            {
              setSettingFC: "f",
            },
            () => {
              refreshPopup(wCast);

              setBadge(
                daylight,
                iconBadge,
                temperature,
                updateTime,
                citys,
                uvIndex,
                isWeatherAlert,
              );
            },
          );
        }

        delayButtons();
        releaseButtons();
      });
    });

  searchPage = () => {
    setTimeout(() => {
      document.getElementById("kid_icon_hover").style.pointerEvents = "none";
    }, 300);

    setTimeout(() => {
      document.getElementById("kid_icon_hover").style.pointerEvents = "auto";
    }, 1000);

    if ("block" !== modalSearch.style.display) {
      chrome.storage.local.set({
        selectedLocationUpdated: 1,
      });

      updateLocationList();

      modalSearch.style.display = "block";
      openSidebar.checked = false;
      cardUpdate.style.display = "none";
      alertPopup.style.visibility = "hidden";
      alertPopupClose.style.visibility = "hidden";

      setTimeout(() => {
        searchTitle.style.visibility = "visible";
        searchInner.style.visibility = "visible";
      }, 300);

      searchMap(mapStyle);

      setTimeout(() => {
        document.getElementById(
          "addLocation_popup",
        ).style.visibility = "visible";

        document.getElementById("world_popup").style.display = "none";
      }, 300);
    }
  };

  document.querySelectorAll(".search_page").forEach((item) => {
    item.addEventListener("click", () => {
      searchPage();
    });
  });

  aqiPage = () => {
    aqi_api(latlong, updateTime);
    closeAllPopup();
    displayModal();

    chrome.storage.local.set({
      setAsHome: 1,
    });

    favIcon_aqi.style.display = "block";

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "aqi") {
        favIcon_aqi.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });

    modalAqi.style.display = "block";

    const currentIcon = document.getElementById("aqi_icon_popup_page");

    currentIcon.classList.add("sub_menu_icon_active_Class");
    currentIcon.classList.add("sub_menu_current_icon_Class");
    aqiSub.classList.add("sub_menu_current_Class");

    document.getElementById("aqi").style.opacity = "1";
  };

  document.getElementById("aqi_page").addEventListener("click", () => {
    aqiPage();
  });

  settingPage = (tabSettingId) => {
    closeAllPopup();
    modalSetting.style.display = "block";
    cardUpdate.style.display = "none";

    const thirdTabRadio = document.getElementById(tabSettingId);

    if (thirdTabRadio) {
      thirdTabRadio.click();
    }
  };

  document.querySelectorAll(".setting_page").forEach((item) => {
    item.addEventListener("click", () => {
      tabSettingId = "tab_setting_unit";
      settingPage(tabSettingId);
    });
  });

  document.querySelectorAll(".extended_hourly_forecast").forEach((item) => {
    item.addEventListener("click", () => {
      hourlyPage();
    });
  });

  document.querySelectorAll(".extended_radar_forecast").forEach((item) => {
    item.addEventListener("click", () => {
      radarPage();
    });
  });

  radarPage = () => {
    document.getElementById("map_popup").style.display = "block";

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "radar") {
        favIcon_map.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });

    setTimeout(() => {
      mapClose.style.visibility = "visible";
      favIcon_map.style.display = "block";
      mapLegend.style.visibility = "visible";
      mapLegendText.style.visibility = "visible";
    }, 600);

    radar();

    mapInner.style.visibility = "visible";
    closeAllPopup();
  };

  document.querySelectorAll(".radar_page").forEach((item) => {
    item.addEventListener("click", () => {
      radarPage();
    });
  });

  document.querySelectorAll("#world_page").forEach((item) => {
    item.addEventListener("click", () => {
      worldPage();
    });
  });

  document.querySelectorAll(".calendar_page").forEach((item) => {
    item.addEventListener("click", () => {
      chrome.storage.local.get(
        ["setAsHomepage", "latlong"],
        (data) => {
          calendar_api(data.latlong).then((result) => {
            closeAllPopup();

            if (data.setAsHomepage === "calendar") {
              favIcon_calendar.style.backgroundImage =
                'url("/images/favourite-active.svg")';
            }

            calendar(result.resultCalendar, wCast);
          });
        },
      );
    });
  });

  document.querySelectorAll(".aqi_forecast_page").forEach((item) => {
    item.addEventListener("click", () => {
      closeAllPopup();
      aqi_forecast();

      document.getElementById(
        "aqi_forecast_popup_close",
      ).style.visibility = "visible";

      modalAqiForecast.style.visibility = "visible";
      modalAqiForecast.style.display = "block";
    });
  });

  document.querySelectorAll(".lunar_page").forEach((item) => {
    item.addEventListener("click", () => {
      chrome.storage.local.get("setAsHomepage", (data) => {
        closeAllPopup();
        lunar();

        if (data.setAsHomepage === "lunar") {
          favIcon_lunar.style.backgroundImage =
            'url("/images/favourite-active.svg")';
        }
      });
    });
  });

  astroPage = () => {
    closeAllPopup();
    displayModal();

    modalSolar.style.display = "block";

    chrome.storage.local.set({
      setAsHome: 1,
    });

    favIcon_solar.style.display = "block";

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "solar") {
        favIcon_solar.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });

    const currentIcon = document.getElementById("solar_icon_popup_page");

    currentIcon.classList.add("sub_menu_icon_active_Class");
    currentIcon.classList.add("sub_menu_current_icon_Class");
    solarSub.classList.add("sub_menu_current_Class");
  };

  document.querySelectorAll(".astro_page").forEach((item) => {
    item.addEventListener("click", () => {
      astroPage();
    });
  });

  document
    .getElementById("home_popup_page")
    .addEventListener("click", () => {
      closeAllPopup();
    });

  currentPage = () => {
    prev24Hrs();
    current();
    closeAllPopup();

    modalCurrent.style.display = "block";
    favIcon_current.style.display = "block";

    chrome.storage.local.set({
      setAsHome: 1,
    });

    chrome.storage.local.get("setAsHomepage", (data) => {
      if (data.setAsHomepage === "report") {
        favIcon_current.style.backgroundImage =
          'url("/images/favourite-active.svg")';
      }
    });
  };

  document.querySelectorAll(".current_button_Class").forEach((item) => {
    item.addEventListener("click", () => {
      if ("block" !== modalCurrent.style.display) {
        currentPage();
      }
    });
  });

  document
    .getElementById("current_popup_close")
    .addEventListener("click", () => {
      closeAllPopup();
    });

  document
    .getElementById("setting_popup_close")
    .addEventListener("click", () => {
      closeAllPopup();
    });

  document
    .getElementById("search_popup_close")
    .addEventListener("click", () => {
      closeAllPopup();
      closeAddLocation();
    });

  document
    .getElementById("map_popup_close")
    .addEventListener("click", () => {
      stopRadarAnimation();
      document.getElementById("map_popup").style.display = "none";
      closeAllPopup();
    });

  document
    .getElementById("world_popup_close")
    .addEventListener("click", () => {
      document.getElementById("world_popup").style.display = "none";
      closeAllPopup();
    });

  document
    .getElementById("calendar_popup_close")
    .addEventListener("click", () => {
      calendarClose.style.transition = "all 0s";
      calendarClose.style.visibility = "hidden";
      closeAllPopup();
    });

  document
    .getElementById("lunar_popup_close")
    .addEventListener("click", () => {
      modalLunarClose.style.transition = "all 0s";
      modalLunarClose.style.visibility = "hidden";
      closeAllPopup();
    });

  document
    .getElementById("cardUpdate_button")
    .addEventListener("click", () => {
      const cardTargetNext = window.cardTargetNext;

      if (cardTargetNext !== "") {
        cardUpdate.style.display = "none";

        if (cardTargetNext === settingPage) {
          settingPage("tab_setting_appe");
        } else {
          cardTargetNext();
        }
      }
    });

  /*
   * vipSidebar and proLogin were subscription-only controls.
   * Their handlers have intentionally been removed.
   */

  document
    .getElementById("cardUdate_close")
    .addEventListener("click", () => {
      cardUpdate.style.display = "none";
    });

  document
    .getElementById("setting_defualt_button_12h_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        TimeFormat: "12h",
      });

      setting12.checked = true;
      solar(latlong);
      hourly(wCast);
      timeFormat(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_image_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        backgroundType: "image",
      });

      imageBackground.classList.remove("hidden");
      defaultImageButton.checked = true;

      icon = getWeIcon(condition, daylight, cloudCover);
      bgFlickr(icon);

      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_color_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        backgroundType: "color",
      });

      defaultColorButton.checked = true;
      imageBackground.style.backgroundImage = "none";

      chrome.storage.local.get(
        ["theme", "bgColorLight", "bgColorDark"],
        (data) => {
          if ("dark" === data.theme) {
            imageBackground.style.backgroundColor = data.bgColorDark;
            imageBackground.classList.add("hidden");
          } else {
            imageBackground.style.backgroundColor = data.bgColorLight;
          }
        },
      );

      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_hazard_today_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        tomorrowHazard: false,
      });

      document.getElementById(
        "setting_defualt_button_hazard_today",
      ).checked = true;

      hazard(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_hazard_tomorrow_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        tomorrowHazard: true,
      });

      document.getElementById(
        "setting_defualt_button_hazard_tomorrow",
      ).checked = true;

      hazard(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_24h_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        TimeFormat: "24h",
      });

      setting24.checked = true;
      solar(latlong);
      timeFormat(wCast);
      hourly(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_cardinal_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windDirUnit: "cardinal",
      });

      document.getElementById(
        "setting_defualt_button_cardinal",
      ).checked = true;

      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_degrees_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windDirUnit: "degrees",
      });

      document.getElementById(
        "setting_defualt_button_degrees",
      ).checked = true;

      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_mb_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "mb",
      });

      document.getElementById("setting_defualt_button_mb").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_psi_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "psi",
      });

      document.getElementById("setting_defualt_button_psi").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_inhg_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "inhg",
      });

      document.getElementById("setting_defualt_button_inhg").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_mmhg_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "mmhg",
      });

      document.getElementById("setting_defualt_button_mmhg").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_hpa_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "hpa",
      });

      document.getElementById("setting_defualt_button_hpa").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_kpa_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        pressureUnit: "kpa",
      });

      document.getElementById("setting_defualt_button_kpa").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_fts_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "fts",
      });

      document.getElementById("setting_defualt_button_fts").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_mph_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "mph",
      });

      document.getElementById("setting_defualt_button_mph").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_kmh_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "kmh",
      });

      document.getElementById("setting_defualt_button_kmh").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_kn_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "kn",
      });

      document.getElementById("setting_defualt_button_kn").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_ms_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "ms",
      });

      document.getElementById("setting_defualt_button_ms").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_bft_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        windUnit: "bft",
      });

      document.getElementById("setting_defualt_button_bft").checked = true;
      hourly(wCast);
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_mi_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        visibilityUnit: "mi",
      });

      document.getElementById("setting_defualt_button_mi").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_km_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        visibilityUnit: "km",
      });

      document.getElementById("setting_defualt_button_km").checked = true;
      daily(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_rh_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        humidityUnit: "rh",
      });

      document.getElementById("setting_defualt_button_rh").checked = true;
      refreshPopup(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_gm3_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        humidityUnit: "gm3",
      });

      document.getElementById("setting_defualt_button_gm3").checked = true;
      refreshPopup(wCast);
      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_grft_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        humidityUnit: "grft",
      });

      document.getElementById("setting_defualt_button_grft").checked = true;
      refreshPopup(wCast);
      delayButtons();
      releaseButtons();
    });

  const setIntervalUpdate = (minutes, checkboxId) => {
    chrome.storage.local.set({
      IntervalUpdate: String(minutes),
    });

    wCast = [];
    chrome.storage.local.remove("wCast");

    chrome.runtime.sendMessage({
      msg: "intervalUpdateMessage",
    });

    ["15", "30", "60", "90", "120"].forEach((time) => {
      const element = document.getElementById(
        `setting_defualt_button_${time}_all`,
      );

      if (element) {
        element.style.pointerEvents = "none";
      }
    });

    document.getElementById(
      checkboxId,
    ).checked = true;

    releaseButtons();
  };

  document
    .getElementById("setting_defualt_button_15_all")
    .addEventListener("click", () => {
      setIntervalUpdate(15, "setting_defualt_button_15");
    });

  document
    .getElementById("setting_defualt_button_30_all")
    .addEventListener("click", () => {
      setIntervalUpdate(30, "setting_defualt_button_30");
    });

  document
    .getElementById("setting_defualt_button_60_all")
    .addEventListener("click", () => {
      setIntervalUpdate(60, "setting_defualt_button_60");
    });

  document
    .getElementById("setting_defualt_button_90_all")
    .addEventListener("click", () => {
      setIntervalUpdate(90, "setting_defualt_button_90");
    });

  document
    .getElementById("setting_defualt_button_120_all")
    .addEventListener("click", () => {
      setIntervalUpdate(120, "setting_defualt_button_120");
    });

  document
    .getElementById("outlook_link_mainPage")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        outlookSelected: true,
        weeklySelected: false,
        hourlySelected: false,
      });

      for (let i = 0; i < 5; i++) {
        document
          .querySelectorAll(`.forecast_${i}_date_meridian`)
          .forEach((item) => {
            item.textContent = "";
          });
      }

      outlook(wCast);

      homescreenToday.style.opacity = "0.3";
      homescreenWeek.style.opacity = "0.3";
      homescreenOutlook.style.opacity = "1";

      chrome.storage.local.get("setSettingFC", (data) => {
        data.setSettingFC === "c" ? ctemp(wCast) : ftemp(wCast);
      });
    });

  document
    .getElementById("today_link_mainPage")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        hourlySelected: true,
        weeklySelected: false,
        outlookSelected: false,
      });

      hideForecastDayVertical = (id) => {
        document.getElementById(id).style.visibility = "hidden";
      };

      ["1", "2", "3", "4"].forEach((id) => {
        hideForecastDayVertical(`forecast_day_vertical_${id}`);
      });

      timeFormat(wCast);
      hourly(wCast);

      homescreenToday.style.opacity = "1";
      homescreenWeek.style.opacity = "0.3";
      homescreenOutlook.style.opacity = "0.3";

      chrome.storage.local.get("setSettingFC", (data) => {
        data.setSettingFC === "c" ? ctemp(wCast) : ftemp(wCast);
      });
    });

  document
    .getElementById("week_link_mainPage")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        weeklySelected: true,
        hourlySelected: false,
        outlookSelected: false,
      });

      hideForecastDayVertical = (id) => {
        document.getElementById(id).style.visibility = "hidden";
      };

      ["1", "2", "3", "4"].forEach((id) => {
        hideForecastDayVertical(`forecast_day_vertical_${id}`);
      });

      timeFormat(wCast);
      daily(wCast);

      homescreenToday.style.opacity = "0.3";
      homescreenWeek.style.opacity = "1";
      homescreenOutlook.style.opacity = "0.3";

      chrome.storage.local.get("setSettingFC", (data) => {
        data.setSettingFC === "c" ? ctemp(wCast) : ftemp(wCast);
      });
    });

  document
    .getElementById("nextLocation_home")
    .addEventListener("click", () => {
      const nextLocationButton = document.getElementById("nextLocation_home");

      nextLocationButton.style.pointerEvents = "none";

      setTimeout(() => {
        nextLocationButton.style.pointerEvents = "auto";
      }, 1000);

      chrome.storage.local.get(
        ["selectedLocationNumber", "selectedLocation", "latlong"],
        (data) => {
          selectedLocationNumber = data.selectedLocationNumber;
          selectedLocation = data.selectedLocation;

          nextLocation = selectedLocation.findIndex((item) =>
            item.includes("locationDefaultTitle"),
          );

          nextLocation++;

          if (nextLocation > selectedLocationNumber - 1) {
            nextLocation = 0;
          }

          citys = selectedLocation[nextLocation].split(",")[0];
          country = selectedLocation[nextLocation].split(",")[1];
          lat = selectedLocation[nextLocation].split(",")[2];
          long = selectedLocation[nextLocation].split(",")[3];
          timezone = selectedLocation[nextLocation].split(",")[4];

          for (let i = 0; i < selectedLocationNumber; i++) {
            const splitResult = selectedLocation[i].split(",");

            splitResult[6] = "locationListTitle";

            selectedLocation[i] = splitResult.reduce(
              (a, b) => `${a},${b}`,
            );
          }

          const splitResult = selectedLocation[nextLocation].split(",");

          splitResult[6] = "locationDefaultTitle";

          selectedLocation[nextLocation] = splitResult.reduce(
            (a, b) => `${a},${b}`,
          );

          chrome.storage.local.set({
            selectedLocation,
            citys,
            country,
            latlong: `${lat},${long}`,
            timezone,
          });

          const preloaderLocation =
            document.querySelector(".preloaderLocation");

          preloaderLocation.style.display = "block";
          preloaderLocation.style.opacity = 0.9;

          latlong = `${lat},${long}`;

          popup();
        },
      );
    });

  document
    .querySelectorAll(".share_download_link_Class")
    .forEach((item) => {
      item.addEventListener("click", () => {
        const shareGroupHome = document.getElementById("shareGroup_home");

        shareGroupHome.style.pointerEvents = "none";

        setTimeout(() => {
          shareGroupHome.style.pointerEvents = "auto";
        }, 1000);

        chrome.storage.local.get("theme", (data) => {
          const orginalDark = data.theme === "dark" ? 1 : 0;

          if (orginalDark === 1) {
            lightDisplay();
          }

          setTimeout(() => {
            loadLib(HTML2CANVAS_LIB).then(() => {
              html2canvas(document.body, {
                backgroundColor: "#fffff",
                allowTaint: true,
                useCORS: true,
                profile: true,
                logging: true,
                ForeignObjectRendering: true,
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                width: 800,
                height: 600,
              }).then((canvas) => {
                if (orginalDark === 1) {
                  darkDisplay();
                }

                const base64popupscreen = canvas.toDataURL(
                  "image/png",
                  1,
                );

                const imagepPopupfilename =
                  moment
                    .unix(updateTime + offsetUnix)
                    .format("MM_DD_YYYY_h_mm_A_") +
                  citys +
                  ".png";

                const download = document.createElement("a");

                download.href = base64popupscreen;
                download.download = imagepPopupfilename;
                download.click();
              });
            });
          }, 1000);
        });
      });
    });

  let favouriteToggle = true;

  document.querySelectorAll(".favourite_icon_action").forEach((item) => {
    item.addEventListener("click", () => {
      if ("block" === modalCurrent.style.display && favouriteToggle) {
        favIcon_current.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "report",
        });

        favouriteToggle = false;
      } else if ("block" === modal7days.style.display && favouriteToggle) {
        favIcon_daily.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "daily",
        });

        favouriteToggle = false;
      } else if (
        "block" === modal48hours.style.display &&
        favouriteToggle
      ) {
        favIcon_hourly.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "hourly",
        });

        favouriteToggle = false;
      } else if ("block" === modalSolar.style.display && favouriteToggle) {
        favIcon_solar.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "solar",
        });

        favouriteToggle = false;
      } else if ("block" === modalAqi.style.display && favouriteToggle) {
        favIcon_aqi.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "aqi",
        });

        favouriteToggle = false;
      } else if (
        "visible" ===
          document.getElementById("weatherMap").style.visibility &&
        favouriteToggle
      ) {
        favIcon_map.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "radar",
        });

        favouriteToggle = false;
      } else if (
        "block" === modalCalendar.style.display &&
        favouriteToggle
      ) {
        favIcon_calendar.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "calendar",
        });

        favouriteToggle = false;
      } else if ("block" === modalLunar.style.display && favouriteToggle) {
        favIcon_lunar.style.backgroundImage =
          'url("/images/favourite-active.svg")';

        chrome.storage.local.set({
          setAsHomepage: "lunar",
        });

        favouriteToggle = false;
      } else {
        chrome.storage.local.set({
          setAsHomepage: "",
        });

        favouriteToggle = true;

        favIcon_current.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_hourly.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_daily.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_map.style.backgroundImage =
          'url("/images/favourite-inactive-shadow.svg")';

        favIcon_solar.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_aqi.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_calendar.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';

        favIcon_lunar.style.backgroundImage =
          'url("/images/favourite-inactive.svg")';
      }
    });
  });

  document
    .getElementById("alert_icon")
    .addEventListener("click", () => {
      if (
        wCast.hasOwnProperty("weatherAlerts") &&
        wCast.weatherAlerts.alerts.length > 0
      ) {
        closeAllPopup();
        alertPopupText.style.visibility = "visible";
        alertPopup.style.visibility = "visible";
        alertPopupClose.style.visibility = "visible";
      }
    });

  document
    .getElementById("notification_icon")
    .addEventListener("click", () => {
      chrome.permissions.request(
        {
          permissions: ["notifications"],
        },
        (granted) => {
          if (granted) {
            document.querySelector(
              ".notification_home_Class",
            ).style.display = "none";

            checkboxSever.checked = true;
            checkboxSever.disabled = true;

            checkboxNotification.checked = true;
            checkboxNotification.disabled = true;

            setTimeout(() => {
              checkboxSever.disabled = false;
              checkboxNotification.disabled = false;
            }, 1000);
          } else {
            document.querySelector(
              ".notification_home_Class",
            ).style.display = "block";

            checkboxSever.checked = false;
            checkboxSever.disabled = true;

            checkboxNotification.checked = false;
            checkboxNotification.disabled = true;

            setTimeout(() => {
              checkboxSever.disabled = false;
              checkboxNotification.disabled = false;
            }, 1000);
          }
        },
      );
    });

  document
    .getElementById("alert_popup_close")
    .addEventListener("click", () => {
      closeAllPopup();
      alertPopup.style.visibility = "hidden";
      alertPopupClose.style.transition = "all 0s";
      alertPopupClose.style.visibility = "hidden";
    });

  /*
   * Weather-report subscription/TTS gating has been removed.
   *
   * report.js should provide the local weather report implementation.
   * We keep the existing button behavior but do not check subscription
   * state or call the removed remote report/TTS services.
   */
  document
    .getElementById("weatherReport_button")
    .addEventListener("click", () => {
      const reportButton = document.getElementById("weatherReport_button");

      reportButton.style.pointerEvents = "none";

      setTimeout(() => {
        reportButton.style.pointerEvents = "auto";
      }, 1000);

      if (typeof getWeatherReport === "function") {
        getWeatherReport(wCast);
      }
    });

  document
    .getElementById("report_popup_close")
    .addEventListener("click", () => {
      if (typeof stopSpeech === "function") {
        stopSpeech();
      }

      closeAllPopup();

      modalReport.style.visibility = "hidden";
      modalReportClose.style.transition = "all 0s";
      modalReportClose.style.visibility = "hidden";

      if (typeof stopAudioPlayback === "function") {
        stopAudioPlayback();
      }

      const fixedAudio = document.querySelector(".fixed_audio");

      if (fixedAudio) {
        fixedAudio.style.display = "none";
      }
    });

  document
    .getElementById("aqi_forecast_popup_close")
    .addEventListener("click", () => {
      closeAllPopup();

      const closeButton = document.getElementById(
        "aqi_forecast_popup_close",
      );

      closeButton.style.transition = "all 0s";
      closeButton.style.visibility = "hidden";
    });

  /*
   * vip_popup_lock_class and upgrade controls have been removed.
   * They should also be removed from popup.html.
   */

  document
    .querySelectorAll("#setting_section_auto_dark")
    .forEach((item) => {
      item.addEventListener("click", () => {
        /*
         * Auto-dark is no longer blocked by subscription state.
         * Actual auto-dark behavior remains owned by setting.js.
         */
      });
    });

  let allowHover = false;

  setTimeout(() => {
    allowHover = true;
  }, 1000);

  for (let i = 0; i < hazardButton.length; i++) {
    hazardButton[i].onmouseenter = () => {
      if (allowHover) {
        titleHomeClassSetting.style.visibility = "hidden";
        homescreenTodayMenu.style.visibility = "hidden";
      }
    };

    hazardButton[i].onmouseleave = () => {
      titleHomeClassSetting.style.visibility = "visible";
      homescreenTodayMenu.style.visibility = "visible";
    };
  }

  for (let i = 0; i < mins60Button.length; i++) {
    mins60Button[i].onmouseenter = () => {
      if (allowHover) {
        titleHomeClassSetting.style.visibility = "hidden";
        homescreenTodayMenu.style.visibility = "hidden";
      }
    };

    mins60Button[i].onmouseleave = () => {
      titleHomeClassSetting.style.visibility = "visible";
      homescreenTodayMenu.style.visibility = "visible";
    };
  }

  for (let i = 0; i < comparButton.length; i++) {
    comparButton[i].onmouseenter = () => {
      if (allowHover) {
        chrome.storage.local.get(
          ["latlong", "country", "timezone"],
          (data) => {
            titleHomeClassSetting.style.visibility = "hidden";
            homescreenTodayMenu.style.visibility = "hidden";

            comparison(
              data.latlong,
              data.country,
              data.timezone,
            );
          },
        );
      }
    };

    comparButton[i].onmouseleave = () => {
      titleHomeClassSetting.style.visibility = "visible";
      homescreenTodayMenu.style.visibility = "visible";
    };
  }

  document
    .getElementById("setting_defualt_button_mmh_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        precipitationUnit: "mmh",
      });

      document.getElementById("setting_defualt_button_mmh").checked = true;

      delayButtons();
      releaseButtons();
    });

  document
    .getElementById("setting_defualt_button_inph_all")
    .addEventListener("click", () => {
      chrome.storage.local.set({
        precipitationUnit: "inph",
      });

      document.getElementById("setting_defualt_button_inph").checked = true;

      delayButtons();
      releaseButtons();
    });
};

releaseButtons = () => {
  setTimeout(() => {
    document.getElementById(
      "setting_defualt_button_15_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_30_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_60_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_90_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_120_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_c_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_f_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_u_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_t_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_12h_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_24h_all",
    ).style.pointerEvents = "auto";

    document.querySelector(
      ".setting_section_badge_size_Class",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_mph_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_kmh_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_kn_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_ms_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_bft_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_mb_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_psi_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_hazard_today_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_hazard_tomorrow_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_image_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_color_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_cardinal_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_degrees_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_mi_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_km_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_mmh_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_inph_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_rh_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_gm3_all",
    ).style.pointerEvents = "auto";

    document.getElementById(
      "setting_defualt_button_grft_all",
    ).style.pointerEvents = "auto";
  }, 1000);
};

delayButtons = () => {
  document.getElementById(
    "setting_defualt_button_c_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_f_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_u_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_t_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_12h_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_24h_all",
  ).style.pointerEvents = "none";

  document.querySelector(
    ".setting_section_badge_size_Class",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_mph_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_kmh_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_kn_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_ms_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_bft_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_mb_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_psi_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_image_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_color_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_cardinal_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_degrees_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_mi_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_km_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_mmh_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_inph_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_rh_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_gm3_all",
  ).style.pointerEvents = "none";

  document.getElementById(
    "setting_defualt_button_grft_all",
  ).style.pointerEvents = "none";
};