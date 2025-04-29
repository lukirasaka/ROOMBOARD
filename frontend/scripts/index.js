const api_base = location.origin;
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const toggle = document.getElementById('toggle');
  const formTitle = document.getElementById('form-title');
  const repeatContainer = document.getElementById('repeat-container');

  const savedTheme = localStorage.getItem('theme') || 'theme-notes';
  document.body.className = savedTheme;
  document.getElementById('theme-toggle').textContent = savedTheme === 'theme-dark' ? '☀️' : '🌙';

  const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.onclick = () => {
    const newTheme = document.body.className === 'theme-dark' ? 'theme-notes' : 'theme-dark';
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'theme-dark' ? '☀️' : '🌙';
  };
  themeToggle.textContent = savedTheme === 'theme-dark' ? '☀️' : '🌙';
}

  let isRegistering = false;

  toggle.addEventListener('click', () => {
    isRegistering = !isRegistering;
    if (isRegistering) {
      formTitle.textContent = 'Registrace';
      repeatContainer.style.display = 'block';
      toggle.textContent = 'Máš účet? Přihlásit se';
    } else {
      formTitle.textContent = 'Přihlášení';
      repeatContainer.style.display = 'none';
      toggle.textContent = 'Nemáš účet? Registrovat se';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const repeat = document.getElementById('repeat')?.value.trim();

    if (!username || !password) {
      showToast('Vyplň všechny údaje!', 'error');
      return;
    }

    if (isRegistering) {
      if (!repeat) {
        showToast('Zopakuj prosím heslo.', 'error');
        return;
      }

      if (password !== repeat) {
        showToast('Hesla se neshodují.', 'error');
        return;
      }

      try {
        const res = await fetch(`${api_base}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          showToast(data.error || 'Chyba při registraci.', 'error');
          return;
        }

        showToast('Registrace úspěšná!', 'success');
        setTimeout(() => {
          localStorage.setItem('username', username);
          window.location.href = 'main.html';
        }, 1500);

      } catch (err) {
        console.error('Chyba při registraci:', err);
        showToast('Chyba serveru při registraci.', 'error');
      }

    } else {
      try {
        const res = await fetch(`${api_base}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          showToast(data.error || 'Neplatné přihlašovací údaje.', 'error');
          return;
        }

        showToast('Přihlášení úspěšné!', 'success');
        setTimeout(() => {
          localStorage.setItem('username', username);
          window.location.href = 'main.html';
        }, 1500);

      } catch (err) {
        console.error('Chyba při přihlášení:', err);
        showToast('Chyba serveru při přihlášení.', 'error');
      }
    }
  });
});