(() => {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const nwsHeaders = {
    Accept: "application/geo+json",
    "User-Agent": "UV-Weather/2.0 (weather extension)",
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await originalFetch(url, {
        headers: nwsHeaders,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`NWS request failed: ${response.status}`);
    return response.json();
  };

  const setApiSource = (source) => {
    if (globalThis.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ weatherApiSource: source });
    }
  };

  const fetchSupplementalData = async (latitude, longitude) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude,
      longitude,
      current: "uv_index",
      hourly: "uv_index",
      daily: "uv_index_max,sunrise,sunset,moonrise,moonset",
      timezone: "auto",
      forecast_days: "10",
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        return await (await originalFetch(url, { signal: controller.signal })).json();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.warn("Supplemental UV data unavailable.", error);
      return {};
    }
  };

  const fahrenheitToCelsius = (value) =>
    typeof value === "number" ? (value - 32) * (5 / 9) : 0;

  const metersPerSecond = (value) => {
    if (typeof value !== "string") return 0;
    const number = parseFloat(value) || 0;
    const unit = value.toLowerCase();
    if (unit.includes("km/h")) return number / 3.6;
    if (unit.includes("knot")) return number * 0.514444;
    if (unit.includes("mph")) return number * 0.44704;
    return number;
  };

  const directionToDegrees = (direction) => {
    const directions = {
      N: 0,
      NNE: 22.5,
      NE: 45,
      ENE: 67.5,
      E: 90,
      ESE: 112.5,
      SE: 135,
      SSE: 157.5,
      S: 180,
      SSW: 202.5,
      SW: 225,
      WSW: 247.5,
      W: 270,
      WNW: 292.5,
      NW: 315,
      NNW: 337.5,
    };
    return directions[direction] ?? 0;
  };

  const conditionCode = (forecast) => {
    const text = (forecast || "").toLowerCase();
    if (text.includes("thunder")) return "thunderstorms";
    if (text.includes("snow") || text.includes("sleet")) return "snow";
    if (text.includes("rain") || text.includes("drizzle")) return "rain";
    if (text.includes("fog") || text.includes("haze")) return "foggy";
    if (text.includes("partly") || text.includes("mostly sunny")) {
      return "partlycloudy";
    }
    if (text.includes("cloud")) return "cloudy";
    return "clear";
  };

  const relativeHumidity = (period) =>
    (period.relativeHumidity && period.relativeHumidity.value) || 0;

  const precipitationChance = (period) =>
    (period.probabilityOfPrecipitation &&
      period.probabilityOfPrecipitation.value) ||
    0;

  const periodToForecast = (period) => ({
    temperature: fahrenheitToCelsius(period.temperature),
    windSpeed: metersPerSecond(period.windSpeed),
    windGustSpeedMax: metersPerSecond(period.windGust),
    windDirection: directionToDegrees(period.windDirection),
    humidity: relativeHumidity(period) / 100,
    cloudCover: 0,
    precipitationChance: precipitationChance(period) / 100,
    precipitationAmount: 0,
    conditionCode: conditionCode(period.shortForecast),
    forecastStart: period.startTime,
    forecastEnd: period.endTime,
  });

  const dailyForecast = (periods, supplementalDaily) => {
    const days = [];
    for (let index = 0; index < periods.length; index += 1) {
      const day = periods[index];
      if (!day || !day.isDaytime) continue;
      const night = periods
        .slice(index + 1)
        .find((period) => !period.isDaytime) || day;
      const dayForecast = periodToForecast(day);
      const nightForecast = periodToForecast(night);
      const startTime = Date.parse(day.startTime) / 1000;
      const endTime = Date.parse(night.endTime || day.endTime) / 1000;
      days.push({
        forecastStart: day.startTime,
        temperatureMax: dayForecast.temperature,
        temperatureMin: nightForecast.temperature,
        maxUvIndex: supplementalDaily.uv_index_max?.[days.length] || 0,
        sunrise: Date.parse(supplementalDaily.sunrise?.[days.length] || day.startTime) / 1000,
        sunset: Date.parse(supplementalDaily.sunset?.[days.length] || night.endTime) / 1000,
        sunriseCivil: Date.parse(supplementalDaily.sunrise?.[days.length] || day.startTime) / 1000,
        sunsetCivil: Date.parse(supplementalDaily.sunset?.[days.length] || night.endTime) / 1000,
        sunriseAstronomical: startTime,
        sunsetAstronomical: endTime,
        solarNoon: (startTime + endTime) / 2,
        solarMidnight: endTime,
        moonrise: Date.parse(supplementalDaily.moonrise?.[days.length] || day.startTime) / 1000,
        moonset: Date.parse(supplementalDaily.moonset?.[days.length] || night.endTime) / 1000,
        daytimeForecast: dayForecast,
        overnightForecast: nightForecast,
        restOfDayForecast: dayForecast,
      });
    }
    return days;
  };

  const hourlyForecast = (periods, supplementalHourly) =>
    periods.map((period, index) => ({
      forecastStart: period.startTime,
      temperature: fahrenheitToCelsius(period.temperature),
      uvIndex: supplementalHourly.uv_index?.[index] || 0,
      daylight: period.isDaytime,
      conditionCode: conditionCode(period.shortForecast),
      cloudCover: 0,
      windSpeed: metersPerSecond(period.windSpeed),
      windGust: metersPerSecond(period.windGust),
      windDirection: directionToDegrees(period.windDirection),
      precipitationChance: precipitationChance(period) / 100,
      humidity: relativeHumidity(period) / 100,
    }));

  const observationToCurrent = (observation, hourly, currentUvIndex) => {
    const properties = observation && observation.properties;
    const fallback = hourly[0] || {};
    const temperature =
      properties && properties.temperature && properties.temperature.value;
    const pressure =
      properties &&
      properties.barometricPressure &&
      properties.barometricPressure.value;
    const humidity =
      properties && properties.relativeHumidity && properties.relativeHumidity.value;
    const windSpeed = properties && properties.windSpeed && properties.windSpeed.value;
    const windGust = properties && properties.windGust && properties.windGust.value;
    const visibility = properties && properties.visibility && properties.visibility.value;
    const dewPoint = properties && properties.dewpoint && properties.dewpoint.value;

    return {
      temperature: typeof temperature === "number" ? temperature : fallback.temperature || 0,
      pressure: typeof pressure === "number" ? pressure / 100 : 1013.25,
      pressureTrend: "",
      windDirection:
        properties && properties.windDirection && properties.windDirection.value
          ? properties.windDirection.value
          : fallback.windDirection || 0,
      visibility: typeof visibility === "number" ? visibility : 16093.44,
      temperatureDewPoint:
        typeof dewPoint === "number" ? dewPoint : (fallback.temperature || 0) - 2,
      humidity: typeof humidity === "number" ? humidity / 100 : fallback.humidity || 0,
      windSpeed: typeof windSpeed === "number" ? windSpeed : fallback.windSpeed || 0,
      windGust: typeof windGust === "number" ? windGust : fallback.windGust || 0,
      cloudCover: fallback.cloudCover || 0,
      uvIndex: currentUvIndex || 0,
      daylight: fallback.daylight !== false,
      conditionCode: fallback.conditionCode || "clear",
      asOf: (properties && properties.timestamp) || new Date().toISOString(),
    };
  };

  const alerts = (data) => ({
    alerts: (data.features || []).map((feature) => ({
      source: feature.properties.senderName || "National Weather Service",
      description: feature.properties.event || "Weather alert",
      effectiveTime: feature.properties.effective,
      expireTime: feature.properties.expires,
      detailsUrl: feature.properties.uri,
      severity: [feature.properties.severity || "Unknown"],
      urgency: [feature.properties.urgency || "Unknown"],
      areaName: [feature.properties.areaDesc || ""],
    })),
  });

  const loadNwsWeather = async (latitude, longitude) => {
    const point = await fetchJson(
      `https://api.weather.gov/points/${latitude},${longitude}`,
    );
    const properties = point.properties;
    const [forecast, hourly, alertsData, supplemental] = await Promise.all([
      fetchJson(properties.forecast),
      fetchJson(properties.forecastHourly),
      fetchJson(
        `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
      ),
      fetchSupplementalData(latitude, longitude),
    ]);

    let observation;
    if (properties.observationStations) {
      const stations = await fetchJson(properties.observationStations);
      const station = stations.features && stations.features[0];
      if (station) {
        observation = await fetchJson(`${station.id}/observations/latest`);
      }
    }

    const hourlyData = hourly.properties.periods || [];
    const supplementalHourly = supplemental.hourly || {};
    const supplementalDaily = supplemental.daily || {};
    const hourlyResult = hourlyForecast(hourlyData, supplementalHourly);
    return {
      currentWeather: observationToCurrent(
        observation,
        hourlyResult,
        supplemental.current?.uv_index,
      ),
      forecastHourly: { hours: hourlyResult },
      forecastDaily: {
        days: dailyForecast(forecast.properties.periods || [], supplementalDaily),
      },
      weatherAlerts: alerts(alertsData),
    };
  };

  globalThis.fetch = async (input, init) => {
    const requestUrl = typeof input === "string" ? input : input.url;
    if (!requestUrl.startsWith("https://weather.uvw.workers.dev/")) {
      return originalFetch(input, init);
    }

    const url = new URL(requestUrl);
    const pathMatch = url.pathname.match(
      /^\/?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/,
    );
    const legacyMatch = url.search.match(
      /^\?(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\?country=([^&]+)/,
    );
    const match = pathMatch || legacyMatch;
    const country = (
      url.searchParams.get("country") || (legacyMatch && legacyMatch[3]) || ""
    ).toUpperCase();
    if (country !== "US") {
      setApiSource("UV Weather API");
      return originalFetch(input, init);
    }

    if (!match) {
      setApiSource("UV Weather API");
      return originalFetch(input, init);
    }

    try {
      console.info("UV-Weather: requesting US weather from NWS");
      const weather = await loadNwsWeather(match[1], match[2]);
      setApiSource("National Weather Service + Open-Meteo");
      console.info("UV-Weather: NWS weather loaded successfully");
      return new Response(JSON.stringify(weather), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      setApiSource("UV Weather API (fallback)");
      console.warn(
        "UV-Weather: NWS adapter failed; using the existing weather source.",
        error,
      );
      return originalFetch(input, init);
    }
  };
})();
