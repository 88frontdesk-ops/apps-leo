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
        const response = await originalFetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status}`);
        return await response.json();
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

  // NWS shortForecast is the authoritative condition classification.
  // PoP is a separate probability and must not be used to turn rain into clear.
  const conditionCode = (forecast) => {
    const text = (forecast || "").toLowerCase();

    if (text.includes("thunder")) return "thunderstorms";
    if (
      text.includes("freezing rain") ||
      text.includes("freezing drizzle") ||
      text.includes("sleet") ||
      text.includes("wintry mix") ||
      text.includes("ice")
    ) {
      return "sleet";
    }
    if (text.includes("snow") || text.includes("flurr")) return "snow";
    if (
      text.includes("rain") ||
      text.includes("drizzle") ||
      text.includes("shower")
    ) {
      return "rain";
    }
    if (
      text.includes("fog") ||
      text.includes("haze") ||
      text.includes("smoke") ||
      text.includes("dust")
    ) {
      return "foggy";
    }
    if (
      text.includes("partly") ||
      text.includes("mostly sunny") ||
      text.includes("mostly clear")
    ) {
      return "partlycloudy";
    }
    if (text.includes("cloud") || text.includes("overcast")) return "cloudy";

    return "clear";
  };

  const relativeHumidity = (period) =>
    period.relativeHumidity && typeof period.relativeHumidity.value === "number"
      ? period.relativeHumidity.value
      : 0;

  const precipitationChance = (period) =>
    period.probabilityOfPrecipitation &&
    typeof period.probabilityOfPrecipitation.value === "number"
      ? period.probabilityOfPrecipitation.value
      : 0;

  const parseIsoDurationMs = (duration) => {
    const match = String(duration || "").match(
      /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
    );
    if (!match) return 0;
    return (
      Number(match[1] || 0) * 86400000 +
      Number(match[2] || 0) * 3600000 +
      Number(match[3] || 0) * 60000 +
      Number(match[4] || 0) * 1000
    );
  };

  const gridIntervals = (values) =>
    Array.isArray(values)
      ? values
          .map((item) => {
            const [startText, durationText] = String(item.validTime || "").split("/");
            const start = Date.parse(startText);
            const durationMs = parseIsoDurationMs(durationText);
            if (!Number.isFinite(start) || !durationMs) return null;
            return {
              start,
              end: start + durationMs,
              value:
                typeof item.value === "number" && Number.isFinite(item.value)
                  ? item.value
                  : null,
            };
          })
          .filter(Boolean)
      : [];

  const averageGridValue = (intervals, startTime, endTime) => {
    const start = Date.parse(startTime);
    const end = Date.parse(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

    let weightedValue = 0;
    let totalDuration = 0;
    for (const interval of intervals) {
      const overlapStart = Math.max(start, interval.start);
      const overlapEnd = Math.min(end, interval.end);
      if (overlapEnd <= overlapStart || interval.value == null) continue;
      const duration = overlapEnd - overlapStart;
      weightedValue += interval.value * duration;
      totalDuration += duration;
    }
    return totalDuration ? weightedValue / totalDuration : 0;
  };

  const sumGridValue = (intervals, startTime, endTime) => {
    const start = Date.parse(startTime);
    const end = Date.parse(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

    let total = 0;
    for (const interval of intervals) {
      if (interval.value == null) continue;
      if (interval.start >= start && interval.end <= end) total += interval.value;
    }
    return total;
  };

  const periodToForecast = (period, grid = {}) => ({
    temperature: fahrenheitToCelsius(period.temperature),
    windSpeed: metersPerSecond(period.windSpeed),
    windGustSpeedMax: metersPerSecond(period.windGust),
    windDirection: directionToDegrees(period.windDirection),
    humidity: relativeHumidity(period) / 100,
    cloudCover: averageGridValue(
      grid.skyCover || [],
      period.startTime,
      period.endTime,
    ),
    precipitationChance: precipitationChance(period) / 100,
    precipitationAmount: sumGridValue(
      grid.qpf || [],
      period.startTime,
      period.endTime,
    ),
    conditionCode: conditionCode(period.shortForecast),
    forecastStart: period.startTime,
    forecastEnd: period.endTime,
  });

  const dailyForecast = (periods, supplementalDaily, grid, latitude, longitude) => {
    const days = [];
    for (let index = 0; index < periods.length; index += 1) {
      const day = periods[index];
      if (!day || !day.isDaytime) continue;

      const night =
        periods.slice(index + 1).find((period) => !period.isDaytime) || day;
      const dayForecastBase = periodToForecast(day, grid);
      const nightForecastBase = periodToForecast(night, grid);

      // daily.js historically expects these two fields in km/h and converts
      // them to m/s before passing them through the display-unit formatter.
      // Hourly/current data remain normalized to m/s.
      const dayForecast = {
        ...dayForecastBase,
        windSpeed: dayForecastBase.windSpeed * 3.6,
        windGustSpeedMax: dayForecastBase.windGustSpeedMax * 3.6,
      };
      const nightForecast = {
        ...nightForecastBase,
        windSpeed: nightForecastBase.windSpeed * 3.6,
        windGustSpeedMax: nightForecastBase.windGustSpeedMax * 3.6,
      };

      const dayIndex = days.length;
      const sunrise = supplementalDaily.sunrise?.[dayIndex] || day.startTime;
      const sunset = supplementalDaily.sunset?.[dayIndex] || night.endTime;
      const dayDate = new Date(day.startTime);
      const solarTimes =
        globalThis.SunCalc && Number.isFinite(dayDate.getTime())
          ? globalThis.SunCalc.getTimes(dayDate, latitude, longitude)
          : null;

      const solarTime = (key, fallback) =>
        solarTimes &&
        solarTimes[key] instanceof Date &&
        Number.isFinite(solarTimes[key].getTime())
          ? solarTimes[key].toISOString()
          : fallback;

      days.push({
        forecastStart: day.startTime,
        temperatureMax: dayForecast.temperature,
        temperatureMin: nightForecast.temperature,
        maxUvIndex: supplementalDaily.uv_index_max?.[dayIndex] || 0,
        sunrise,
        sunset,
        sunriseCivil: solarTime("dawn", sunrise),
        sunsetCivil: solarTime("dusk", sunset),
        sunriseAstronomical: solarTime("nightEnd", sunrise),
        sunsetAstronomical: solarTime("night", sunset),
        sunriseNautical: solarTime("nauticalDawn", sunrise),
        sunsetNautical: solarTime("nauticalDusk", sunset),
        solarNoon: solarTime("solarNoon", sunrise),
        solarMidnight: solarTime("nadir", sunset),
        moonrise: supplementalDaily.moonrise?.[dayIndex] || "",
        moonset: supplementalDaily.moonset?.[dayIndex] || "",
        daytimeForecast: dayForecast,
        overnightForecast: nightForecast,
        restOfDayForecast: dayForecast,
      });
    }
    return days;
  };

  const hourlyForecast = (periods, supplementalHourly, grid) =>
    periods.map((period) => {
      const localHour = period.startTime.slice(0, 16);
      const uvIndex =
        supplementalHourly.time && supplementalHourly.uv_index
          ? supplementalHourly.uv_index[
              supplementalHourly.time.indexOf(localHour)
            ] ?? 0
          : 0;

      return {
        forecastStart: period.startTime,
        temperature: fahrenheitToCelsius(period.temperature),
        uvIndex,
        daylight: period.isDaytime,
        conditionCode: conditionCode(period.shortForecast),
        cloudCover: averageGridValue(
          grid.skyCover || [],
          period.startTime,
          period.endTime,
        ),
        windSpeed: metersPerSecond(period.windSpeed),
        windGust: metersPerSecond(period.windGust),
        windDirection: directionToDegrees(period.windDirection),
        precipitationChance: precipitationChance(period) / 100,
        humidity: relativeHumidity(period) / 100,
      };
    });

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
      temperature:
        typeof temperature === "number" ? temperature : fallback.temperature || 0,
      pressure: typeof pressure === "number" ? pressure / 100 : 1013.25,
      pressureTrend: "",
      windDirection:
        properties && properties.windDirection && properties.windDirection.value
          ? properties.windDirection.value
          : fallback.windDirection || 0,
      visibility: typeof visibility === "number" ? visibility : 16093.44,
      temperatureDewPoint:
        typeof dewPoint === "number"
          ? dewPoint
          : (fallback.temperature || 0) - 2,
      humidity:
        typeof humidity === "number" ? humidity / 100 : fallback.humidity || 0,
      windSpeed:
        typeof windSpeed === "number" ? windSpeed : fallback.windSpeed || 0,
      windGust:
        typeof windGust === "number" ? windGust : fallback.windGust || 0,
      windSpeedUnit: "m/s",
      windGustUnit: "m/s",
      cloudCover: fallback.cloudCover || 0,
      uvIndex: currentUvIndex || 0,
      daylight: fallback.daylight !== false,
      conditionCode: conditionCode(
        (properties && properties.textDescription) ||
          fallback.conditionCode ||
          "clear",
      ),
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

    const [forecast, hourly, gridData, alertsData, supplemental] =
      await Promise.all([
        fetchJson(properties.forecast),
        fetchJson(properties.forecastHourly),
        fetchJson(properties.forecastGridData),
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
    const grid = {
      skyCover: gridData.properties?.skyCover?.values || [],
      qpf: gridData.properties?.quantitativePrecipitation?.values || [],
    };
    const normalizedGrid = {
      skyCover: gridIntervals(grid.skyCover),
      qpf: gridIntervals(grid.qpf),
    };

    const hourlyResult = hourlyForecast(
      hourlyData,
      supplementalHourly,
      normalizedGrid,
    );

    return {
      currentWeather: observationToCurrent(
        observation,
        hourlyResult,
        supplemental.current?.uv_index,
      ),
      forecastHourly: { hours: hourlyResult },
      forecastDaily: {
        days: dailyForecast(
          forecast.properties.periods || [],
          supplementalDaily,
          normalizedGrid,
          Number(latitude),
          Number(longitude),
        ),
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
