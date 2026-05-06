/**
 * 小程序运行时配置（与 front 的 VITE_API_BASE_URL 对应）。
 * 只写协议 + 主机，不要带路径（如 /api/text/sse）。
 * SSE：apiUrl('/api/text/sse?...')；实时语音：wss://主机/ws/realtime
 *
 * 本地调试：后端 `uvicorn app.main:app --host 0.0.0.0 --port 8000`，此处用本机 HTTP。
 * 开发者工具内需勾选「不校验合法域名、web-view、TLS版本以及HTTPS证书」；
 * 真机调试须改为局域网 IP（如 http://192.168.1.x:8000）且与电脑同网。
 */
module.exports = {
  apiBaseUrl: 'http://172.31.0.13:8000',
};
