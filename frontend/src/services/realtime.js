import { io } from "socket.io-client";
let socket;
export function getRealtime() {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
export function closeRealtime() {
  socket?.disconnect();
  socket = null;
}
