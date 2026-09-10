document.addEventListener('DOMContentLoaded', () => {
  initLocation();

  document.getElementById('search-btn').addEventListener('click', searchLocation);
  document.getElementById('gps-btn').addEventListener('click', useGpsLocation);
  document.getElementById('city-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchLocation();
  });
});

function initLocation() {
  chrome.storage.local.get(['defaultLocation'], (result) => {
    if (result.defaultLocation) {
      const { lat, lon, name } = result.defaultLocation;
      loadLocationData(lat, lon, name);
    } else {
      useGpsLocation();
    }
  });
}

function useGpsLocation() {
  chrome.storage.local.remove('defaultLocation');
  showLoader('Getting GPS location...');
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        loadLocationData(lat, lon, 'GPS Location');
      },
      (error) => {
        console.warn('Geolocation failed. Defaulting to NYC.', error);
        loadLocationData(40.7128, -74.0060, 'New York, US');
      }
    );
  } else {
    loadLocationData(40.7128, -74.0060, 'New York, US');
  }
}

async function searchLocation() {
  const query = document.getElementById('city-input').value.trim();
  if (!query) return;

  showLoader(`Searching '${query}'...`);

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const res = await fetch(geoUrl).then(r => r.json());

    if (res.results && res.results.length > 0) {
      renderSearchResults(res.results);
    } else {
      alert('No matching locations or zip codes found.');
      initLocation();
    }
  } catch (err) {
    console.error('Geocoding error:', err);
    alert('Failed to search location.');
    initLocation();
  }
}

function renderSearchResults(results) {
  const content = document.getElementById('content');
  const loader = document.getElementById('loader');
  loader.classList.add('hidden');
  content.classList.remove('hidden');

  let resultsContainer = document.getElementById('search-results-list');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'search-results-list';
    resultsContainer.className = 'search-results-container';
    content.prepend(resultsContainer);
  }

  resultsContainer.innerHTML = '<h3>Select Location to Save as Default:</h3>';

  results.forEach((loc) => {
    const lat = loc.latitude.toFixed(4);
    const lon = loc.longitude.toFixed(4);
    const stateCountry = [loc.admin1, loc.country_code ? loc.country_code.toUpperCase() : ''].filter(Boolean).join(', ');
    const name = `${loc.name}${stateCountry ? ' (' + stateCountry + ')' : ''}`;

    const btn = document.createElement('button');
    btn.className = 'search-result-item';
    btn.innerText = name;
    btn.addEventListener('click', () => {
      chrome.storage.local.set({ defaultLocation: { lat, lon, name } });
      resultsContainer.remove();
      document.getElementById('city-input').value = '';
      loadLocationData(lat, lon, name);
    });
    resultsContainer.appendChild(btn);
  });
}

async function loadLocationData(lat, lon, locationName) {
  showLoader('Fetching weather data...');

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,precipitation_probability,uv_index,weather_code&daily=uv_index_max,sunrise,sunset,moonrise,moonset&temperature_unit=celsius&timezone=auto&forecast_days=2`;
    const weatherData = await fetch(weatherUrl).then(r => r.json());

    document.getElementById('location-name').innerText = locationName;

    const currentTemp = Math.round(weatherData.current.temperature_2m);
    const weatherInfo = getWeatherCondition(weatherData.current.weather_code);

    document.getElementById('current-temp').innerText = `${currentTemp}°C`;
    document.getElementById('short-forecast').innerText = weatherInfo.label;
    
    const mainIcon = document.getElementById('weather-icon');
    mainIcon.src = weatherInfo.icon;
    mainIcon.style.width = '64px';
    mainIcon.style.height = '64px';

    renderHourlyForecast(weatherData.hourly);
    renderMeteoData(weatherData);
    updateExtensionIcon(currentTemp, weatherInfo.icon);

    hideLoader();

  } catch (err) {
    console.error('Weather loading error:', err);
    document.getElementById('loader').innerText = 'Unable to fetch weather data.';
  }
}

function renderHourlyForecast(hourly) {
  const container = document.getElementById('hourly-forecast');
  container.innerHTML = '';

  const now = new Date();
  let count = 0;

  for (let i = 0; i < hourly.time.length && count < 24; i++) {
    const itemTime = new Date(hourly.time[i]);
    if (itemTime < now && (now - itemTime) > 3600000) continue;

    const timeStr = itemTime.toLocaleTimeString([], { hour: 'numeric' });
    const tempC = Math.round(hourly.temperature_2m[i]);
    const pop = hourly.precipitation_probability[i] ?? 0;
    const uv = hourly.uv_index[i] ?? 0;
    const condition = getWeatherCondition(hourly.weather_code[i]);

    const item = document.createElement('div');
    item.className = 'hourly-item';
    item.innerHTML = `
      <div class="hourly-time">${timeStr}</div>
      <img class="hourly-icon" src="${condition.icon}" alt="icon" style="width:36px; height:36px;" />
      <div class="hourly-temp">${tempC}°C</div>
      <div class="hourly-pop">☔ ${pop}%</div>
      <div class="hourly-uv">UV ${Math.round(uv)}</div>
    `;
    container.appendChild(item);
    count++;
  }
}

function renderMeteoData(weatherData) {
  const daily = weatherData.daily;
  document.getElementById('uv-index').innerText = daily.uv_index_max[0] ?? 'N/A';
  document.getElementById('sunrise').innerText = formatTime(daily.sunrise[0]);
  document.getElementById('sunset').innerText = formatTime(daily.sunset[0]);
  document.getElementById('moonrise').innerText = formatTime(daily.moonrise[0]);
  document.getElementById('moonset').innerText = formatTime(daily.moonset[0]);
}

function getWeatherCondition(code) {
  const WMO_CODES = {
    0: { label: 'Clear Sky', icon: 'https://api.weather.gov/icons/land/day/skc?size=medium' },
    1: { label: 'Mainly Clear', icon: 'https://api.weather.gov/icons/land/day/few?size=medium' },
    2: { label: 'Partly Cloudy', icon: 'https://api.weather.gov/icons/land/day/sct?size=medium' },
    3: { label: 'Overcast', icon: 'https://api.weather.gov/icons/land/day/bkn?size=medium' },
    45: { label: 'Foggy', icon: 'https://api.weather.gov/icons/land/day/fg?size=medium' },
    48: { label: 'Depositing Rime Fog', icon: 'https://api.weather.gov/icons/land/day/fg?size=medium' },
    51: { label: 'Light Drizzle', icon: 'https://api.weather.gov/icons/land/day/rain_showers?size=medium' },
    61: { label: 'Slight Rain', icon: 'https://api.weather.gov/icons/land/day/rain?size=medium' },
    63: { label: 'Moderate Rain', icon: 'https://api.weather.gov/icons/land/day/rain?size=medium' },
    65: { label: 'Heavy Rain', icon: 'https://api.weather.gov/icons/land/day/rain?size=medium' },
    71: { label: 'Slight Snow', icon: 'https://api.weather.gov/icons/land/day/snow?size=medium' },
    80: { label: 'Rain Showers', icon: 'https://api.weather.gov/icons/land/day/rain_showers?size=medium' },
    95: { label: 'Thunderstorm', icon: 'https://api.weather.gov/icons/land/day/tsra?size=medium' }
  };
  return WMO_CODES[code] || { label: 'Clear', icon: 'https://api.weather.gov/icons/land/day/skc?size=medium' };
}

function formatTime(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showLoader(msg) {
  const loader = document.getElementById('loader');
  loader.innerText = msg;
  loader.classList.remove('hidden');
  document.getElementById('content').classList.add('hidden');
}

function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('content').classList.remove('hidden');
}

async function updateExtensionIcon(temp, iconUrl) {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['BLOBS'],
        justification: 'Render canvas icon for extension badge'
      });
    }

    chrome.runtime.sendMessage({
      target: 'offscreen',
      data: { temp: `${temp}°`, iconUrl }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
        return;
      }
      if (response && response.imageData) {
        chrome.action.setIcon({ imageData: response.imageData });
      }
    });
  } catch (e) {
    console.warn('Offscreen icon update skipped:', e);
  }
}