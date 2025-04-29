const api_base = location.origin;
document.addEventListener('DOMContentLoaded', async () => {
  const username = localStorage.getItem('username');

  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  applyTheme(savedTheme);

  document.getElementById('logged-user').textContent = username;
  document.getElementById('back').onclick = () => window.location.href = 'main.html';

  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.onclick = () => {
    const next = document.body.className === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    applyTheme(next);
  };

  await loadTables();
  document.getElementById('search').addEventListener('input', filterTables);
});

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  document.getElementById('theme-toggle').textContent = theme === 'theme-dark' ? '☀️' : '🌙';
}

async function loadTables() {
  try {
    const res = await fetch(`${api_base}/tables/public`);
    const data = await res.json();
    window.allTables = data;
    renderTables(data);
  } catch (err) {
    console.error('Chyba při načítání tabulek:', err);
  }
}

function renderTables(tables) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  tables.forEach(table => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${table.name}</td>
      <td>${table.owner}</td>
      <td>${new Date(table.created_at).toLocaleDateString()}</td>
      <td>${table.members}</td>
    `;
    tr.style.cursor = 'pointer';
    tr.onclick = () => openModal(table);
    tbody.appendChild(tr);
  });
}

function filterTables() {
  const query = document.getElementById('search').value.toLowerCase();
  const filtered = window.allTables.filter(t =>
    t.name.toLowerCase().includes(query) ||
    t.owner.toLowerCase().includes(query)
  );
  renderTables(filtered);
}

function openModal(table) {
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  const input = document.getElementById('modal-password');
  const submitBtn = document.getElementById('modal-join');
  submitBtn.className = 'button';
  const modalName = document.getElementById('modal-name');
  const modalDesc = document.getElementById('modal-description');
  const modalError = document.getElementById('modal-error');

  modalName.textContent = table.name;
  modalDesc.textContent = `Zakladatel: ${table.owner}`;
  input.value = '';
  modalError.textContent = '';

  submitBtn.onclick = async () => {
    const password = input.value.trim();
    try {
      const username = localStorage.getItem('username');
      const res = await fetch(`${api_base}/tables/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: table.id, username, password })
      });

      if (res.ok) {
        showToast('✅ Připojeno k tabulce');
        modal.style.display = 'none';
        setTimeout(() => window.location.href = 'tables.html', 1000);
      } else {
        const errData = await res.json();
        modalError.textContent = errData.error || 'Chyba při připojování.';
      }
    } catch (err) {
      console.error('Chyba při připojování:', err);
    }
  };

  const isDark = document.body.classList.contains('theme-dark');

  // Modal background
  modal.style.display = 'flex';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // průhledné šedé pozadí přes celou obrazovku
  modalContent.style.background = isDark ? '#2b2b2b' : '#fffef8';
  modalContent.style.color = isDark ? '#eee' : '#222';
  modalContent.style.borderRadius = '16px';
  modalContent.style.padding = '2em';
  modalContent.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
  modalContent.style.minWidth = '320px';

  // Input
  input.style.background = isDark ? '#444' : '#fff';
  input.style.color = isDark ? '#eee' : '#333';
  input.style.border = '1px solid #aaa';
  input.style.padding = '0.7em';
  input.style.borderRadius = '10px';
  input.style.fontSize = '1em';
  input.style.marginTop = '1em';
  input.style.width = '90%';

  // Tlačítko
  submitBtn.style.backgroundColor = isDark ? '#555' : '#fffcd5';
  submitBtn.style.color = isDark ? '#eee' : '#222';
  submitBtn.style.border = '1px solid #aaa';
  submitBtn.style.borderRadius = '10px';
  submitBtn.style.padding = '0.6em 1.2em';
  submitBtn.style.marginTop = '1em';
  submitBtn.style.cursor = 'pointer';
}

window.onclick = function(event) {
  const modal = document.getElementById('modal');
  const modalContent = modal.querySelector('.modal-content');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};