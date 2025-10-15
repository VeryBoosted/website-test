import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static("public"));
app.use(express.json());

let intensity = 0;
const MAX_INTENSITY = 1000;
const INCREASE_STEP = 40;

const clients = new Map(); // Map of ws -> username

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "setName") {
        const username = data.username || `User_${Math.floor(Math.random() * 1000)}`;
        clients.set(ws, username);
        ws.send(JSON.stringify({ type: "init", username, intensity }));
        broadcast({ type: "notice", message: `${username} joined.` });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });

  ws.on("close", () => {
    const username = clients.get(ws);
    clients.delete(ws);
    if (username) {
      broadcast({ type: "notice", message: `${username} left.` });
    }
  });
});

app.post("/increase", (req, res) => {
  const { username } = req.body;
  intensity = Math.min(intensity + INCREASE_STEP, MAX_INTENSITY);
  broadcast({ type: "update", intensity, user: username });
  res.sendStatus(200);
});

server.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
