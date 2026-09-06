const home = () => {
  (document.querySelectorAll(".location_name").forEach((item) => {
    item.textContent = citys.length > 20 ? citys.slice(0, 17) + "..." : citys;
  }),
    (document.getElementById("icon_uv").style.display =
      uvIndex < 1 ? "none" : "block"),
    (icon = getWeIcon(condition, daylight, cloudCover)),
    chrome.storage.local.get("animatedIcon", (data) => {
      const animatedIcon = "1" === data.animatedIcon;
      currentIcon.style.backgroundImage = animatedIcon
        ? iconCurrent_animated(icon, daylight)
        : iconCurrent(icon);
    }),
    chrome.storage.local.get("humidityUnit", (data) => {
      let humidityValue;
      switch (data.humidityUnit) {
        case "gm3":
          humidityValue = `${GetAbsoluteHumiGm3(humidity, temperature).toFixed(1)} gm³`;
          break;
        case "grft":
          humidityValue = `${GetAbsoluteHumiGrft(humidity, temperature).toFixed(1)} gr/ft³`;
          break;
        default:
          humidityValue = `${humidity}%`;
      }
      document.querySelectorAll(".current_humidity_home").forEach((item) => {
        item.textContent = humidityValue;
      });
    }),
    (document.getElementById("current_condition").textContent =
      getWeDescription(condition, daylight, cloudCover)),
    document.querySelectorAll(".current_uv").forEach((item) => {
      item.textContent = uvIndex;
    }),
    (document.getElementById("current_uv_note").textContent =
      " (" + getUvNote(uvIndex, daylight) + ")"));
  const uvGroup = document.getElementById("current_uv_group");
  if (
    uvGroup &&
    typeof maxUvIndex === "number" &&
    Number.isFinite(maxUvIndex)
  ) {
    let maxGroup = document.getElementById("current_uv_max_group");
    maxGroup ||
      ((maxGroup = document.createElement("div")),
      (maxGroup.id = "current_uv_max_group"),
      (maxGroup.className = "current_uv_max_group_Class"),
      (maxGroup.innerHTML =
        '<span class="current_uv_max_title_Class">Today’s max</span> <span id="current_uv_max" class="current_uv_max_Class"></span>'),
      uvGroup.parentNode.insertBefore(maxGroup, uvGroup.nextSibling));
    const maxValue = document.getElementById("current_uv_max");
    maxValue && (maxValue.textContent = Number(maxUvIndex).toFixed(1));
  }
  resUV0 = document.querySelectorAll(
    "#icon_uv_1, #icon_uv_2, #icon_uv_3, #icon_uv_4, #icon_uv_5, #icon_uv_6, #icon_uv_1_tooltip, #icon_uv_2_tooltip, #icon_uv_3_tooltip, #icon_uv_4_tooltip, #icon_uv_5_tooltip, #icon_uv_6_tooltip",
  );
  for (let i = 0; i < resUV0.length; i++) resUV0[i].style.opacity = ".3";
  const applyStyleToElements = (numberOfElements, uvIndex) => {
    let elementsList = "";
    for (let i = 1; i <= numberOfElements; i++)
      elementsList += `#icon_uv_${i}, #icon_uv_${i}_tooltip, `;
    elementsList = elementsList.slice(0, -2);
    let elements = document.querySelectorAll(elementsList);
    for (let i = 0; i < elements.length; i++)
      ((elements[i].style.opacity = "1"),
        1 != uvIndex &&
          (elements[i].style.filter =
            "drop-shadow( 2px 2px 2px rgba(0, 0, 0, .5))"));
  };
  1 == uvIndex
    ? applyStyleToElements(1, uvIndex)
    : 2 == uvIndex
      ? applyStyleToElements(2, uvIndex)
      : uvIndex >= 3 && uvIndex <= 5
        ? applyStyleToElements(3, uvIndex)
        : uvIndex >= 6 && uvIndex <= 7
          ? applyStyleToElements(4, uvIndex)
          : uvIndex >= 8 && applyStyleToElements(6, uvIndex);
};
