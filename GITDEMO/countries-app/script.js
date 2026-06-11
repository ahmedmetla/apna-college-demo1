const API_URL = 'https://restcountries.com/v3.1/all?fields=name,population,flags';

const spinner     = document.getElementById('spinner');
const errorMsg    = document.getElementById('errorMsg');
const countryList = document.getElementById('countryList');
const searchBar   = document.getElementById('searchBar');

let allCountries = [];

// Format population — 1000000 → 1,000,000
function formatPop(num) {
  return num.toLocaleString();
}

// Render cards
function renderCards(list) {
  countryList.innerHTML = '';

  if (list.length === 0) {
    countryList.innerHTML = '<p class="no-results">No countries found 😕</p>';
    return;
  }

  list.forEach(country => {
    const name = country.name.common;
    const pop  = formatPop(country.population);
    const flag = country.flags.emoji || '🏳️';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flag">${flag}</div>
      <div class="info">
        <h3>${name}</h3>
        <p>Population: <span>${pop}</span></p>
      </div>
    `;
    countryList.appendChild(card);
  });
}

// Fetch data
async function fetchCountries() {
  spinner.classList.remove('hidden');
  errorMsg.classList.add('hidden');
  countryList.innerHTML = '';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('API error');

    const data = await res.json();

    // Sort by population descending, take top 10
    allCountries = data
      .sort((a, b) => b.population - a.population)
      .slice(0, 10);

    renderCards(allCountries);

  } catch (err) {
    errorMsg.textContent = '⚠️ Oops! Could not load countries. Check your connection and try again.';
    errorMsg.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
  }
}

// Search filter
searchBar.addEventListener('input', () => {
  const query = searchBar.value.trim().toLowerCase();
  const filtered = allCountries.filter(c =>
    c.name.common.toLowerCase().includes(query)
  );
  renderCards(filtered);
});

// Init
fetchCountries();