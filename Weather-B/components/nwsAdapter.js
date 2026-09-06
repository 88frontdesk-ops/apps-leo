(() => {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const nwsHeaders = {
    Accept: "application/geo+json",
    "User-Agent": "UV-Weather/2.0 (weather extension)",
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await originalFetch(url, {
        headers: nwsHeaders,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
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
      console.warn("Supplemental UV/solar data unavailable.", error);
      return {};
    }
  };

  const fahrenheitToCelsius = (value) =>
    typeof value === "number" ? (value - 32) * (5 / 9) : 0;

  // The existing Weather-B data contract passes wind through weatherCast.js
  // as km/h and converts it to m/s for the global display variables. Keep that
  // contract intact for current, hourly, and daily data.
  const windToKmh = (value) => {
    if (typeof value !== "string") return 0;
    const number = parseFloat(value);
    if (!Number.isFinite(number)) return 0;
    const unit = value.toLowerCase();
    if (unit.includes("km/h") || unit.includes("kmh")) return number;
    if (unit.includes("mph")) return number * 1.609344;
    if (unit.includes("knot") || unit.includes("kn")) return number * 1.852;
    if (unit.includes("m/s") || unit.includes("m s-1")) return number * 3.6;
    return number;
  };

  const quantitativeWindToKmh = (quantity) => {
    if (!quantity || typeof quantity.value !== "number") return 0;
    const unit = String(quantity.unitCode || quantity.unit || "").toLowerCase();
    if (unit.includes("m_s-1") || unit.includes("m/s")) return quantity.value * 3.6;
    if (unit.includes("km_h-1") || unit.includes("km/h")) return quantity.value;
    if (unit.includes("mph") || unit.includes("mi_h-1")) return quantity.value * 1.609344;
    if (unit.includes("kn") || unit.includes("knot")) return quantity.value * 1.852;
    // NWS observations are SI when no unit metadata is supplied.
    return quantity.value * 3.6;
  };

  const directionToDegrees = (direction) => {
    if (typeof direction === "number" && Number.isFinite(direction)) return direction;
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
    return directions[String(direction || "").toUpperCase()] ?? 0;
  };

  const relativeHumidity = (period) =>
    period && period.relativeHumidity && typeof period.relativeHumidity.value === "number"
      ? period.relativeHumidity.value
      : 0;

  const precipitationChance = (period) =>
    period &&
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

  const cloudCondition = (cloudCover) => {
    if (!Number.isFinite(cloudCover)) return "clear";
    if (cloudCover <= 5) return "clear";
    if (cloudCover <= 25) return "partlycloudy";
    if (cloudCover <= 50) return "partlycloudy";
    if (cloudCover <= 87) return "cloudy";
    return "cloudy";
  };

  const conditionCode = (forecast, cloudCover) => {
    const text = String(forecast || "").toLowerCase();

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
    if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) {
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

    // For non-precipitating conditions, use NWS grid sky cover rather than
    // relying solely on the human-readable forecast phrase.
    if (Number.isFinite(cloudCover)) return cloudCondition(cloudCover);

    if (text.includes("partly") || text.includes("mostly sunny") || text.includes("mostly clear")) {
      return "partlycloudy";
    }
    if (text.includes("cloud") || text.includes("overcast")) return "cloudy";
    return "clear";
  };

  const periodToForecast = (period, grid = {}) => {
    const cloudCover = averageGridValue(
      grid.skyCover || [],
      period.startTime,
      period.endTime,
    );
    return {
      temperature: fahrenheitToCelsius(period.temperature),
      windSpeed: windToKmh(period.windSpeed),
      windGustSpeedMax: windToKmh(period.windGust),
      windDirection: directionToDegrees(period.windDirection),
      humidity: relativeHumidity(period) / 100,
      cloudCover: Math.max(0, Math.min(1, cloudCover / 100)),
      precipitationChance: precipitationChance(period) / 100,
      precipitationAmount: sumGridValue(
        grid.qpf || [],
        period.startTime,
        period.endTime,
      ),
      conditionCode: conditionCode(period.shortForecast, cloudCover),
      forecastStart: period.startTime,
      forecastEnd: period.endTime,
    };
  };

  const solarTimesFor = (dateText, latitude, longitude) => {
    const date = new Date(dateText);
    if (
      !globalThis.SunCalc ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(date.getTime())
    ) {
      return null;
    }
    return globalThis.SunCalc.getTimes(date, latitude, longitude);
  };

  const validIso = (value, fallback) =>
    value instanceof Date && Number.isFinite(value.getTime())
      ? value.toISOString()
      : fallback;

  const dailyForecast = (periods, supplementalDaily, grid, latitude, longitude) => {
    const days = [];
    for (let index = 0; index < periods.length; index += 1) {
      const day = periods[index];
      if (!day || !day.isDaytime) continue;

      const night = periods.slice(index + 1).find((period) => !period.isDaytime) || day;
      const dayForecast = periodToForecast(day, grid);
      const nightForecast = periodToForecast(night, grid);
      const dayIndex = days.length;
      const sunrise = supplementalDaily.sunrise?.[dayIndex] || day.startTime;
      const sunset = supplementalDaily.sunset?.[dayIndex] || night.endTime;
      const solar = solarTimesFor(day.startTime, latitude, longitude);
      const fallbackSolarDate = new Date(day.startTime).toISOString();

      days.push({
        forecastStart: day.startTime,
        temperatureMax: dayForecast.temperature,
        temperatureMin: nightForecast.temperature,
        maxUvIndex: Number.isFinite(supplementalDaily.uv_index_max?.[dayIndex])
          ? supplementalDaily.uv_index_max[dayIndex]
          : 0,
        sunrise,
        sunset,
        sunriseCivil: solar ? validIso(solar.dawn, sunrise) : sunrise,
        sunsetCivil: solar ? validIso(solar.dusk, sunset) : sunset,
        sunriseAstronomical: solar ? validIso(solar.nightEnd, fallbackSolarDate) : fallbackSolarDate,
        sunsetAstronomical: solar ? validIso(solar.night, fallbackSolarDate) : fallbackSolarDate,
        sunriseNautical: solar ? validIso(solar.nauticalDawn, sunrise) : sunrise,
        sunsetNautical: solar ? validIso(solar.nauticalDusk, sunset) : sunset,
        solarNoon: solar ? validIso(solar.solarNoon, fallbackSolarDate) : fallbackSolarDate,
        solarMidnight: solar ? validIso(solar.nadir, fallbackSolarDate) : fallbackSolarDate,
        moonrise: supplementalDaily.moonrise?.[dayIndex] || "",
        moonset: supplementalDaily.moonset?.[dayIndex] || "",
        daytimeForecast: dayForecast,
        overnightForecast: nightForecast,
        restOfDayForecast: dayForecast,
      });
    }
    return days;
  };

  const localHourForInstant = (iso, utcOffsetSeconds) => {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    const localMs = date.getTime() + (Number(utcOffsetSeconds) || 0) * 1000;
    return new Date(localMs).toISOString().slice(0, 16);
  };

  const uvForPeriod = (period, supplemental) => {
    const hourly = supplemental.hourly || {};
    const times = Array.isArray(hourly.time) ? hourly.time : [];
    const values = Array.isArray(hourly.uv_index) ? hourly.uv_index : [];
    if (!times.length || !values.length) return 0;
    const key = localHourForInstant(period.startTime, supplemental.utc_offset_seconds);
    const index = times.indexOf(key);
    if (index >= 0 && typeof values[index] === "number") return values[index];
    return 0;
  };

  const hourlyForecast = (periods, supplemental, grid) =>
    periods.map((period) => {
      const cloudCover = averageGridValue(
        grid.skyCover || [],
        period.startTime,
        period.endTime,
      );
      return {
        forecastStart: period.startTime,
        temperature: fahrenheitToCelsius(period.temperature),
        uvIndex: uvForPeriod(period, supplemental),
        daylight: period.isDaytime,
        conditionCode: conditionCode(period.shortForecast, cloudCover),
        cloudCover: Math.max(0, Math.min(1, cloudCover / 100)),
        windSpeed: windToKmh(period.windSpeed),
        windGust: windToKmh(period.windGust),
        windDirection: directionToDegrees(period.windDirection),
        precipitationChance: precipitationChance(period) / 100,
        humidity: relativeHumidity(period) / 100,
      };
    });

  const nearestHourly = (hours, timestamp) => {
    if (!hours.length) return {};
    const target = Date.parse(timestamp || new Date().toISOString());
    let best = hours[0];
    let bestDistance = Math.abs(Date.parse(best.forecastStart) - target);
    for (const hour of hours) {
      const time = Date.parse(hour.forecastStart);
      const distance = Math.abs(time - target);
      if (Number.isFinite(distance) && distance < bestDistance) {
        best = hour;
        bestDistance = distance;
      }
    }
    return best;
  };

  const observationToCurrent = (observation, hourly, currentUvIndex) => {
    const properties = observation && observation.properties;
    const observationTime = properties && properties.timestamp;
    const fallback = nearestHourly(hourly, observationTime);
    const temperature = properties?.temperature?.value;
    const pressure = properties?.barometricPressure?.value;
    const humidity = properties?.relativeHumidity?.value;
    const visibility = properties?.visibility?.value;
    const dewPoint = properties?.dewpoint?.value;
    const cloudCover = fallback.cloudCover || 0;

    return {
      temperature: typeof temperature === "number" ? temperature : fallback.temperature || 0,
      pressure: typeof pressure === "number" ? pressure / 100 : 1013.25,
      pressureTrend: properties?.pressureTendency?.value || "",
      windDirection:
        typeof properties?.windDirection?.value === "number"
          ? properties.windDirection.value
          : fallback.windDirection || 0,
      visibility: typeof visibility === "number" ? visibility : 16093.44,
      temperatureDewPoint:
        typeof dewPoint === "number" ? dewPoint : (fallback.temperature || 0) - 2,
      humidity: typeof humidity === "number" ? humidity / 100 : fallback.humidity || 0,
      windSpeed:
        typeof properties?.windSpeed?.value === "number"
          ? quantitativeWindToKmh(properties.windSpeed)
          : fallback.windSpeed || 0,
      windGust:
        typeof properties?.windGust?.value === "number"
          ? quantitativeWindToKmh(properties.windGust)
          : fallback.windGust || 0,
      cloudCover,
      uvIndex: typeof currentUvIndex === "number" ? currentUvIndex : fallback.uvIndex || 0,
      daylight: fallback.daylight !== false,
      conditionCode: conditionCode(
        properties?.textDescription || fallback.conditionCode || "clear",
        cloudCover * 100,
      ),
      asOf: observationTime || new Date().toISOString(),
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
    const point = await fetchJson(`https://api.weather.gov/points/${latitude},${longitude}`);
    const properties = point.properties;

    const [forecast, hourly, alertsData, supplemental] = await Promise.all([
      fetchJson(properties.forecast),
      fetchJson(properties.forecastHourly),
      fetchJson(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`),
      fetchSupplementalData(latitude, longitude),
    ]);

    // Grid data improves cloud cover and QPF, but it is supplemental. If it is
    // temporarily unavailable, retain the NWS forecast instead of failing the
    // whole adapter and producing blank UI.
    let gridData = {};
    if (properties.forecastGridData) {
      try {
        gridData = await fetchJson(properties.forecastGridData);
      } catch (error) {
        console.warn("NWS grid data unavailable; using forecast text/PoP.", error);
      }
    }

    let observation;
    if (properties.observationStations) {
      try {
        const stations = await fetchJson(properties.observationStations);
        const station = stations.features && stations.features[0];
        if (station) observation = await fetchJson(`${station.id}/observations/latest`);
      } catch (error) {
        console.warn("NWS station observation unavailable; using forecast fallback.", error);
      }
    }

    const grid = {
      skyCover: gridIntervals(gridData.properties?.skyCover?.values),
      qpf: gridIntervals(gridData.properties?.quantitativePrecipitation?.values),
    };
    const hourlyData = hourly.properties.periods || [];
    const hourlyResult = hourlyForecast(hourlyData, supplemental, grid);
    const currentUv =
      typeof supplemental.current?.uv_index === "number"
        ? supplemental.current.uv_index
        : uvForPeriod(nearestHourly(hourlyResult, observation?.properties?.timestamp), supplemental);

    return {
      currentWeather: observationToCurrent(observation, hourlyResult, currentUv),
      forecastHourly: { hours: hourlyResult },
      forecastDaily: {
        days: dailyForecast(
          forecast.properties.periods || [],
          supplemental.daily || {},
          grid,
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
    const pathMatch = url.pathname.match(/^\/?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    const legacyMatch = url.search.match(
      /^\?(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\?country=([^&]+)/,
    );
    const match = pathMatch || legacyMatch;
    const country = (
      url.searchParams.get("country") || (legacyMatch && legacyMatch[3]) || ""
    ).toUpperCase();

    if (country !== "US" || !match) {
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
      console.warn("UV-Weather: NWS adapter failed; using the existing weather source.", error);
      return originalFetch(input, init);
    }
  };
})();
