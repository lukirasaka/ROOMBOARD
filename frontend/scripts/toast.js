function showToast(message, success = true) {
    const toast = document.createElement('div');
    toast.className = success ? 'toast success' : 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
  
    setTimeout(() => {
      toast.classList.add('visible');
    }, 100);
  
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 2500);
  }

  function showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '1000';
  
      const modal = document.createElement('div');
      modal.style.padding = '2em';
      modal.style.borderRadius = '12px';
      modal.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
      modal.style.textAlign = 'center';
      modal.style.maxWidth = '400px';
      modal.style.fontFamily = `'Quicksand', sans-serif`;
  
      // Nastavení barvy pozadí podle tématu
      if (document.body.className === 'theme-dark') {
        modal.style.background = '#2b2b2b';
        modal.style.color = '#eee';
      } else {
        modal.style.background = '#fff8c6';
        modal.style.color = '#333';
      }
  
      const text = document.createElement('p');
      text.textContent = message;
      text.style.marginBottom = '1.5em';
      modal.appendChild(text);
  
      const buttons = document.createElement('div');
      buttons.style.display = 'flex';
      buttons.style.justifyContent = 'space-around';
  
      // Tlačítka
  const yesBtn = document.createElement('button');
  const noBtn = document.createElement('button');

  yesBtn.textContent = '✅ Ano';
  noBtn.textContent = '❌ Ne';

  yesBtn.style.padding = '0.5em 1em';
  noBtn.style.padding = '0.5em 1em';
  yesBtn.style.borderRadius = noBtn.style.borderRadius = '8px';
  yesBtn.style.border = noBtn.style.border = '1px solid #aaa';
  yesBtn.style.cursor = noBtn.style.cursor = 'pointer';

if (document.body.className === 'theme-dark') {
  yesBtn.style.backgroundColor = '#3a5'; // tmavě zelená
  yesBtn.style.color = '#fff';
  noBtn.style.backgroundColor = '#a33'; // tmavě červená
  noBtn.style.color = '#fff';
} else {
  yesBtn.style.backgroundColor = '#c4f0c5'; // světle zelená
  yesBtn.style.color = '#000';
  noBtn.style.backgroundColor = '#f0c4c4'; // světle červená
  noBtn.style.color = '#000';
}
  
      const cleanup = () => {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleKey);
      };
  
      const handleKey = (e) => {
        if (e.key === 'Enter') {
          yesBtn.click();
        } else if (e.key === 'Escape') {
          noBtn.click();
        }
      };
  
      yesBtn.onclick = () => {
        cleanup();
        resolve(true);
      };
  
      noBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
  
      document.addEventListener('keydown', handleKey);
  
      buttons.appendChild(yesBtn);
      buttons.appendChild(noBtn);
      modal.appendChild(buttons);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }