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
    let playerName = "名無し";

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        // ====================
        // ルーム参加
        // ====================
        if (data.type === "join") {
            room = data.room;

            if (data.name) {
                playerName = String(data.name).substring(0, 20);
            }

            if (!rooms.has(room)) {
                rooms.set(room, []);
            }

            rooms.get(room).push(ws);

            console.log(`Room ${room} に参加しました`);

            for (const player of rooms.get(room)) {
                if (
                    player !== ws &&
                    player.readyState === WebSocket.OPEN
                ) {
                    player.send(JSON.stringify({
                        type: "player-joined"
                    }));
                }
            }

            return;
        }

        // ====================
        // チャット
        // ====================
        if (data.type === "chat") {

            const text = String(data.text || "")
                .trim()
                .substring(0, 200);

            if (!text) {
                return;
            }

            const chatMessage = {
                type: "chat",
                name: playerName,
                text: text
            };

            if (room && rooms.has(room)) {

                for (const player of rooms.get(room)) {

                    if (
                        player.readyState === WebSocket.OPEN
                    ) {
                        player.send(
                            JSON.stringify(chatMessage)
                        );
                    }

                }
            }

            return;
        }

        // ====================
        // その他のゲーム通信
        // ====================
        if (room && rooms.has(room)) {

            for (const player of rooms.get(room)) {

                if (
                    player !== ws &&
                    player.readyState === WebSocket.OPEN
                ) {
                    player.send(
                        JSON.stringify(data)
                    );
                }

            }
        }
    });

    // ====================
    // 切断
    // ====================

    ws.on("close", () => {

        if (!room || !rooms.has(room)) {
            return;
        }

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

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`ゲームサーバー起動！ PORT: ${PORT}`);
});
