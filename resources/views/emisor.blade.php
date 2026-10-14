<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Emisor - Panel de Control</title>
@vite(['resources/css/app.css','resources/js/app.js'])
<style>
* { box-sizing: border-box; }

:root {
    /* Light theme (default) */
    --bg-primary: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
    --bg-card: #ffffff;
    --bg-card-hover: #fafafa;
    --bg-input: #fafafa;
    --bg-input-focus: #ffffff;
    --bg-preset: #f3f4f6;
    --bg-preset-hover: #e5e7eb;
    --bg-badge: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --text-primary: #1a1f36;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --text-label: #374151;
    --text-input: #1f2937;
    --border-color: #e5e7eb;
    --border-focus: #667eea;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
    --shadow-md: 0 10px 40px rgba(0,0,0,0.08);
    --shadow-glow: 0 4px 14px rgba(102, 126, 234, 0.4);
    --success-bg: #ecfdf5;
    --success-border: #a7f3d0;
    --success-text: #065f46;
    --error-bg: #fef2f2;
    --error-border: #fecaca;
    --error-text: #991b1b;
    --footer-code-bg: #f3f4f6;
}

[data-theme="dark"] {
    --bg-primary: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --bg-input: #0f172a;
    --bg-input-focus: #1e293b;
    --bg-preset: #334155;
    --bg-preset-hover: #475569;
    --bg-badge: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --text-label: #e2e8f0;
    --text-input: #f1f5f9;
    --border-color: #334155;
    --border-focus: #a855f7;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
    --shadow-md: 0 10px 40px rgba(0,0,0,0.3);
    --shadow-glow: 0 4px 14px rgba(139, 92, 246, 0.4);
    --success-bg: #064e3b;
    --success-border: #065f46;
    --success-text: #a7f3d0;
    --error-bg: #7f1d1d;
    --error-border: #991b1b;
    --error-text: #fca5a5;
    --footer-code-bg: #1e293b;
}

body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg-primary);
    min-height: 100vh;
    padding: 40px 20px;
    margin: 0;
    color: var(--text-primary);
    transition: background 0.3s ease, color 0.3s ease;
}

.wrap { max-width: 800px; margin: 0 auto; }

.card {
    background: var(--bg-card);
    border-radius: 20px;
    box-shadow: var(--shadow-md), var(--shadow-sm);
    padding: 40px;
    border: 1px solid var(--border-color);
    transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.header {
    text-align: center;
    margin-bottom: 36px;
    position: relative;
}

.header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 8px;
    letter-spacing: -0.02em;
}

.header .subtitle {
    color: var(--text-secondary);
    font-size: 1.1rem;
    font-weight: 400;
}

.theme-toggle {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: var(--text-primary);
}

.theme-toggle:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
    transform: scale(1.05);
}

.theme-toggle svg { width: 22px; height: 22px; }

.theme-toggle .sun-icon { display: none; }
[data-theme="dark"] .theme-toggle .sun-icon { display: block; }
[data-theme="dark"] .theme-toggle .moon-icon { display: none; }

.badge {
    display: inline-block;
    background: var(--bg-badge);
    color: white;
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 12px;
    box-shadow: var(--shadow-glow);
}

.alert {
    padding: 16px 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
}

.alert-success {
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success-text);
}

.alert-error {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error-text);
}

.form-group { margin-bottom: 24px; }

.form-group label {
    display: block;
    font-weight: 600;
    color: var(--text-label);
    margin-bottom: 8px;
    font-size: 0.95rem;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 14px 18px;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    background: var(--bg-input);
    color: var(--text-input);
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--border-focus);
    background: var(--bg-input-focus);
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

[data-theme="dark"] .form-group input:focus,
[data-theme="dark"] .form-group textarea:focus {
    box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.15);
}

.form-group textarea {
    min-height: 140px;
    resize: vertical;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
}

.form-row { display: grid; gap: 20px; }

@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }

.btn {
    width: 100%;
    padding: 16px 28px;
    background: var(--bg-badge);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-glow);
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
}

[data-theme="dark"] .btn:hover {
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.5);
}

.btn:active { transform: translateY(0); }
.btn:disabled { opacity: 0.7; cursor: not-allowed; }

.footer {
    text-align: center;
    margin-top: 28px;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.footer code {
    background: var(--footer-code-bg);
    padding: 4px 10px;
    border-radius: 6px;
    font-family: 'Monaco', monospace;
    font-size: 0.85rem;
    border: 1px solid var(--border-color);
}

.presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

.preset-btn {
    padding: 8px 16px;
    background: var(--bg-preset);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 0.85rem;
    color: var(--text-label);
    cursor: pointer;
    transition: all 0.2s;
}

.preset-btn:hover {
    background: var(--bg-preset-hover);
    border-color: var(--border-focus);
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
</style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <div class="header">
            <button class="theme-toggle" id="themeToggle" aria-label="Alternar modo oscuro" title="Alternar tema">
                <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </button>
            <h1>Panel de Emisión</h1>
            <p class="subtitle">Envía mensajes en tiempo real al receptor</p>
            <span class="badge">WebSocket Activo</span>
        </div>

        @if (session('ok'))
        <div class="alert alert-success">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            {{ session('ok') }}
        </div>
        @endif

        @if ($errors->any())
        <div class="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10 7.293 11.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
            {{ $errors->first() }}
        </div>
        @endif

        <form method="POST" action="{{ route('emitir') }}" id="emitForm">
            @csrf
            <div class="form-row">
                <div class="form-group">
                    <label for="newText">Mensaje a transmitir</label>
                    <input type="text" name="newText" id="newText" placeholder="Ej: Ahora atendiendo: A-037" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="newStyle">Estilos CSS (opcional)</label>
                    <textarea name="newStyle" id="newStyle" placeholder="background:#111;color:#fff;padding:24px;border-radius:16px;font-size:28px;text-align:center;"></textarea>
                </div>
            </div>
            <div class="presets" id="presets">
                <button type="button" class="preset-btn" data-style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:40px;border-radius:20px;font-size:32px;text-align:center;font-weight:bold;">Gradiente Violeta</button>
                <button type="button" class="preset-btn" data-style="background:#111;color:#fff;padding:24px;border-radius:16px;font-size:28px;text-align:center;">Modo Oscuro</button>
                <button type="button" class="preset-btn" data-style="background:#fff3cd;color:#856404;padding:24px;border-radius:12px;font-size:24px;text-align:center;border:2px solid #ffc107;">Alerta Amarilla</button>
                <button type="button" class="preset-btn" data-style="background:#d4edda;color:#155724;padding:24px;border-radius:12px;font-size:24px;text-align:center;border:2px solid #28a745;">Éxito Verde</button>
                <button type="button" class="preset-btn" data-style="background:#f8d7da;color:#721c24;padding:24px;border-radius:12px;font-size:24px;text-align:center;border:2px solid #dc3545;">Error Rojo</button>
            </div>
            <button type="submit" class="btn" id="submitBtn">
                <span id="btnText">Enviar Mensaje</span>
                <span id="btnLoader" style="display:none;">Enviando...</span>
            </button>
        </form>

        <div class="footer">
            Abre <code>/receptor</code> en otra pestaña para ver los mensajes en tiempo real
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    function initTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        html.setAttribute('data-theme', theme);
    }

    function toggleTheme() {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

    initTheme();
    themeToggle.addEventListener('click', toggleTheme);

    // Presets
    const styleInput = document.getElementById('newStyle');
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            styleInput.value = btn.dataset.style;
            styleInput.focus();
        });
    });

    // Form loading state
    const form = document.getElementById('emitForm');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', () => {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    });
});
</script>
</body>
</html>