const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const rooms = new Map();

const MAX_PLAYERS = 20;
const GAME_TIME = 60;
const START_COINS = 20;

// ====================
// コイン生成
// ====================

function createCoin() {
    return {
        id: Math.random().toString(36).substring(2) + Date.now(),
        x: Math.floor(Math.random() * 760) + 20,
        y: Math.floor(Math.random() * 460) + 20
    };
}

// ====================
// プレイヤーの色
// ====================

const playerColors = [
    "red",
    "blue",
    "lime",
    "yellow",
    "magenta",
    "orange",
    "cyan",
    "purple",
    "pink",
    "white",
    "green",
    "gold",
    "deepskyblue",
    "violet",
    "coral",
    "springgreen",
    "tomato",
    "khaki",
    "plum",
    "salmon"
];

// ====================
// 新しいルームを作る
// ====================

function createRoom() {
    return {
        players: new Map(),
        coins: [],
        started: false,
        timeLeft: GAME_TIME,
        timer: null
    };
}

// ====================
// ゲーム開始
// ====================

function startGame(room) {

    room.started = true;
    room.timeLeft = GAME_TIME;

    room.coins = [];

    for (let i = 0; i < START_COINS; i++) {
        room.coins.push(createCoin());
    }

    for (const player of room.players.values()) {
        player.score = 0;
    }

    broadcastRoom(room, {
        type: "game-state",
        timeLeft: room.timeLeft,
        coins: room.coins,
        players: getPlayerList(room)
    });

    room.timer = setInterval(() => {

        room.timeLeft--;

        broadcastRoom(room, {
            type: "game-state",
            timeLeft: room.timeLeft,
            coins: room.coins,
            players: getPlayerList(room)
        });

        if (room.timeLeft <= 0) {
            endGame(room);
        }

    }, 1000);
}

// ====================
// ゲーム終了
// ====================

function endGame(room) {

    if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
    }

    room.started = false;

    const ranking = [...room.players.values()]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
            rank: index + 1,
            id: player.id,
            name: player.name,
            score: player.score
        }));

    broadcastRoom(room, {
        type: "game-over",
        ranking: ranking
    });

    // 5秒後に次のゲームを開始
    setTimeout(() => {

        if (room.players.size > 0 && !room.started) {
            startGame(room);
        }

    }, 5000);
}

// ====================
// プレイヤー一覧
// ====================

function getPlayerList(room) {

    return [...room.players.values()].map(player => ({
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        score: player.score,
        color: player.color
    }));
}

// ====================
// WebSocket接続
// ====================

wss.on("connection", (ws) => {

    let currentRoom = null;
    let playerId = null;

    ws.on("message", (message) => {

        let data;

        try {
            data = JSON.parse(message);
        } catch {
            return;
        }

        // ====================
        // ルーム参加
        // ====================

        if (data.type === "join") {

            const roomCode = String(data.room || "").trim();

            if (!roomCode) {
                return;
            }

            if (!rooms.has(roomCode)) {
                rooms.set(roomCode, createRoom());
            }

            const room = rooms.get(roomCode);

            // 最大人数チェック
            if (room.players.size >= MAX_PLAYERS) {

                ws.send(JSON.stringify({
                    type: "error",
                    message: "このルームは満員です。最大20人まで参加できます。"
                }));

                return;
            }

            currentRoom = room;
            playerId =
                Math.random().toString(36).substring(2) +
                Date.now();

            const playerNumber = room.players.size;

            const player = {
                id: playerId,
                name:
                    String(data.name || "名無し")
                        .substring(0, 20),
                x: 100 + (playerNumber % 5) * 100,
                y: 100 + Math.floor(playerNumber / 5) * 80,
                score: 0,
                color:
                    playerColors[playerNumber] ||
                    "white",
                ws: ws
            };

            room.players.set(playerId, player);

            console.log(
                `プレイヤー参加: ${player.name} (${room.players.size}/${MAX_PLAYERS})`
            );

            // 自分の情報
            ws.send(JSON.stringify({
                type: "joined",
                playerId: playerId,
                color: player.color,
                players: getPlayerList(room),
                timeLeft: room.timeLeft,
                coins: room.coins
            }));

            // 全員へ現在の状態
            broadcastRoom(room, {
                type: "players",
                players: getPlayerList(room)
            });

            // まだゲームが始まっていなければ開始
            if (!room.started) {
                startGame(room);
            }

            return;
        }

        // まだルームに入っていない
        if (!currentRoom || !playerId) {
            return;
        }

        const player = currentRoom.players.get(playerId);

        if (!player) {
            return;
        }

        // ====================
        // プレイヤー移動
        // ====================

        if (data.type === "player") {

            player.x = Number(data.x) || player.x;
            player.y = Number(data.y) || player.y;

            broadcastRoom(currentRoom, {
                type: "players",
                players: getPlayerList(currentRoom)
            });

            return;
        }

        // ====================
        // コイン取得
        // ====================

        if (data.type === "collect-coin") {

            if (!currentRoom.started) {
                return;
            }

            const coinId = String(data.coinId);

            const coinIndex =
                currentRoom.coins.findIndex(
                    coin => coin.id === coinId
                );

            // すでに取られている
            if (coinIndex === -1) {
                return;
            }

            // コインを削除
            currentRoom.coins.splice(
                coinIndex,
                1
            );

            // スコア加算
            player.score++;

            // 新しいコインを追加
            currentRoom.coins.push(
                createCoin()
            );

            // 全員へ更新
            broadcastRoom(currentRoom, {
                type: "coin-collected",
                playerId: playerId,
                coins: currentRoom.coins,
                players: getPlayerList(currentRoom)
            });

            return;
        }

        // ====================
        // チャット
        // ====================

        if (data.type === "chat") {

            const text =
                String(data.text || "")
                    .trim()
                    .substring(0, 200);

            if (!text) {
                return;
            }

            broadcastRoom(currentRoom, {
                type: "chat",
                name: player.name,
                text: text
            });

            return;
        }
    });

    // ====================
    // 切断
    // ====================

    ws.on("close", () => {

        if (!currentRoom || !playerId) {
            return;
        }

        const player =
            currentRoom.players.get(playerId);

        if (player) {

            console.log(
                `プレイヤー退出: ${player.name}`
            );

            currentRoom.players.delete(playerId);
        }

        broadcastRoom(currentRoom, {
            type: "players",
            players: getPlayerList(currentRoom)
        });

        // 全員いなくなったらルーム削除
        if (currentRoom.players.size === 0) {

            if (currentRoom.timer) {
                clearInterval(currentRoom.timer);
            }

            currentRoom.timer = null;

            rooms.forEach((room, code) => {

                if (room === currentRoom) {
                    rooms.delete(code);
                }

            });

            console.log("空のルームを削除しました");
        }
    });
});

// ====================
// ルーム全員へ送信
// ====================

function broadcastRoom(room, data) {

    const message =
        JSON.stringify(data);

    for (const player of room.players.values()) {

        if (
            player.ws &&
            player.ws.readyState === WebSocket.OPEN
        ) {

            player.ws.send(message);

        }
    }
}

// ====================
// サーバー起動
// ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `ゲームサーバー起動！ PORT: ${PORT}`
    );

});
