(() => {
  const renderNwsDetails = () => {
    const wCast = window.wCast;
    const days = wCast?.forecastDaily?.days;
    const table = document.getElementById("daily_table");
    if (!Array.isArray(days) || !table) return false;

    days.forEach((day, index) => {
      const details = day?.nwsDetailedForecast || {};
      if (!details.day && !details.night) return;
      const panel = table.querySelector(`#forecast_${index}_daily_day`)?.closest(".panel_daily");
      if (!panel || panel.querySelector(".nws_detailed_forecast_row")) return;
      const row = document.createElement("div");
      row.className = "daily_sub_row nws_detailed_forecast_row";
      row.style.marginTop = "12px";
      row.innerHTML = `
        <span class="daily_element_title">NWS Forecast</span>
        <div style="width:100%;">
          ${details.day ? `<div class="forecast_daily_description_Class"><strong>Day:</strong> ${details.day}</div>` : ""}
          ${details.night ? `<div class="forecast_daily_description_Class" style="margin-top:8px;"><strong>Night:</strong> ${details.night}</div>` : ""}
        </div>`;
      panel.querySelector(".panel_sub_daily")?.appendChild(row);
    });
    return true;
  };

  const waitForWeather = () => {
    if (renderNwsDetails()) return;
    setTimeout(waitForWeather, 250);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForWeather, { once: true });
  else waitForWeather();
})();
