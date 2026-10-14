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
body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
    min-height: 100vh;
    padding: 40px 20px;
    margin: 0;
}
.wrap { max-width: 900px; margin: 0 auto; }
.header {
    text-align: center;
    margin-bottom: 32px;
}
.header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1a1f36;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
}
.header .subtitle {
    color: #6b7280;
    font-size: 1.1rem;
    font-weight: 400;
}
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-top: 16px;
}
.status-badge.connected {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}
.status-badge.disconnected {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
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
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid rgba(255,255,255,0.5);
    overflow: hidden;
}
.current-message {
    padding: 40px;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #f1f5f9;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.current-message.empty {
    background: #fafafa;
}
.current-message.has-content {
    background: white;
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
    color: #9ca3af;
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
    color: #1a1f36;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.history-header h2::before {
    content: '';
    width: 4px;
    height: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 2px;
}
.clear-btn {
    padding: 10px 20px;
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.clear-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
}
.history-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 400px;
    overflow-y: auto;
}
.history-item {
    background: #fafafa;
    border: 1px solid #f1f5f9;
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
    background: #f5f7fa;
    border-color: #e2e8f0;
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
    color: #6b7280;
    background: #e5e7eb;
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
    background: #ecfdf5;
    color: #065f46;
}
.history-item-content {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #374151;
    white-space: pre-wrap;
    word-wrap: break-word;
    background: white;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #f1f5f9;
}
.empty-history {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
}
.empty-history svg { margin-bottom: 12px; opacity: 0.5; }
.footer {
    text-align: center;
    margin-top: 24px;
    color: #9ca3af;
    font-size: 0.85rem;
}
@media (max-width: 640px) {
    .current-message { padding: 24px; }
    .message-content { padding: 20px; font-size: 1.2rem; }
    .history-section { padding: 24px; }
    .header h1 { font-size: 2rem; }
}
</style>
</head>
<body>
<div class="wrap">
    <div class="header">
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
    const currentMessage = document.getElementById('currentMessage');
    const messageContent = document.getElementById('messageContent');
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    const clearBtn = document.getElementById('clearHistory');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');

    // Cargar historial desde localStorage
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

    // Inicializar historial
    const history = loadHistory();
    renderHistory(history);

    // Mostrar último mensaje si existe
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
            // No limpiar el mensaje actual, solo el historial
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

                    // Actualizar mensaje actual con animación
                    currentMessage.classList.remove('has-content');
                    currentMessage.classList.add('empty');
                    setTimeout(() => {
                        messageContent.textContent = text;
                        messageContent.style.cssText = style;
                        currentMessage.classList.remove('empty');
                        currentMessage.classList.add('has-content');
                    }, 100);

                    // Agregar al historial
                    const now = new Date();
                    const newMsg = {
                        text: text,
                        style: style,
                        time: formatTime(now),
                        timestamp: now.getTime(),
                        isCurrent: true
                    };

                    // Marcar anterior como no actual
                    history.forEach(h => h.isCurrent = false);
                    history.push(newMsg);

                    // Mantener solo últimos 50
                    if (history.length > 50) history.shift();

                    saveHistory(history);
                    renderHistory(history);

                    // SweetAlert toast
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: text ? `Nuevo: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}` : 'Mensaje recibido',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                        background: '#1a1f36',
                        color: '#fff',
                        iconColor: '#667eea'
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