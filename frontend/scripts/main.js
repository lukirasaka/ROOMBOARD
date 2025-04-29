document.addEventListener('DOMContentLoaded', async () => {
  const username = localStorage.getItem('username');

  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  applyTheme(savedTheme);

  document.getElementById('user-name').textContent = username;

  document.getElementById('logout').onclick = () => {
    localStorage.clear();
    window.location.href = 'index.html';
  };

  document.getElementById('join-button').onclick = () => {
    window.location.href = 'join.html';
  };

  document.getElementById('theme-toggle').onclick = () => {
    const next = document.body.className === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    applyTheme(next);
  };

  document.getElementById('theme-toggle').textContent = document.body.className === 'theme-dark' ? '☀️' : '🌙';

  const privacyToggle = document.getElementById('privacy-toggle');
  const isPrivateInput = document.getElementById('is-private');

  privacyToggle.addEventListener('click', () => {
    const active = isPrivateInput.checked = !isPrivateInput.checked;
    privacyToggle.textContent = active ? '🔒 Soukromá tabulka' : '🔓 Veřejná tabulka';
  });

  document.getElementById('create-table-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('table-name').value.trim();
    const type = document.getElementById('table-type').value.trim();
    const password = document.getElementById('table-password').value.trim();
    const privateValue = document.getElementById('is-private').checked;

    if (!name || !type) {
      showToast('Název a typ tabulky jsou povinné.', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:3005/tables/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          password,
          is_private: privateValue,
          ownerUsername: username
        })
      });

      if (res.ok) {
        showToast('Tabulka úspěšně vytvořena!', 'success');
        document.getElementById('table-name').value = '';
        document.getElementById('table-type').value = '';
        document.getElementById('table-password').value = '';
        document.getElementById('is-private').checked = false;
        document.getElementById('privacy-toggle').textContent = '🔓 Veřejná tabulka';
        fetchUserIdAndTables();
      } else {
        const data = await res.json();
        showToast('Chyba: ' + (data.error || 'neznámá chyba.'), 'error');
      }
    } catch (err) {
      console.error('Chyba při vytváření tabulky:', err);
      showToast('Chyba při vytváření tabulky.', 'error');
    }
  });

  await fetchUserIdAndTables();
  await loadInvites();
});

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  document.getElementById('theme-toggle').textContent = theme === 'theme-dark' ? '☀️' : '🌙';
}

let userId = null;

async function fetchUserIdAndTables() {
  const username = localStorage.getItem('username');
  try {
    const res = await fetch(`http://localhost:3005/user-id?username=${username}`);
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error("Nepodařilo se načíst ID uživatele");
    userId = data.id;
    await loadTables();
  } catch (err) {
    console.error("Chyba při získávání uživatele:", err);
    showToast("Nepodařilo se načíst tabulky.", 'error');
  }
}

async function loadTables() {
  const username = localStorage.getItem('username');
  const res = await fetch(`http://localhost:3005/tables?user=${username}`);
  const data = await res.json();
  const list = document.getElementById("table-list");
  list.innerHTML = "";

  data.tables.forEach((table) => {
    const li = document.createElement("li");
    li.textContent = `${table.name} (${table.type})`;

    const openBtn = document.createElement("button");
    openBtn.textContent = "Otevřít";
    openBtn.className = "button";
    openBtn.onclick = () => {
      localStorage.setItem("tableId", table.id);
      window.location.href = "tables.html";
    };
    li.appendChild(openBtn);

    if (table.owner_id === userId) {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ Odstranit";
      deleteBtn.className = "button";
      deleteBtn.onclick = async () => {
        const confirmDelete = await showConfirm(`Opravdu smazat tabulku "${table.name}"?`);
        if (!confirmDelete) return;

        await fetch(`http://localhost:3005/tables/${table.id}`, { method: "DELETE" });
        showToast('Tabulka odstraněna.', 'success');
        loadTables();
      };
      li.appendChild(deleteBtn);
    } else {
      const leaveBtn = document.createElement("button");
      leaveBtn.textContent = "🚪 Opustit";
      leaveBtn.className = "button";
      leaveBtn.onclick = async () => {
        const confirmLeave = await showConfirm(`Opravdu chceš opustit tabulku "${table.name}"?`);
        if (!confirmLeave) return;

        await fetch(`http://localhost:3005/tables/${table.id}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        showToast('Tabulka opuštěna.', 'success');
        loadTables();
      };
      li.appendChild(leaveBtn);
    }

    list.appendChild(li);
  });
}

async function loadInvites() {
  const username = localStorage.getItem('username');
  const res = await fetch(`http://localhost:3005/invites?receiver=${username}`);
  const data = await res.json();
  const list = document.getElementById("invite-list");
  list.innerHTML = "";

  data.invites.forEach((inv) => {
    const li = document.createElement("li");
    li.textContent = `${inv.sender} tě zve do tabulky "${inv.table_name}"`;

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "✅ Přijmout";
    acceptBtn.className = "button";
    acceptBtn.onclick = async () => {
      await fetch(`http://localhost:3005/invites/${inv.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true }),
      });
      showToast('Pozvánka přijata.', 'success');
      loadInvites();
      loadTables();
    };

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "❌ Odmítnout";
    rejectBtn.className = "button";
    rejectBtn.onclick = async () => {
      await fetch(`http://localhost:3005/invites/${inv.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: false }),
      });
      showToast('Pozvánka odmítnuta.', 'success');
      loadInvites();
    };

    li.appendChild(acceptBtn);
    li.appendChild(rejectBtn);
    list.appendChild(li);
  });
}