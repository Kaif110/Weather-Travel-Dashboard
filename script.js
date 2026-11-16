// DOM Elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusMsg = document.getElementById("status-msg");

const cityNameEl = document.getElementById("city-name");
const countryNameEl = document.getElementById("country-name");
const tempEl = document.getElementById("temperature");
const weatherDescEl = document.getElementById("weather-desc");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("wind-speed");
const packingTipEl = document.getElementById("packing-tip");
const forecastListEl = document.getElementById("forecast-list");

const countryFlagEl = document.getElementById("country-flag");
const regionEl = document.getElementById("region");
const currencyEl = document.getElementById("currency");
const timezoneEl = document.getElementById("timezone");

const planForm = document.getElementById("plan-form");
const planInput = document.getElementById("plan-input");
const planDay = document.getElementById("plan-day");
const planListEl = document.getElementById("plan-list");
const planCityLabel = document.getElementById("plan-city-label");

let currentCity = "Jaipur";

// Helper: Convert Weather Code to Readable Text
function getWeatherText(code) {
  if (code === 0) return "Clear Sky";
  if (code <= 3) return "Partly Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowfall";
  return "Thunderstorm";
}

// Helper: Travel Packing Advice based on Temperature
function getSmartAdvice(temp, code) {
  if (code >= 51 && code <= 67) return "Carry an umbrella";
  if (temp < 15) return "Pack warm jackets";
  if (temp > 30) return "Sunscreen & sunglasses";
  return "Comfortable casual wear";
}

// Main Async Function: Fetch Data from Multiple APIs
async function fetchTravelData(city) {
  try {
    statusMsg.textContent = "Loading weather and destination info...";
    statusMsg.classList.remove("hidden");

    // API 1: Geocoding API (Convert City Name to Coordinates)
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    if (!geoRes.ok) throw new Error("Geocoding failed");
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      statusMsg.textContent = "City not found. Please check spelling and try again.";
      return;
    }

    const location = geoData.results[0];
    const { name, country, country_code, latitude, longitude, timezone } = location;
    currentCity = name;

    // API 2: Weather API (Open-Meteo)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,weather_code&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error("Weather fetch failed");
    const weatherData = await weatherRes.json();

    updateWeatherUI(name, country || "", weatherData);

    // API 3: Country Info API (Separated so weather never breaks if this fails)
    fetchCountryDetails(country_code, timezone);

    // Load saved itinerary plans for this city
    renderPlans();
    statusMsg.classList.add("hidden");

  } catch (error) {
    statusMsg.textContent = "Unable to load weather data. Please check your internet or try another city.";
    console.error("Dashboard Error:", error);
  }
}

async function fetchCountryDetails(countryCode, timezone) {
  timezoneEl.textContent = timezone || "--";
  try {
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
    const data = await res.json();
    const countryInfo = Array.isArray(data) ? data[0] : data;

    if (countryInfo) {
      countryFlagEl.src = countryInfo.flags?.png || "";
      countryFlagEl.style.display = countryInfo.flags?.png ? "block" : "none";
      regionEl.textContent = countryInfo.region || "--";

      if (countryInfo.currencies) {
        const currencyKey = Object.keys(countryInfo.currencies)[0];
        const currencyObj = countryInfo.currencies[currencyKey];
        currencyEl.textContent = `${currencyObj.name} (${currencyObj.symbol || ""})`;
      }
    }
  } catch (err) {
    regionEl.textContent = "N/A";
    currencyEl.textContent = "N/A";
    countryFlagEl.style.display = "none";
  }
}

function updateWeatherUI(city, country, data) {
  const current = data.current;
  const temp = Math.round(current.temperature_2m);
  const code = current.weather_code;

  cityNameEl.textContent = city;
  countryNameEl.textContent = country;
  planCityLabel.textContent = city;
  tempEl.textContent = `${temp}°C`;
  weatherDescEl.textContent = getWeatherText(code);
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
  packingTipEl.textContent = getSmartAdvice(temp, code);

  // Render 5-Day Forecast
  forecastListEl.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const dateStr = data.daily.time[i];
    const dayName = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
    const dayCode = data.daily.weather_code[i];

    const div = document.createElement("div");
    div.className = "forecast-item";
    div.innerHTML = `
      <p>${dayName}</p>
      <strong>${maxTemp}°C</strong>
      <p>${getWeatherText(dayCode)}</p>
    `;
    forecastListEl.appendChild(div);
  }
}

// Itinerary Planner Logic (Saved in LocalStorage per city)
function getStorageKey() {
  return `travel_plans_${currentCity.toLowerCase()}`;
}

function renderPlans() {
  const savedPlans = JSON.parse(localStorage.getItem(getStorageKey())) || [];
  planListEl.innerHTML = "";

  if (savedPlans.length === 0) {
    planListEl.innerHTML = `<li class="subtitle">No activities added yet for ${currentCity}.</li>`;
    return;
  }

  savedPlans.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "plan-item";
    li.innerHTML = `
      <div>
        <span class="badge">${item.day}</span>
        <span>${item.text}</span>
      </div>
      <button class="delete-btn" onclick="deletePlan(${index})">Remove</button>
    `;
    planListEl.appendChild(li);
  });
}

planForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = planInput.value.trim();
  if (!text) return;

  const savedPlans = JSON.parse(localStorage.getItem(getStorageKey())) || [];
  savedPlans.push({ day: planDay.value, text: text });
  localStorage.setItem(getStorageKey(), JSON.stringify(savedPlans));

  planInput.value = "";
  renderPlans();
});

function deletePlan(index) {
  const savedPlans = JSON.parse(localStorage.getItem(getStorageKey())) || [];
  savedPlans.splice(index, 1);
  localStorage.setItem(getStorageKey(), JSON.stringify(savedPlans));
  renderPlans();
}

// Search Event Listener
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    fetchTravelData(city);
    cityInput.value = "";
  }
});

// Load default city on page open
fetchTravelData(currentCity);