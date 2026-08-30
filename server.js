const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const rooms = new Map();

wss.on("connection", (ws) => {
    let room = null;

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "join") {
            room = data.room;

            if (!rooms.has(room)) {
                rooms.set(room, []);
            }

            rooms.get(room).push(ws);

            console.log(`Room ${room} に参加しました`);

            for (const player of rooms.get(room)) {
                if (player !== ws && player.readyState === WebSocket.OPEN) {
                    player.send(JSON.stringify({
                        type: "player-joined"
                    }));
                }
            }

            return;
        }

        if (room && rooms.has(room)) {
            for (const player of rooms.get(room)) {
                if (player !== ws && player.readyState === WebSocket.OPEN) {
                    player.send(JSON.stringify(data));
                }
            }
        }
    });

    ws.on("close", () => {
        if (!room || !rooms.has(room)) return;

        const players = rooms.get(room);
        const index = players.indexOf(ws);

        if (index !== -1) {
            players.splice(index, 1);
        }

        if (players.length === 0) {
            rooms.delete(room);
        }
    });
});

server.listen(3000, () => {
    console.log("ゲームサーバー起動！");
    console.log("http://localhost:3000");
});
