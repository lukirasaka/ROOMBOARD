const api_base = location.origin;
const username = localStorage.getItem('username');
document.addEventListener('DOMContentLoaded', async () => {
  const tableId = localStorage.getItem('tableId');

  if (!username || !tableId) {
    showToast('Chybí identifikace tabulky nebo uživatele.', 'error');
    window.location.href = 'main.html';
    return;
  }

  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  document.body.className = savedTheme;
  document.getElementById('theme-toggle').textContent = savedTheme === 'theme-dark' ? '☀️' : '🌙';

  document.getElementById('logged-user').textContent = username;
  document.getElementById('back').onclick = () => {
    window.location.href = 'main.html';
  };

  document.getElementById('filter-priority').onchange =
  document.getElementById('sort-mode').onchange = fetchEntries;

  document.getElementById('filter-undone-toggle')?.addEventListener('click', () => {
    const isActive = document.getElementById('filter-undone-toggle').classList.toggle('active');
    document.getElementById('filter-undone-toggle').textContent = isActive ? '❌ Všechny úkoly' : '✅ Pouze nedokončené';
    fetchEntries();
  });

  document.getElementById('show-schedule-btn').onclick = () => {
    window.location.href = 'schedule.html';
  };

  document.getElementById('invite-btn')?.addEventListener('click', async () => {
    const receiver = await showInputPrompt('Zadej jméno uživatele, kterého chceš pozvat:');
    if (!receiver) return;
  
    try {
      const res = await fetch('${api_base}/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUsername: username,
          receiverUsername: receiver,
          tableId: localStorage.getItem('tableId')
        })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        showToast('✅ Pozvánka odeslána');
      } else {
        showToast('❌ ' + (data.error || 'Nepodařilo se pozvat uživatele'), 'error');
      }
    } catch (err) {
      console.error('Chyba při odesílání pozvánky:', err);
      showToast('Nepodařilo se odeslat pozvánku.', 'error');
    }
  });
  
  // Funkce pro vlastní input box místo prompt()
  async function showInputPrompt(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center; z-index: 1000;
      `;
  
      const modal = document.createElement('div');
      modal.style = `
        background: ${document.body.className === 'theme-dark' ? '#2b2b2b' : '#fff8c6'};
        color: ${document.body.className === 'theme-dark' ? '#eee' : '#222'};
        padding: 2em; border-radius: 12px; text-align: center;
        font-family: 'Patrick Hand', cursive;
      `;
  
      const label = document.createElement('p');
      label.textContent = message;
  
      const input = document.createElement('input');
      input.type = 'text';
      input.style = `
        width: 90%; padding: 0.5em; margin: 1em 0;
        border-radius: 8px; border: 1px solid #aaa;
        background: ${document.body.className === 'theme-dark' ? '#555' : '#fff'};
        color: ${document.body.className === 'theme-dark' ? '#eee' : '#000'};
      `;
  
      const buttons = document.createElement('div');
      buttons.style = 'display: flex; justify-content: space-around;';
  
      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Zrušit';
  
      const btnStyle = `
        padding: 0.5em 1em; border-radius: 8px; border: 1px solid #aaa; cursor: pointer;
      `;
      okBtn.style = btnStyle;
      cancelBtn.style = btnStyle;
  
      if (document.body.className === 'theme-dark') {
        okBtn.style.backgroundColor = '#3a5'; okBtn.style.color = '#fff';
        cancelBtn.style.backgroundColor = '#a33'; cancelBtn.style.color = '#fff';
      } else {
        okBtn.style.backgroundColor = '#c4f0c5'; okBtn.style.color = '#000';
        cancelBtn.style.backgroundColor = '#f0c4c4'; cancelBtn.style.color = '#000';
      }
  
      okBtn.onclick = () => { document.body.removeChild(overlay); resolve(input.value.trim()); };
      cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
  
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      modal.appendChild(label);
      modal.appendChild(input);
      modal.appendChild(buttons);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
  
      input.focus();
    });
  }
  
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = document.body.className;
    const next = current === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    document.body.className = next;
    localStorage.setItem('theme', next);
    document.getElementById('theme-toggle').textContent = next === 'theme-dark' ? '☀️' : '🌙';
  });
  
  // Nastavit ikonu motivu při načtení
  document.getElementById('theme-toggle').textContent = document.body.className === 'theme-dark' ? '☀️' : '🌙';

  await fetchEntries();
  await checkIfOwner();
});

// Načíst úkoly
async function fetchEntries() {
  const tableId = localStorage.getItem('tableId');
  try {
    const res = await fetch(`${api_base}/tables/${tableId}/entries`);
    const data = await res.json();
    const list = document.getElementById('entry-list');
    list.innerHTML = '';

    const selectedPriority = document.getElementById('filter-priority').value;
    const onlyUndone = document.getElementById('filter-undone-toggle')?.classList.contains('active');
    const sortMode = document.getElementById('sort-mode').value;

    let filtered = data.entries;
    if (selectedPriority) filtered = filtered.filter(e => e.priority === selectedPriority);
    if (onlyUndone) filtered = filtered.filter(e => !e.done);

    filtered.sort((a, b) => {
      if (sortMode === 'due') return new Date(a.due_date || Infinity) - new Date(b.due_date || Infinity);
      return new Date(a.created_at) - new Date(b.created_at);
    });

    for (const entry of filtered) {
      const li = document.createElement('li');
      li.className = 'task-card';
      if (entry.done) li.classList.add('done');

      // Přidání tlačítka na přepnutí dokončení
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-done-button';
      toggleBtn.textContent = entry.done ? '↩️ Vrátit jako nedokončený' : '✅ Označit jako hotový';
      toggleBtn.style.float = 'right';
      toggleBtn.style.marginLeft = '1em';

      toggleBtn.onclick = async () => {
        await fetch(`${api_base}/entries/${entry.id}/toggle`, { method: 'POST' });
        entry.done = !entry.done;
        li.classList.toggle('done', entry.done);
        toggleBtn.textContent = entry.done ? '↩️ Vrátit jako nedokončený' : '✅ Označit jako hotový';
      };

      li.appendChild(toggleBtn);

      const header = document.createElement('div');
      header.className = 'task-header';
      header.innerHTML = `<strong>Úkol:</strong> ${entry.content}`;
      li.appendChild(header);

      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.innerHTML = `👤 ${entry.username} &nbsp;&nbsp; 
        ${entry.due_date ? `📅 Do: ${new Date(entry.due_date).toLocaleDateString()} &nbsp;&nbsp;` : ''}
        ${entry.priority ? `🎯 Priorita: ${entry.priority}` : ''}`;
      li.appendChild(meta);

      const commentSection = document.createElement('div');
      commentSection.className = 'comment-box';

      const commentList = document.createElement('ul');
      commentSection.appendChild(commentList);

      const commentForm = document.createElement('form');
      commentForm.innerHTML = `
        <input type="text" placeholder="Přidat komentář…" required />
        <button type="submit">💬</button>
      `;
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = commentForm.querySelector('input');
        const content = input.value.trim();
        if (!content) return;

        try {
          const res = await fetch(`${api_base}/entries/${entry.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, content })
          });

          const newComment = await res.json();
          const commentItem = document.createElement('li');
          commentItem.innerHTML = `<span class="comment-meta">${username}:</span> ${content}`;

          const delBtn = document.createElement('button');
          delBtn.textContent = '❌';
          delBtn.style.marginLeft = '1em';
          delBtn.onclick = async () => {
            const confirmDel = await showConfirm('Opravdu smazat komentář?');
            if (!confirmDel) return;

            await fetch(`${api_base}/comments/${newComment.id}`, { method: 'DELETE' });
            commentItem.remove();
            showToast('Komentář odstraněn.', 'success');
          };

          commentItem.appendChild(delBtn);
          commentList.appendChild(commentItem);
          input.value = '';
        } catch (err) {
          console.error('Chyba při přidávání komentáře:', err);
          showToast('Chyba při přidávání komentáře.', 'error');
        }
      });

      commentSection.appendChild(commentForm);
      li.appendChild(commentSection);

      // Načíst existující komentáře
      const resCom = await fetch(`${api_base}/entries/${entry.id}/comments`);
      const commentData = await resCom.json();

      commentData.comments.forEach(c => {
        const commentItem = document.createElement('li');
        commentItem.innerHTML = `<span class="comment-meta">${c.username}:</span> ${c.content}`;

        if (c.username === username) {
          const delBtn = document.createElement('button');
          delBtn.textContent = '❌';
          delBtn.style.marginLeft = '1em';
          delBtn.onclick = async () => {
            const confirmDel = await showConfirm('Opravdu smazat komentář?');
            if (!confirmDel) return;

            await fetch(`${api_base}/comments/${c.id}`, { method: 'DELETE' });
            fetchEntries();
            showToast('Komentář odstraněn.', 'success');
          };
          commentItem.appendChild(delBtn);
        }

        commentList.appendChild(commentItem);
      });

      document.getElementById('entry-list').appendChild(li);
    }
  } catch (err) {
    console.error('Chyba při načítání úkolů:', err);
    showToast('Chyba při načítání úkolů.', 'error');
  }
}

// Zkontrolovat, jestli je uživatel vlastník tabulky
async function checkIfOwner() {
  const tableId = localStorage.getItem('tableId');
  try {
    const res = await fetch(`${api_base}/table/${tableId}`);
    const data = await res.json();
    const table = data.table;

    const userRes = await fetch(`${api_base}/user-id?username=${username}`);
    const userData = await userRes.json();

    if (userData.id === table.owner_id) {
      document.getElementById('invite-btn').style.display = 'inline-block';
      document.getElementById('archive-btn').style.display = 'inline-block';
      document.getElementById('show-archive-btn').style.display = 'inline-block';
    } else {
      document.getElementById('invite-btn').style.display = 'none';
      document.getElementById('archive-btn').style.display = 'none';
      document.getElementById('show-archive-btn').style.display = 'none';
    }
  } catch (err) {
    console.error('Chyba při ověřování vlastnictví:', err);
  }
}

// Archivace hotových úkolů
document.getElementById('archive-btn')?.addEventListener('click', async () => {
  const confirmArchive = await showConfirm('Opravdu chceš archivovat všechny hotové úkoly?');
  if (!confirmArchive) return;

  try {
    await fetch(`${api_base}/tables/${localStorage.getItem('tableId')}/archive-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: localStorage.getItem('username') })
    });
    showToast('Hotové úkoly archivovány!', 'success');
    fetchEntries();
  } catch (err) {
    console.error('Chyba při archivaci:', err);
    showToast('Chyba při archivaci úkolů.', 'error');
  }
});

// Otevřít archiv
document.getElementById('show-archive-btn')?.addEventListener('click', () => {
  window.location.href = 'archive.html';
});

// Přidávání úkolu
document.getElementById('new-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('content').value.trim();
  const due_date = document.getElementById('due-date').value;
  const priority = document.getElementById('priority').value;
  if (!content) return;

  try {
    await fetch(`${api_base}/tables/${localStorage.getItem('tableId')}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: localStorage.getItem('username'), content, due_date, priority })
    });
    document.getElementById('content').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('priority').value = '';
    await fetchEntries();
    showToast('Úkol přidán.', 'success');
  } catch (err) {
    console.error('Chyba při přidávání úkolu:', err);
    showToast('Chyba při přidávání úkolu.', 'error');
  }
});