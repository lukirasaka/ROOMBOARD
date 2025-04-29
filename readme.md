# Spolubydlící-app – API Dokumentace

Spolubydlící-app je webová aplikace určená pro správu společného bydlení více osob.  
Umožňuje uživatelům:

- Zakládat tabulky úkolů (např. nákupy, úklid, rozvrhy)
- Sdílet tabulky s ostatními spolubydlícími přes pozvánky
- Přidávat a spravovat úkoly
- Archivovat dokončené úkoly
- Komunikovat pomocí komentářů u úkolů

Aplikace je postavena na:

- Backend: **Node.js + Express**
- Databáze: **PostgreSQL**
- Frontend: **Čisté HTML, CSS a Vanilla JavaScript**

---

## 🚀 Jak projekt spustit

1. **Klonování projektu:**

bash
git clone <URL projektu>
cd spolubydlici-app

2. **Instalace závislostí**

npm install

3. **Nastavení databáze**

- Připrav si databázi PostgreSQL "spolubydlici"
- Nahraj strukturu tabulek (SQL dump, manuálně)
- Zkontroluj přihlašovací údaje v server.js (případně uprav)

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'spolubydlici',
  password: 'postgres',
  port: 5432,
});

4. **Spuštění serveru**

node server.js

- Server bude dostupný na http://localhost:3005

5. **Přístup k aplikaci**

- Otevři index.html přímo v prohlížeči
- Registruj nový účet nebo se přihlas existujícím
- Vytvoř novou tabulku úkolů nebo se připoj k existující přes pozvánku
- Přidávej úkoly, komentáře a spravuj stav úkolů
- Využij archivaci hotových úkolů pro čistotu tabulky

---

## 🧑‍💻 Uživatelská autentizace

| Metoda | URL | Popis |
|:-------|:----|:-----|
| POST | `/register` | Registrace nového uživatele (username, password) |
| POST | `/login` | Přihlášení uživatele (username, password) |

---

## 📂 Tabulky (Tables)

| Metoda | URL | Popis |
|:-------|:----|:-----|
| POST | `/tables/create` | Vytvořit novou tabulku (název, typ, heslo, privátní/veřejná, vlastník) |
| GET | `/tables` | Načíst všechny tabulky, kde je uživatel členem |
| GET | `/table/:id` | Získat informace o konkrétní tabulce podle ID |
| POST | `/tables/:id/leave` | Opustit tabulku (odstranit se ze členů) |
| DELETE | `/tables/:id` | Smazat celou tabulku (vlastník) |

---

## 📋 Úkoly (Tasks / Entries)

| Metoda | URL | Popis |
|:-------|:----|:-----|
| GET | `/tables/:id/entries` | Načíst úkoly v tabulce |
| POST | `/tables/:id/add` | Přidat nový úkol do tabulky |
| POST | `/entries/:id/toggle` | Přepnout stav úkolu (hotovo/nehotovo) |

---

## 💬 Komentáře

| Metoda | URL | Popis |
|:-------|:----|:-----|
| GET | `/entries/:id/comments` | Načíst komentáře k úkolu |
| POST | `/entries/:id/comments` | Přidat nový komentář k úkolu |
| DELETE | `/comments/:id` | Smazat komentář |

---

## 🗃️ Archivace úkolů

| Metoda | URL | Popis |
|:-------|:----|:-----|
| POST | `/tables/:id/archive-done` | Archivovat všechny hotové úkoly |
| GET | `/tables/:id/archived` | Načíst archivované úkoly v tabulce |
| DELETE | `/archived/:id` | Trvale smazat archivovaný úkol |
| POST | `/archived/:id/restore` | Obnovit archivovaný úkol zpět mezi aktivní |

---

## 📬 Pozvánky

| Metoda | URL | Popis |
|:-------|:----|:-----|
| POST | `/invites` | Poslat pozvánku uživateli do tabulky |
| GET | `/invites?receiver=username` | Načíst pozvánky přijaté uživatelem |
| POST | `/invites/:id/respond` | Přijmout nebo odmítnout pozvánku |

---

## 🔧 Administrace (pro testování)

| Metoda | URL | Popis |
|:-------|:----|:-----|
| GET | `/admin/users` | Načíst všechny uživatele (username + hash hesla) |
| DELETE | `/admin/users/:id` | Smazat uživatele a všechny jeho tabulky |

---

## 📢 Poznámky

- **Autorizace**: Momentálně není ochrana pomocí tokenů → vhodné pro interní/testovací prostředí
- **Hashování hesel**: Hesla ukládána pomocí bcrypt (jednosměrné šifrování)
- **Vazby v DB**: Cizí klíče propojují tabulky jako `tables`, `table_entries`, `table_members`, `comments`, `invites`
- **Bezpečnost**: Pro produkční nasazení je doporučeno přidat ověřování JWT tokenem a správu práv

---