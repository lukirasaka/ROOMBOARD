const api_base = location.origin;
let currentOffsetWeeks = 0; // 0 = aktuální týden

document.addEventListener('DOMContentLoaded', async () => {
  const username = localStorage.getItem('username');
  const tableId = localStorage.getItem('tableId');

  if (!username || !tableId) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('logged-user').textContent = username;
  document.getElementById('back').onclick = () => {
    window.location.href = 'tables.html';
  };

  const themeBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  applyTheme(savedTheme);

  themeBtn.onclick = () => {
    const next = document.body.className === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    applyTheme(next);
  };

  document.getElementById('prev-week').onclick = () => {
    currentOffsetWeeks -= 1;
    generateSchedule();
  };

  document.getElementById('next-week').onclick = () => {
    currentOffsetWeeks += 1;
    generateSchedule();
  };

  await generateSchedule();
});

function applyTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
  document.getElementById('theme-toggle').textContent = theme === 'theme-dark' ? '☀️' : '🌙';
}

function isDateInWeek(date, offsetWeeks = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetWeeks * 7);

  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return date >= startOfWeek && date <= endOfWeek;
}

async function generateSchedule() {
  try {
    const tableId = localStorage.getItem('tableId');
    const res = await fetch(`${api_base}/tables/${tableId}/entries`);
    const data = await res.json();

    document.querySelectorAll('.schedule-day').forEach(day => day.innerHTML = '');

    data.entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'task-card schedule-task';
      card.style.marginBottom = '0.5em';

      // Hlavní název
      const title = document.createElement('strong');
      title.textContent = entry.content;
      card.appendChild(title);

      // Popis (skrytý, objeví se na hover)
      if (entry.priority || entry.due_date) {
        const desc = document.createElement('div');
        desc.className = 'task-desc';
        desc.style.display = 'none'; // skrytý

        let descriptionText = '';
        if (entry.priority) descriptionText += `🎯 Priorita: ${entry.priority}<br>`;
        if (entry.due_date) descriptionText += `📅 Deadline: ${new Date(entry.due_date).toLocaleDateString()}`;

        desc.innerHTML = descriptionText;
        card.appendChild(desc);

        // Hover efekt: zobrazit popis
        card.addEventListener('mouseenter', () => {
          desc.style.display = 'block';
        });
        card.addEventListener('mouseleave', () => {
          desc.style.display = 'none';
        });
      }

      if (entry.done) {
        card.style.opacity = '0.6';
        card.style.textDecoration = 'line-through';
      }

      if (entry.due_date) {
        const dueDate = new Date(entry.due_date);

        if (isDateInWeek(dueDate, currentOffsetWeeks)) {
          const dayOfWeek = dueDate.getDay();
          const dayDiv = document.querySelector(`.schedule-day[data-day="${dayOfWeek}"]`);
          if (dayDiv) {
            dayDiv.appendChild(card);
          }
        }
      }
    });

    updateWeekLabel();
  } catch (err) {
    console.error('Chyba při načítání harmonogramu:', err);
  }
}

function updateWeekLabel() {
  const now = new Date();
  now.setDate(now.getDate() + currentOffsetWeeks * 7);

  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const options = { day: '2-digit', month: '2-digit' };

  const label = `${startOfWeek.toLocaleDateString('cs-CZ', options)} - ${endOfWeek.toLocaleDateString('cs-CZ', options)}`;
  document.getElementById('week-label').textContent = label;
}