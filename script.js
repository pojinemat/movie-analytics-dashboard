const COLORS = {
  gold: '#E3B23C',
  red: '#C2452D',
  line: '#2A2E35',
  text: '#8A8F98'
};

let MOVIES = [];

async function loadData() {
  const res = await fetch('data/movies.json');
  if (!res.ok) throw new Error('Could not load data/movies.json');
  MOVIES = await res.json();
  renderStats();
  populateGenreFilter();
  renderResults(topRated(MOVIES, 8));
  initQuiz();
}

function uniqueGenres(movies) {
  const set = new Set();
  movies.forEach(m => m.genre.forEach(g => set.add(g)));
  return [...set].sort();
}

function topRated(movies, n) {
  return [...movies].sort((a, b) => b.rating - a.rating).slice(0, n);
}

/* ===================== STATS ===================== */
function renderStats() {
  const avg = (MOVIES.reduce((s, m) => s + m.rating, 0) / MOVIES.length).toFixed(1);
  const years = MOVIES.map(m => m.year);
  document.getElementById('statCount').textContent = MOVIES.length;
  document.getElementById('statAvg').textContent = avg;
  document.getElementById('statGenres').textContent = uniqueGenres(MOVIES).length;
  document.getElementById('statYears').textContent = `${Math.min(...years)}–${Math.max(...years)}`;
}

/* ===================== CHARTS ===================== */
let chartsRendered = false;

function renderCharts() {
  if (chartsRendered) return;
  chartsRendered = true;
  Chart.defaults.color = COLORS.text;
  Chart.defaults.borderColor = COLORS.line;
  Chart.defaults.font.family = "'Inter', sans-serif";
  renderGenreChart();
  renderRatingChart();
  renderYearChart();
  renderScatterChart();
}

function renderGenreChart() {
  const counts = {};
  MOVIES.forEach(m => m.genre.forEach(g => counts[g] = (counts[g] || 0) + 1));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  new Chart(document.getElementById('genreChart'), {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => e[1]), backgroundColor: COLORS.gold, borderRadius: 4 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderRatingChart() {
  const buckets = ['<6', '6–7', '7–8', '8–9', '9+'];
  const counts = [0, 0, 0, 0, 0];
  MOVIES.forEach(m => {
    if (m.rating < 6) counts[0]++;
    else if (m.rating < 7) counts[1]++;
    else if (m.rating < 8) counts[2]++;
    else if (m.rating < 9) counts[3]++;
    else counts[4]++;
  });
  new Chart(document.getElementById('ratingChart'), {
    type: 'bar',
    data: { labels: buckets, datasets: [{ data: counts, backgroundColor: COLORS.red, borderRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderYearChart() {
  const byDecade = {};
  MOVIES.forEach(m => {
    const decade = Math.floor(m.year / 10) * 10;
    byDecade[decade] = (byDecade[decade] || 0) + 1;
  });
  const labels = Object.keys(byDecade).sort((a, b) => a - b);
  new Chart(document.getElementById('yearChart'), {
    type: 'line',
    data: {
      labels: labels.map(l => `${l}s`),
      datasets: [{
        data: labels.map(l => byDecade[l]),
        borderColor: COLORS.gold,
        backgroundColor: 'rgba(227,178,60,0.15)',
        fill: true, tension: 0.35, pointRadius: 3
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

function renderScatterChart() {
  new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        data: MOVIES.map(m => ({ x: m.rating, y: m.revenue_million })),
        backgroundColor: COLORS.red,
        pointRadius: 4
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const m = MOVIES[ctx.dataIndex];
              return `${m.title}: ${m.rating} / $${m.revenue_million}M`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Rating' } },
        y: { title: { display: true, text: 'Revenue ($M)' } }
      }
    }
  });
}

/* ===================== PAGE NAVIGATION ===================== */
function showMainSite() {
  document.getElementById('landingPage').classList.add('hidden');
  const main = document.getElementById('mainSite');
  main.classList.remove('hidden');
  window.scrollTo(0, 0);
  // Render charts now that canvases are visible
  setTimeout(renderCharts, 50);
}

function showLanding() {
  document.getElementById('mainSite').classList.add('hidden');
  document.getElementById('landingPage').classList.remove('hidden');
  window.scrollTo(0, 0);
  startQuiz();
}

document.getElementById('enterDashboard').addEventListener('click', showMainSite);
document.getElementById('retakeQuizHeader').addEventListener('click', showLanding);
document.getElementById('retakeQuizFooter').addEventListener('click', showLanding);
document.getElementById('retakeQuizLanding').addEventListener('click', () => {
  document.getElementById('quizResults').hidden = true;
  startQuiz();
});

/* ===================== SEARCH ===================== */
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (!q) return;
  const matches = MOVIES.filter(m => m.title.toLowerCase().includes(q)).slice(0, 6);
  matches.forEach(m => {
    const row = document.createElement('div');
    row.className = 'search-row';
    row.innerHTML = `
      <div class="left">${m.title}<span class="d">${m.director} · ${m.year} · ${m.genre.join(', ')}</span></div>
      <div class="right">${m.rating.toFixed(1)}</div>
    `;
    searchResults.appendChild(row);
  });
  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="empty-state">No titles match that search.</div>';
  }
});

/* ===================== RECOMMENDER ===================== */
function populateGenreFilter() {
  const genreSelect = document.getElementById('fGenre');
  uniqueGenres(MOVIES).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    genreSelect.appendChild(opt);
  });

  const directorSelect = document.getElementById('fDirector');
  const directors = [...new Set(MOVIES.map(m => m.director))].sort();
  directors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    directorSelect.appendChild(opt);
  });
}

function renderResults(list) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">Nothing matches those filters. Try loosening one.</div>';
    return;
  }
  list.forEach(m => {
    const card = document.createElement('div');
    card.className = 'ticket';
    card.innerHTML = `
      <div class="t-title">${m.title}</div>
      <div class="t-meta">${m.director} · ${m.year} · ${m.genre.join(', ')}</div>
      <div class="t-footer">
        <span class="t-rating">★ ${m.rating.toFixed(1)}</span>
        <span class="t-runtime mono">${m.runtime} min</span>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById('recommendBtn').addEventListener('click', () => {
  const genre    = document.getElementById('fGenre').value;
  const director = document.getElementById('fDirector').value;
  const minYear  = parseInt(document.getElementById('fYear').value, 10);
  const minRating = parseFloat(document.getElementById('fRating').value);
  const runtime  = document.getElementById('fRuntime').value;
  const minVotes = parseInt(document.getElementById('fVotes').value, 10);
  const sortBy   = document.getElementById('fSort').value;

  let list = MOVIES.filter(m => {
    if (genre    && !m.genre.includes(genre)) return false;
    if (director && m.director !== director)  return false;
    if (m.year    < minYear)                  return false;
    if (m.rating  < minRating)                return false;
    if (m.votes   < minVotes)                 return false;
    if (runtime === 'short'  && m.runtime >= 90)  return false;
    if (runtime === 'medium' && (m.runtime < 90  || m.runtime > 120)) return false;
    if (runtime === 'long'   && (m.runtime < 120 || m.runtime > 150)) return false;
    if (runtime === 'epic'   && m.runtime <= 150) return false;
    return true;
  });

  list.sort((a, b) => b[sortBy] - a[sortBy]);
  renderResults(list.slice(0, 12));
});

document.getElementById('resetFilters').addEventListener('click', () => {
  ['fGenre', 'fDirector', 'fYear', 'fRating', 'fRuntime', 'fVotes', 'fSort'].forEach(id => {
    document.getElementById(id).selectedIndex = 0;
  });
  renderResults(topRated(MOVIES, 12));
});

/* ===================== TASTE QUIZ ===================== */
const QUIZ_ROUNDS = 6;
let quizPool = [];
let quizUsedIds = new Set();
let quizRoundNum = 0;
let preferences = { genre: {}, decade: {} };

function movieId(m) { return `${m.title}::${m.year}`; }
function decadeOf(m) { return Math.floor(m.year / 10) * 10; }

function genreOverlap(a, b) {
  const setB = new Set(b.genre);
  return a.genre.filter(g => setB.has(g)).length;
}

function pickContrastingPair(pool) {
  const sampleSize = Math.min(pool.length, 10);
  const sample = [...pool].sort(() => Math.random() - 0.5).slice(0, sampleSize);
  let best = null;
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const overlap = genreOverlap(sample[i], sample[j]);
      if (!best || overlap < best.overlap) {
        best = { a: sample[i], b: sample[j], overlap };
      }
    }
  }
  return best ? [best.a, best.b] : [pool[0], pool[1]];
}

function posterCardHTML(movie, side) {
  const art = movie.poster_url
    ? `<div class="poster-art" style="background-image:url('${movie.poster_url}')"></div>`
    : `<div class="poster-art placeholder">
         <div>
           <div class="ph-title">${movie.title}</div>
           <span class="ph-year">${movie.year}</span>
         </div>
       </div>`;
  return `
    <button class="poster-choice" data-side="${side}">
      ${art}
      <div class="poster-meta">
        <div class="p-title">${movie.title}</div>
        <div class="p-sub">${movie.year} · ${movie.genre.slice(0, 2).join(', ')}</div>
      </div>
    </button>
  `;
}

function renderQuizRound() {
  if (quizRoundNum >= QUIZ_ROUNDS || quizPool.length < 2) {
    finishQuiz();
    return;
  }

  document.getElementById('quizRound').textContent = `Round ${quizRoundNum + 1} of ${QUIZ_ROUNDS}`;

  let pair;
  if (quizRoundNum === 0) {
    const inception = quizPool.find(m => m.title === 'Inception');
    const samurai = quizPool.find(m => m.title === 'Seven Samurai');
    pair = (inception && samurai) ? [inception, samurai] : pickContrastingPair(quizPool);
  } else {
    pair = pickContrastingPair(quizPool);
  }

  const container = document.getElementById('quizPair');
  container.innerHTML =
    posterCardHTML(pair[0], 'left') +
    '<div class="quiz-vs">VS</div>' +
    posterCardHTML(pair[1], 'right');
  container.dataset.leftId = movieId(pair[0]);
  container.dataset.rightId = movieId(pair[1]);

  container.querySelectorAll('.poster-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const side = btn.dataset.side;
      const chosen = side === 'left' ? pair[0] : pair[1];
      const rejected = side === 'left' ? pair[1] : pair[0];
      recordPick(chosen, rejected);

      quizUsedIds.add(movieId(pair[0]));
      quizUsedIds.add(movieId(pair[1]));
      quizPool = quizPool.filter(m => !quizUsedIds.has(movieId(m)));

      quizRoundNum++;
      renderQuizRound();
    });
  });
}

function recordPick(chosen, rejected) {
  const rejectedOnly = rejected.genre.filter(g => !chosen.genre.includes(g));
  chosen.genre.forEach(g => { preferences.genre[g] = (preferences.genre[g] || 0) + 2; });
  rejectedOnly.forEach(g => { preferences.genre[g] = (preferences.genre[g] || 0) - 1; });
  const chosenDecade = decadeOf(chosen);
  preferences.decade[chosenDecade] = (preferences.decade[chosenDecade] || 0) + 1;
}

function scoreMovie(m) {
  const genreScore = m.genre.reduce((sum, g) => sum + (preferences.genre[g] || 0), 0);
  const decadeScore = (preferences.decade[decadeOf(m)] || 0) * 0.5;
  const qualityNudge = m.rating * 0.1;
  return genreScore + decadeScore + qualityNudge;
}

function finishQuiz() {
  document.getElementById('quizCard').hidden = true;

  const candidates = MOVIES.filter(m => !quizUsedIds.has(movieId(m)));
  const hasSignal = Object.values(preferences.genre).some(v => v !== 0);

  const recommended = hasSignal
    ? [...candidates].sort((a, b) => scoreMovie(b) - scoreMovie(a)).slice(0, 10)
    : topRated(candidates, 10);

  const list = document.getElementById('quizResultsList');
  list.innerHTML = '';
  recommended.forEach(m => {
    const card = document.createElement('div');
    card.className = 'ticket';
    card.innerHTML = `
      <div class="t-title">${m.title}</div>
      <div class="t-meta">${m.director} · ${m.year} · ${m.genre.join(', ')}</div>
      <div class="t-rating">★ ${m.rating.toFixed(1)}</div>
    `;
    list.appendChild(card);
  });

  document.getElementById('quizResults').hidden = false;
}

function startQuiz() {
  quizPool = [...MOVIES];
  quizUsedIds = new Set();
  quizRoundNum = 0;
  preferences = { genre: {}, decade: {} };
  document.getElementById('quizCard').hidden = false;
  document.getElementById('quizResults').hidden = true;
  renderQuizRound();
}

function initQuiz() {
  startQuiz();
  document.getElementById('skipQuiz').addEventListener('click', () => {
    showMainSite();
  });
}

loadData().catch(err => {
  document.getElementById('results').innerHTML =
    `<div class="empty-state">Couldn't load the dataset (${err.message}). Run a local server — see README.md.</div>`;
});
