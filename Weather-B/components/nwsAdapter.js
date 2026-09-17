(() => {
  const WEATHER_TIMEOUT_MS = 10000;
  const requestJson = async (url, headers = {}) => { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS); try { const response = await fetch(url, { method: "GET", headers, signal: controller.signal }); if (!response.ok) throw new Error(`Weather request failed: ${response.status}`); return response.json(); } finally { clearTimeout(timeout); } };
  const setApiSource = (source) => { if (globalThis.chrome?.storage?.local) chrome.storage.local.set({ weatherApiSource: source }); };
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const directionToDegrees = (value) => { if (typeof value === "number" && Number.isFinite(value)) return value; const directions = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 }; return directions[String(value || "").toUpperCase()] ?? 0; };
  const openMeteoDescription = (code) => { const descriptions = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle", 56: "Light freezing drizzle", 57: "Dense freezing drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain", 66: "Light freezing rain", 67: "Heavy freezing rain", 71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall", 77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers", 85: "Slight snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail" }; return descriptions[code] || "Unknown"; };
  const conditionFromOpenMeteo = (code) => { if ([95, 96, 99].includes(code)) return "thunderstorms"; if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow"; if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain"; if ([45, 48].includes(code)) return "foggy"; if (code === 2) return "partlycloudy"; if (code === 3) return "cloudy"; return "clear"; };

  const fetchOpenMeteo = async (latitude, longitude, timezone) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude, longitude, timezone: timezone || "auto", forecast_days: "10", forecast_hours: "240", current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,uv_index,is_day", hourly: "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index,is_day", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,moonrise,moonset" });
    const data = await requestJson(url.toString()); setApiSource("Open-Meteo");
    const current = data.current || {}; const hourly = data.hourly || {}; const daily = data.daily || {};
    const offsetSeconds = Number(data.utc_offset_seconds) || 0;
    const localTimeToIso = (value) => { if (!value) return ""; const localAsUtc = Date.parse(`${value}:00Z`); return Number.isFinite(localAsUtc) ? new Date(localAsUtc - offsetSeconds * 1000).toISOString() : ""; };
    const localDateToIso = (value) => localTimeToIso(`${value}T00:00`);
    const times = hourly.time || [];
    const hours = times.map((time, index) => { const code = hourly.weather_code?.[index]; return { forecastStart: localTimeToIso(time), temperature: hourly.temperature_2m?.[index] ?? 0, uvIndex: hourly.uv_index?.[index] ?? 0, daylight: Boolean(hourly.is_day?.[index]), conditionCode: conditionFromOpenMeteo(code), description: openMeteoDescription(code), cloudCover: clamp01((hourly.cloud_cover?.[index] ?? 0) / 100), windSpeed: hourly.wind_speed_10m?.[index] ?? 0, windGust: hourly.wind_gusts_10m?.[index] ?? 0, windDirection: directionToDegrees(hourly.wind_direction_10m?.[index]), precipitationChance: clamp01((hourly.precipitation_probability?.[index] ?? 0) / 100), precipitationAmount: hourly.precipitation?.[index] ?? 0, humidity: clamp01((hourly.relative_humidity_2m?.[index] ?? 0) / 100) }; });
    const days = (daily.time || []).map((date, index) => { const code = daily.weather_code?.[index]; const description = openMeteoDescription(code); const dayForecast = { forecastStart: localDateToIso(date), temperature: daily.temperature_2m_max?.[index] ?? 0, conditionCode: conditionFromOpenMeteo(code), description, precipitationChance: clamp01((daily.precipitation_probability_max?.[index] ?? 0) / 100), precipitationAmount: daily.precipitation_sum?.[index] ?? 0 }; const nightForecast = { ...dayForecast, temperature: daily.temperature_2m_min?.[index] ?? 0 }; return { forecastStart: localDateToIso(date), temperatureMax: daily.temperature_2m_max?.[index] ?? 0, temperatureMin: daily.temperature_2m_min?.[index] ?? 0, maxUvIndex: daily.uv_index_max?.[index] ?? 0, sunrise: localTimeToIso(daily.sunrise?.[index]), sunset: localTimeToIso(daily.sunset?.[index]), sunriseCivil: localTimeToIso(daily.sunrise?.[index]), sunsetCivil: localTimeToIso(daily.sunset?.[index]), sunriseAstronomical: localTimeToIso(daily.sunrise?.[index]), sunsetAstronomical: localTimeToIso(daily.sunset?.[index]), sunriseNautical: localTimeToIso(daily.sunrise?.[index]), sunsetNautical: localTimeToIso(daily.sunset?.[index]), solarNoon: localTimeToIso(daily.sunrise?.[index]), solarMidnight: localTimeToIso(daily.sunset?.[index]), moonrise: localTimeToIso(daily.moonrise?.[index]), moonset: localTimeToIso(daily.moonset?.[index]), daytimeForecast: dayForecast, overnightForecast: nightForecast, restOfDayForecast: dayForecast }; });
    return { currentWeather: { temperature: current.temperature_2m ?? 0, pressure: current.pressure_msl ?? 1013.25, pressureTrend: "", windDirection: directionToDegrees(current.wind_direction_10m), visibility: current.visibility ?? 16093, temperatureDewPoint: current.temperature_2m ?? 0, humidity: clamp01((current.relative_humidity_2m ?? 0) / 100), windSpeed: current.wind_speed_10m ?? 0, windGust: current.wind_gusts_10m ?? 0, cloudCover: clamp01((current.cloud_cover ?? 0) / 100), uvIndex: current.uv_index ?? 0, daylight: Boolean(current.is_day), conditionCode: conditionFromOpenMeteo(current.weather_code), description: openMeteoDescription(current.weather_code), asOf: localTimeToIso(current.time) || new Date().toISOString() }, forecastHourly: { hours }, forecastDaily: { days }, weatherAlerts: { alerts: [] } };
  };

  const fetchNwsForecast = async (latitude, longitude) => {
    try {
      const headers = { Accept: "application/geo+json", "User-Agent": "Weather-B weather extension" };
      const points = await requestJson(`https://api.weather.gov/points/${latitude},${longitude}`, headers);
      const forecastUrl = points?.properties?.forecast;
      if (!forecastUrl) return null;
      const data = await requestJson(forecastUrl, headers);
      return Array.isArray(data?.properties?.periods) ? data.properties.periods : [];
    } catch (error) {
      console.warn("NWS forecast unavailable.", error);
      return null;
    }
  };

  const applyNwsDetailedForecasts = (weather, periods) => {
    if (!Array.isArray(periods) || !periods.length) return weather;
    const periodByDate = new Map();
    periods.forEach((period) => {
      const date = String(period.startTime || "").slice(0, 10);
      if (!date) return;
      const entry = periodByDate.get(date) || {};
      entry[period.isDaytime ? "day" : "night"] = period;
      periodByDate.set(date, entry);
    });
    weather.forecastDaily.days = weather.forecastDaily.days.map((day) => {
      const date = new Date(day.forecastStart).toISOString().slice(0, 10);
      const periodsForDate = periodByDate.get(date);
      if (!periodsForDate) return day;
      const dayPeriod = periodsForDate.day;
      const nightPeriod = periodsForDate.night;
      const daytimeForecast = dayPeriod?.detailedForecast ? { ...day.daytimeForecast, description: dayPeriod.detailedForecast, detailedForecast: dayPeriod.detailedForecast } : day.daytimeForecast;
      const overnightForecast = nightPeriod?.detailedForecast ? { ...day.overnightForecast, description: nightPeriod.detailedForecast, detailedForecast: nightPeriod.detailedForecast } : day.overnightForecast;
      return { ...day, daytimeForecast, overnightForecast, nwsDetailedForecast: { day: dayPeriod?.detailedForecast || "", night: nightPeriod?.detailedForecast || "" } };
    });
    return weather;
  };

  const fetchNwsAlerts = async (latitude, longitude) => { try { const data = await requestJson(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`, { Accept: "application/geo+json", "User-Agent": "Weather-B weather extension" }); return { alerts: (data.features || []).map((feature) => { const p = feature.properties || {}; return { source: p.senderName || "National Weather Service", description: p.event || "Weather alert", effectiveTime: p.effective, expireTime: p.expires, detailsUrl: p.uri, severity: [String(p.severity || "Unknown").toLowerCase()], urgency: [String(p.urgency || "Unknown").toLowerCase()], areaName: [p.areaDesc || ""] }; }) }; } catch (error) { console.warn("NWS alerts unavailable.", error); return { alerts: [] }; } };
  const loadWeatherData = async ({ latitude, longitude, country, timezone }) => {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) throw new Error("Invalid weather coordinates");
    const weather = await fetchOpenMeteo(Number(latitude), Number(longitude), timezone);
    const periods = await fetchNwsForecast(Number(latitude), Number(longitude));
    applyNwsDetailedForecasts(weather, periods);
    if (String(country || "").toUpperCase() === "US" || Array.isArray(periods) && periods.length) {
      weather.weatherAlerts = await fetchNwsAlerts(Number(latitude), Number(longitude));
      setApiSource("Open-Meteo + National Weather Service");
    }
    return weather;
  };
  globalThis.loadWeatherData = loadWeatherData;
})();
