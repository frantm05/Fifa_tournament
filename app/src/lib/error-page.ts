export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8" />
    <title>Stránka se nenačetla</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0d1117; color: #e8edf4; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #9aa7b8; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.75rem 1.25rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; min-height: 44px; }
      .primary { background: #e8edf4; color: #0d1117; }
      .secondary { background: transparent; color: #e8edf4; border-color: #3a4656; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Stránka se nenačetla</h1>
      <p>Něco se pokazilo na naší straně. Zkuste stránku obnovit, nebo se vraťte na úvod.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Zkusit znovu</button>
        <a class="secondary" href="/">Na úvod</a>
      </div>
    </div>
  </body>
</html>`;
}
