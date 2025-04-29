document.addEventListener('DOMContentLoaded', async () => {
  const username = localStorage.getItem('username');
  const tableId = localStorage.getItem('tableId');

  if (!username || !tableId) {
    showToast('Chybí přihlášení.', 'error');
    window.location.href = 'index.html';
    return;
  }

  // Nastavení uloženého motivu při načtení
  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  document.body.className = savedTheme;
  document.getElementById('theme-toggle').textContent = savedTheme === 'theme-dark' ? '☀️' : '🌙';

  document.getElementById('theme-toggle').onclick = () => {
    const current = document.body.className;
    const next = current === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    document.body.className = next;
    localStorage.setItem('theme', next);
    document.getElementById('theme-toggle').textContent = next === 'theme-dark' ? '☀️' : '🌙';
  };

  document.getElementById('logged-user').textContent = username;
  document.getElementById('back').onclick = () => {
    window.location.href = 'tables.html';
  };

  await loadArchive();
});

async function loadArchive() {
  const tableId = localStorage.getItem('tableId');
  try {
    const res = await fetch(`http://localhost:3005/tables/${tableId}/archived`);
    const data = await res.json();
    const list = document.getElementById('archive-list');
    list.innerHTML = '';

    if (data.entries.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '📭 Archiv je prázdný.';
      emptyMessage.className = 'empty-message';
      list.appendChild(emptyMessage);
      return;
    }

    data.entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'task-card';

      li.innerHTML = `
        <div class="task-header">${entry.content}</div>
        <div class="task-meta">
          Přidal: ${entry.username} &nbsp; | &nbsp;
          Vytvořeno: ${new Date(entry.created_at).toLocaleDateString()} &nbsp; | &nbsp;
          Archivováno: ${new Date(entry.archived_at).toLocaleDateString()}
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'archive-actions';

      const restoreBtn = document.createElement('button');
      restoreBtn.textContent = '♻️ Obnovit';
      restoreBtn.className = 'restore-button';
      restoreBtn.onclick = async () => {
        const confirmed = await showConfirm('Opravdu chceš obnovit tento úkol zpět do aktivní tabulky?');
        if (!confirmed) return;

        try {
          await fetch(`http://localhost:3005/archived/${entry.id}/restore`, { method: 'POST' });
          showToast('Úkol obnoven.', 'success');
          await loadArchive();
        } catch (err) {
          console.error('Chyba při obnově úkolu:', err);
          showToast('Nepodařilo se obnovit.', 'error');
        }
      };

      document.getElementById('clear-archive').onclick = async () => {
        const confirmed = await showConfirm('Opravdu chceš nenávratně vymazat celý archiv?');
        if (!confirmed) return;
      
        try {
          const tableId = localStorage.getItem('tableId');
          await fetch(`http://localhost:3005/archived/${tableId}/clear`, { method: 'DELETE' });
          showToast('Archiv byl vymazán.', 'success');
          await loadArchive();
        } catch (err) {
          console.error('Chyba při mazání archivu:', err);
          showToast('Nepodařilo se vymazat archiv.', 'error');
        }
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️ Smazat navždy';
      deleteBtn.className = 'delete-button';
      deleteBtn.onclick = async () => {
        const confirmed = await showConfirm('Opravdu chceš tento úkol nenávratně smazat?');
        if (!confirmed) return;

        try {
          await fetch(`http://localhost:3005/archived/${entry.id}`, { method: 'DELETE' });
          showToast('Úkol nenávratně smazán.', 'success');
          await loadArchive();
        } catch (err) {
          console.error('Chyba při mazání úkolu:', err);
          showToast('Nepodařilo se smazat.', 'error');
        }
      };

      actions.appendChild(restoreBtn);
      actions.appendChild(deleteBtn);
      li.appendChild(actions);

      list.appendChild(li);
    });
  } catch (err) {
    console.error('Chyba při načítání archivu:', err);
    showToast('Nepodařilo se načíst archiv.', 'error');
  }
}