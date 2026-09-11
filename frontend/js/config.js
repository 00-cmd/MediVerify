const isLocal =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

const API_URL = isLocal
    ? "http://127.0.0.1:8000"
    : "https://medverify-backend-52fu.onrender.com";

const QR_FRONTEND_URL = isLocal
    ? "http://127.0.0.1:5500/frontend"
    : "https://medverify-web.onrender.com";