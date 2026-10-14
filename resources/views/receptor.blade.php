<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receptor</title>
@vite(['resources/css/app.css','resources/js/app.js'])
<!-- SweetAlert2 por CDN -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<style>
body { font-family: system-ui, sans-serif; padding: 24px; }
.wrap { max-width: 760px; margin: 0 auto; }
#target-div { padding: 20px; border: 1px dashed #bbb; border-radius: 12px; }
</style>
</head>
<body>
<div class="wrap">
<h1>Receptor</h1>
<div id="target-div">Esperando mensaje...</div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function () {
    const targetDiv = document.getElementById('target-div');

    function listenForEvents() {
        if (window.Echo) {
            window.Echo.channel('style-channel')
                .listen('.RemoteStyleUpdate', (e) => {
                    targetDiv.innerText = e.newText ?? '';
                    targetDiv.style.cssText = e.newStyle ?? '';

                    Swal.fire({
                        toast: false,
                        position: 'center',
                        icon: 'warning',
                        title: e?.newText ? `Nuevo mensaje: ${e.newText}` : 'Nuevo mensaje recibido',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true
                    });
                });
        } else {
            setTimeout(listenForEvents, 100);
        }
    }

    listenForEvents();
});
</script>
</body>
</html>