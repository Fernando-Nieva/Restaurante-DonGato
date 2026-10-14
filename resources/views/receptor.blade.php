<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receptor - Panel de Visualización</title>
@vite(['resources/css/app.css','resources/js/app.js'])
<!-- SweetAlert2 por CDN -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<style>
* { box-sizing: border-box; }

:root {
    /* Light theme (default) */
    --bg-primary: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
    --bg-card: #ffffff;
    --bg-card-hover: #fafafa;
    --bg-current-empty: #fafafa;
    --bg-current-content: #ffffff;
    --bg-history-item: #fafafa;
    --bg-history-hover: #f5f7fa;
    --bg-history-content: #ffffff;
    --bg-badge: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --bg-badge-hover: 0 8px 24px rgba(102, 126, 234, 0.5);
    --bg-status-connected: #ecfdf5;
    --text-status-connected: #065f46;
    --border-status-connected: #a7f3d0;
    --bg-status-disconnected: #fef2f2;
    --text-status-disconnected: #991b1b;
    --border-status-disconnected: #fecaca;
    --bg-clear-btn: #fef2f2;
    --text-clear-btn: #991b1b;
    --border-clear-btn: #fecaca;
    --bg-clear-hover: #fee2e2;
    --border-clear-hover: #fca5a5;
    --text-primary: #1a1f36;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --text-label: #374151;
    --text-history: #374151;
    --text-placeholder: #9ca3af;
    --text-time: #6b7280;
    --bg-time: #e5e7eb;
    --bg-live-badge: #ecfdf5;
    --text-live-badge: #065f46;
    --border-color: #f1f5f9;
    --border-hover: #e2e8f0;
    --border-card: rgba(255,255,255,0.5);
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
    --shadow-md: 0 10px 40px rgba(0,0,0,0.08);
    --footer-color: #9ca3af;
}

[data-theme="dark"] {
    --bg-primary: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --bg-current-empty: #1e293b;
    --bg-current-content: #1e293b;
    --bg-history-item: #1e293b;
    --bg-history-hover: #334155;
    --bg-history-content: #0f172a;
    --bg-badge: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
    --bg-badge-hover: 0 8px 24px rgba(139, 92, 246, 0.5);
    --bg-status-connected: #064e3b;
    --text-status-connected: #a7f3d0;
    --border-status-connected: #065f46;
    --bg-status-disconnected: #7f1d1d;
    --text-status-disconnected: #fca5a5;
    --border-status-disconnected: #991b1b;
    --bg-clear-btn: #7f1d1d;
    --text-clear-btn: #fca5a5;
    --border-clear-btn: #991b1b;
    --bg-clear-hover: #991b1d;
    --border-clear-hover: #fca5a5;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --text-label: #e2e8f0;
    --text-history: #f1f5f9;
    --text-placeholder: #64748b;
    --text-time: #94a3b8;
    --bg-time: #334155;
    --bg-live-badge: #064e3b;
    --text-live-badge: #a7f3d0;
    --border-color: #334155;
    --border-hover: #475569;
    --border-card: #334155;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
    --shadow-md: 0 10px 40px rgba(0,0,0,0.3);
    --footer-color: #64748b;
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

.wrap { max-width: 900px; margin: 0 auto; }

.header {
    text-align: center;
    margin-bottom: 32px;
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
    background: var(--bg-card);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: var(--text-primary);
}

.theme-toggle:hover {
    background: var(--bg-card-hover);
    border-color: var(--bg-badge);
    transform: scale(1.05);
}

.theme-toggle svg { width: 22px; height: 22px; }

.theme-toggle .sun-icon { display: none; }
[data-theme="dark"] .theme-toggle .sun-icon { display: block; }
[data-theme="dark"] .theme-toggle .moon-icon { display: none; }

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-top: 16px;
    border: 1px solid;
    transition: all 0.3s ease;
}

.status-badge.connected {
    background: var(--bg-status-connected);
    color: var(--text-status-connected);
    border-color: var(--border-status-connected);
}

.status-badge.disconnected {
    background: var(--bg-status-disconnected);
    color: var(--text-status-disconnected);
    border-color: var(--border-status-disconnected);
}

.status-badge .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 2s infinite;
}

.status-badge.disconnected .dot { animation: none; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.main-card {
    background: var(--bg-card);
    border-radius: 20px;
    box-shadow: var(--shadow-md), var(--shadow-sm);
    border: 1px solid var(--border-card);
    overflow: hidden;
    transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.current-message {
    padding: 40px;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--border-color);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.current-message.empty {
    background: var(--bg-current-empty);
}

.current-message.has-content {
    background: var(--bg-current-content);
}

.message-content {
    width: 100%;
    padding: 32px;
    border-radius: 16px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1.5;
    word-wrap: break-word;
    animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.placeholder-text {
    color: var(--text-placeholder);
    font-size: 1.1rem;
    font-weight: 400;
}

.history-section {
    padding: 32px 40px;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
}

.history-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.history-header h2::before {
    content: '';
    width: 4px;
    height: 24px;
    background: var(--bg-badge);
    border-radius: 2px;
}

.clear-btn {
    padding: 10px 20px;
    background: var(--bg-clear-btn);
    color: var(--text-clear-btn);
    border: 1px solid var(--border-clear-btn);
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.clear-btn:hover {
    background: var(--bg-clear-hover);
    border-color: var(--border-clear-hover);
}

.history-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
}

.history-item {
    background: var(--bg-history-item);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 12px;
    transition: all 0.2s;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
}

.history-item:hover {
    background: var(--bg-history-hover);
    border-color: var(--border-hover);
    transform: translateX(4px);
}

.history-item:last-child { margin-bottom: 0; }

.history-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
}

.history-item-time {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-time);
    background: var(--bg-time);
    padding: 4px 10px;
    border-radius: 100px;
    font-variant-numeric: tabular-nums;
}

.history-item-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.history-item-badge.live {
    background: var(--bg-live-badge);
    color: var(--text-live-badge);
}

.history-item-content {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text-history);
    white-space: pre-wrap;
    word-wrap: break-word;
    background: var(--bg-history-content);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}

.empty-history {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
}

.empty-history svg { margin-bottom: 12px; opacity: 0.5; }

.footer {
    text-align: center;
    margin-top: 24px;
    color: var(--footer-color);
    font-size: 0.85rem;
}

@media (max-width: 640px) {
    .current-message { padding: 24px; }
    .message-content { padding: 20px; font-size: 1.2rem; }
    .history-section { padding: 24px; }
    .header h1 { font-size: 2rem; }
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
    <div class="header">
        <button class="theme-toggle" id="themeToggle" aria-label="Alternar modo oscuro" title="Alternar tema">
            <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
        <h1>Panel de Recepción</h1>
        <p class="subtitle">Visualiza mensajes en tiempo real con historial</p>
        <div class="status-badge disconnected" id="statusBadge">
            <span class="dot"></span>
            <span id="statusText">Conectando...</span>
        </div>
    </div>

    <div class="main-card">
        <div class="current-message empty" id="currentMessage">
            <div class="message-content placeholder-text" id="messageContent">Esperando mensaje...</div>
        </div>

        <div class="history-section">
            <div class="history-header">
                <h2>Historial de mensajes</h2>
                <button type="button" class="clear-btn" id="clearHistory">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Limpiar historial
                </button>
            </div>
            <ul class="history-list" id="historyList">
                <li class="empty-history" id="emptyHistory">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6"></path><path d="M9 18h6"></path><path d="M9 6h6"></path></svg>
                    <p>No hay mensajes previos</p>
                    <p style="font-size:0.85rem;margin-top:4px;">Los mensajes aparecerán aquí automáticamente</p>
                </li>
            </ul>
        </div>
    </div>

    <div class="footer">
        Conectado via Laravel Reverb • Los mensajes persisten en el navegador (localStorage)
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
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

    // Resto del código existente
    const currentMessage = document.getElementById('currentMessage');
    const messageContent = document.getElementById('messageContent');
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    const clearBtn = document.getElementById('clearHistory');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');

    function loadHistory() {
        const stored = localStorage.getItem('messageHistory');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    function saveHistory(history) {
        localStorage.setItem('messageHistory', JSON.stringify(history));
    }

    function renderHistory(history) {
        if (history.length === 0) {
            emptyHistory.style.display = 'block';
            return;
        }
        emptyHistory.style.display = 'none';
        historyList.innerHTML = history.map((msg, index) => `
            <li class="history-item" style="animation-delay: ${index * 0.05}s">
                <div class="history-item-header">
                    <span class="history-item-time">${msg.time}</span>
                    <span class="history-item-badge ${msg.isCurrent ? 'live' : ''}">${msg.isCurrent ? 'En vivo' : 'Historial'}</span>
                </div>
                <div class="history-item-content">${escapeHtml(msg.text)}</div>
            </li>
        `).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(date) {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    const history = loadHistory();
    renderHistory(history);

    if (history.length > 0) {
        const last = history[history.length - 1];
        messageContent.textContent = last.text;
        messageContent.style.cssText = last.style || '';
        currentMessage.classList.remove('empty');
        currentMessage.classList.add('has-content');
    }

    clearBtn.addEventListener('click', () => {
        if (confirm('¿Eliminar todo el historial?')) {
            localStorage.removeItem('messageHistory');
            history.length = 0;
            renderHistory([]);
        }
    });

    function listenForEvents() {
        if (window.Echo) {
            statusBadge.classList.remove('disconnected');
            statusBadge.classList.add('connected');
            statusText.textContent = 'Conectado';

            window.Echo.channel('style-channel')
                .listen('.RemoteStyleUpdate', (e) => {
                    const text = e.newText ?? '';
                    const style = e.newStyle ?? '';

                    currentMessage.classList.remove('has-content');
                    currentMessage.classList.add('empty');
                    setTimeout(() => {
                        messageContent.textContent = text;
                        messageContent.style.cssText = style;
                        currentMessage.classList.remove('empty');
                        currentMessage.classList.add('has-content');
                    }, 100);

                    const now = new Date();
                    const newMsg = {
                        text: text,
                        style: style,
                        time: formatTime(now),
                        timestamp: now.getTime(),
                        isCurrent: true
                    };

                    history.forEach(h => h.isCurrent = false);
                    history.push(newMsg);

                    if (history.length > 50) history.shift();

                    saveHistory(history);
                    renderHistory(history);

                    // SweetAlert toast con colores adaptativos
                    const isDark = html.getAttribute('data-theme') === 'dark';
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: text ? `Nuevo: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}` : 'Mensaje recibido',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                        background: isDark ? '#1e293b' : '#1a1f36',
                        color: '#fff',
                        iconColor: isDark ? '#a855f7' : '#667eea'
                    });
                });

            window.Echo.connector.pusher.connection.bind('connected', () => {
                statusBadge.classList.remove('disconnected');
                statusBadge.classList.add('connected');
                statusText.textContent = 'Conectado';
            });

            window.Echo.connector.pusher.connection.bind('disconnected', () => {
                statusBadge.classList.remove('connected');
                statusBadge.classList.add('disconnected');
                statusText.textContent = 'Desconectado';
            });

        } else {
            setTimeout(listenForEvents, 200);
        }
    }

    listenForEvents();
});
</script>
</body>
</html>