<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Emisor - Panel de Control</title>
@vite(['resources/css/app.css','resources/js/app.js'])
<style>
* { box-sizing: border-box; }
body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
    min-height: 100vh;
    padding: 40px 20px;
    margin: 0;
}
.wrap { max-width: 800px; margin: 0 auto; }
.card {
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
    padding: 40px;
    border: 1px solid rgba(255,255,255,0.5);
}
.header {
    text-align: center;
    margin-bottom: 36px;
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
.badge {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 12px;
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
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
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
}
.alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
}
.form-group { margin-bottom: 24px; }
.form-group label {
    display: block;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    font-size: 0.95rem;
}
.form-group input,
.form-group textarea {
    width: 100%;
    padding: 14px 18px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    background: #fafafa;
}
.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}
.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
}
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: 0.7; cursor: not-allowed; }
.footer {
    text-align: center;
    margin-top: 28px;
    color: #9ca3af;
    font-size: 0.9rem;
}
.footer code {
    background: #f3f4f6;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: 'Monaco', monospace;
    font-size: 0.85rem;
}
.presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}
.preset-btn {
    padding: 8px 16px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #4b5563;
    cursor: pointer;
    transition: all 0.2s;
}
.preset-btn:hover {
    background: #e5e7eb;
    border-color: #d1d5db;
}
</style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <div class="header">
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
    const styleInput = document.getElementById('newStyle');
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            styleInput.value = btn.dataset.style;
            styleInput.focus();
        });
    });

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