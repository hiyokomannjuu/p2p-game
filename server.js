const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const rooms = new Map();

const WIN_SCORE = 10;


// ====================
// コイン生成
// ====================

function createCoin() {
    return {
        id: Math.random().toString(36).substring(2),
        x: Math.floor(Math.random() * 760) + 20,
        y: Math.floor(Math.random() * 460) + 20
    };
}


// ====================
// 部屋の状態を送信
// ====================

function broadcastRoom(room) {

    if (!rooms.has(room)) {
        return;
    }

    const roomData = rooms.get(room);

    const players = roomData.players.map(player => ({
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        score: player.score
    }));

    const message = JSON.stringify({
        type: "game-state",
        players: players,
        coins: roomData.coins,
        winner: roomData.winner
    });

    for (const player of roomData.players) {

        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }

    }
}


// ====================
// WebSocket接続
// ====================

wss.on("connection", (ws) => {

    let room = null;
    let player = null;


    // ====================
    // メッセージ受信
    // ====================

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

            room = String(data.room || "").trim();

            if (!room) {
                return;
            }

            const name =
                String(data.name || "名無し")
                    .substring(0, 20);

            const mode =
                String(data.mode || "chat");


            // --------------------
            // 新しい部屋
            // --------------------

            if (!rooms.has(room)) {

                rooms.set(room, {
                    mode: mode,
                    players: [],
                    coins: [],
                    winner: null
                });

            }


            const roomData = rooms.get(room);


            // --------------------
            // プレイヤー作成
            // --------------------

            player = {
                ws: ws,

                id: Math.random()
                    .toString(36)
                    .substring(2),

                name: name,

                x: 100 + Math.random() * 600,
                y: 100 + Math.random() * 300,

                score: 0
            };


            roomData.players.push(player);


            // --------------------
            // コインモードなら
            // コイン生成
            // --------------------

            if (
                roomData.mode === "coin" &&
                roomData.coins.length === 0
            ) {

                for (let i = 0; i < 10; i++) {
                    roomData.coins.push(createCoin());
                }

            }


            console.log(
                `Room ${room} に ${name} が参加しました`
            );


            // 現在の状態を送信
            broadcastRoom(room);

            return;
        }


        // ====================
        // チャット
        // ====================

        if (data.type === "chat") {

            if (!room || !player) {
                return;
            }

            const text =
                String(data.text || "")
                    .trim()
                    .substring(0, 200);

            if (!text) {
                return;
            }

            const chatMessage = {
                type: "chat",
                name: player.name,
                text: text
            };


            const roomData = rooms.get(room);

            if (!roomData) {
                return;
            }


            for (const target of roomData.players) {

                if (
                    target.ws.readyState ===
                    WebSocket.OPEN
                ) {

                    target.ws.send(
                        JSON.stringify(chatMessage)
                    );

                }

            }

            return;
        }


        // ====================
        // プレイヤー移動
        // ====================

        if (data.type === "player") {

            if (!room || !player) {
                return;
            }

            const roomData = rooms.get(room);

            if (!roomData) {
                return;
            }


            player.x = Number(data.x) || 0;
            player.y = Number(data.y) || 0;


            // ====================
            // コイン判定
            // ====================

            if (
                roomData.mode === "coin" &&
                !roomData.winner
            ) {

                for (
                    let i = roomData.coins.length - 1;
                    i >= 0;
                    i--
                ) {

                    const coin =
                        roomData.coins[i];


                    const dx =
                        player.x + 15 - coin.x;

                    const dy =
                        player.y + 15 - coin.y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    // コインを取った
                    if (distance < 30) {

                        roomData.coins.splice(i, 1);

                        player.score++;

                        console.log(
                            `${player.name} がコインを取得！`
                        );


                        // 勝利
                        if (
                            player.score >= WIN_SCORE
                        ) {

                            roomData.winner =
                                player.name;

                            console.log(
                                `${player.name} の勝利！`
                            );

                        }


                        // 新しいコイン
                        if (!roomData.winner) {
                            roomData.coins.push(
                                createCoin()
                            );
                        }

                    }

                }

            }


            // 全員に状態送信
            broadcastRoom(room);

            return;
        }

    });


    // ====================
    // 切断
    // ====================

    ws.on("close", () => {

        if (!room || !player) {
            return;
        }

        const roomData = rooms.get(room);

        if (!roomData) {
            return;
        }


        const index =
            roomData.players.indexOf(player);


        if (index !== -1) {
            roomData.players.splice(index, 1);
        }


        console.log(
            `${player.name} が Room ${room} から退出しました`
        );


        // 誰もいなくなったら部屋削除
        if (roomData.players.length === 0) {

            rooms.delete(room);

        } else {

            broadcastRoom(room);

        }

    });

});


// ====================
// サーバー起動
// ====================

const PORT =
    process.env.PORT || 3000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `ゲームサーバー起動！ PORT: ${PORT}`
        );

    }
);
