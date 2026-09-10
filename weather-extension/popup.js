document.addEventListener('DOMContentLoaded', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        loadLocationData(lat, lon);
      },
      (error) => {
        console.warn('Geolocation denied or failed. Defaulting to NYC.', error);
        loadLocationData(40.7209, -74.0007);
      }
    );
  } else {
    loadLocationData(40.7209, -74.0007);
  }
});

async function loadLocationData(lat, lon) {
  const loader = document.getElementById('loader');

  try {
    // Open-Meteo endpoint set to Celsius explicitly
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,uv_index&daily=uv_index_max,sunrise,sunset,moonrise,moonset&temperature_unit=celsius&timezone=auto&forecast_days=1`;
    const openMeteoPromise = fetch(openMeteoUrl).then(r => r.json());

    // NWS points endpoint check
    const nwsPointsUrl = `https://api.weather.gov/points/${lat},${lon}`;
    const nwsPointsRes = await fetch(nwsPointsUrl);

    if (nwsPointsRes.ok) {
      // US Location (NWS API)
      const pointsData = await nwsPointsRes.json();
      const forecastUrl = pointsData.properties.forecast;
      const hourlyUrl = pointsData.properties.forecastHourly;
      const location = pointsData.properties.relativeLocation.properties;

      const [forecastRes, hourlyRes, meteoData] = await Promise.all([
        fetch(forecastUrl).then(r => r.json()),
        fetch(hourlyUrl).then(r => r.json()),
        openMeteoPromise
      ]);

      document.getElementById('location-name').innerText = `${location.city}, ${location.state} (NWS)`;

      // Process current hour from NWS (convert F to C)
      const periods = hourlyRes.properties.periods;
      const currentHour = periods[0];
      const currentTempC = fahrenheitToCelsius(currentHour.temperature);
      
      document.getElementById('current-temp').innerText = `${currentTempC}°C`;
      document.getElementById('short-forecast').innerText = currentHour.shortForecast;

      // Render NWS Hourly Forecast (First 12 Hours)
      renderNwsHourly(periods.slice(0, 12));

      // Detailed text forecast
      const currentPeriod = forecastRes.properties.periods[0];
      document.getElementById('forecast-period').innerText = currentPeriod.name;
      document.getElementById('detailed-forecast').innerText = currentPeriod.detailedForecast;

      renderMeteoData(meteoData);

    } else {
      // Fallback for International Locations (Open-Meteo API)
      const meteoData = await openMeteoPromise;

      document.getElementById('location-name').innerText = `Lat: ${lat}, Lon: ${lon} (Open-Meteo)`;
      document.getElementById('current-temp').innerText = `${Math.round(meteoData.current.temperature_2m)}°C`;
      document.getElementById('short-forecast').innerText = "International Forecast";
      
      // Render Open-Meteo Hourly Forecast
      renderMeteoHourly(meteoData.hourly);

      document.getElementById('forecast-period').innerText = "Today";
      document.getElementById('detailed-forecast').innerText = "NWS data unavailable for this location. Displaying Open-Meteo feed.";

      renderMeteoData(meteoData);
    }

    loader.classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');

  } catch (err) {
    console.error('Weather loading error:', err);
    loader.innerText = 'Unable to fetch weather data.';
  }
}

// Render hourly list from NWS data
function renderNwsHourly(periods) {
  const container = document.getElementById('hourly-forecast');
  container.innerHTML = '';

  periods.forEach(period => {
    const timeStr = new Date(period.startTime).toLocaleTimeString([], { hour: 'numeric' });
    const tempC = fahrenheitToCelsius(period.temperature);

    const item = document.createElement('div');
    item.className = 'hourly-item';
    item.innerHTML = `
      <div class="hourly-time">${timeStr}</div>
      <div class="hourly-temp">${tempC}°C</div>
    `;
    container.appendChild(item);
  });
}

// Render hourly list from Open-Meteo data
function renderMeteoHourly(hourly) {
  const container = document.getElementById('hourly-forecast');
  container.innerHTML = '';

  // Get next 12 hours of data
  for (let i = 0; i < 12; i++) {
    if (!hourly.time[i]) break;
    const timeStr = new Date(hourly.time[i]).toLocaleTimeString([], { hour: 'numeric' });
    const tempC = Math.round(hourly.temperature_2m[i]);

    const item = document.createElement('div');
    item.className = 'hourly-item';
    item.innerHTML = `
      <div class="hourly-time">${timeStr}</div>
      <div class="hourly-temp">${tempC}°C</div>
    `;
    container.appendChild(item);
  };
}

// Helper to convert Fahrenheit to Celsius and round
function fahrenheitToCelsius(fTemp) {
  return Math.round((fTemp - 32) * (5 / 9));
}

function renderMeteoData(meteoData) {
  const daily = meteoData.daily;
  document.getElementById('uv-index').innerText = daily.uv_index_max[0];
  document.getElementById('sunrise').innerText = formatTime(daily.sunrise[0]);
  document.getElementById('sunset').innerText = formatTime(daily.sunset[0]);
  document.getElementById('moonrise').innerText = formatTime(daily.moonrise[0]);
  document.getElementById('moonset').innerText = formatTime(daily.moonset[0]);
}

function formatTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}