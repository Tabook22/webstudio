# Web Studio · استوديو الويب

A bilingual teaching studio for designing a real website. Students drag blocks onto the page, edit the HTML, CSS and JavaScript, and the work is stored in SQLite.

## Stack

- **React** — the studio interface
- **FastAPI** — the Python API
- **SQLite** — websites, images, and mission progress

A download is a normal website folder:

```
my-website/
  index.html
  style.css
  script.js
  images/…
```

## Run it

From the project folder, in two terminals:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Publish

The same project is on GitHub at https://github.com/Tabook22/webstudio and is served at https://nasserdiary.com/webstudio.

On your computer, keep using `npm run dev`. The public copy is built with the `/webstudio` path:

```powershell
cd frontend
$env:VITE_BASE = "/webstudio/"
npm run build
```

On the server, the API listens on 127.0.0.1:8011. Student websites stay in `/home/nasser/webstudio-data` and are not replaced when the code is updated.

The first time the public address is connected, run this once and type the server password:

```bash
ssh nasser@76.13.243.173
sudo bash /home/nasser/webstudio/deploy/enable-public-url.sh
```

After that, a new version is: commit, `git push`, then on the server `bash /home/nasser/webstudio/deploy/install-on-server.sh`.

`npm run build` writes the interface to `frontend/dist`. If that folder exists, the API also serves it at http://localhost:8000.

## What students can do

- Drag headings, text, lists, tables, images, layout, forms, and HTML5 elements onto a live page
- Edit the real `index.html`, `style.css`, and `script.js`, and see the page update
- Preview in phone, tablet, and desktop widths, and open the finished page in a new tab
- Check the page for beginner mistakes
- Apply design kits, upload images, and download a ZIP
- Work through seven missions. Progress and badges are kept in the database
- Switch the studio between English and Arabic

The database file is `backend/data/studio.db`.
