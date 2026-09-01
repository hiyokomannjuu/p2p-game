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
const COUNTDOWN_TIME = 3;
const START_COINS = 20;

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
// コイン生成
// ====================

function createCoin() {

    return {
        id:
            Math.random().toString(36).substring(2) +
            Date.now(),

        x: Math.floor(Math.random() * 760) + 20,
        y: Math.floor(Math.random() * 460) + 20
    };

}

// ====================
// ルーム作成
// ====================

function createRoom(maxPlayers, gameMode) {

    return {

        maxPlayers: maxPlayers,

        gameMode: gameMode,

        players: new Map(),

        coins: [],

        phase: "waiting",

        countdown: COUNTDOWN_TIME,

        timeLeft: GAME_TIME,

        timer: null

    };

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

        color: player.color,

        ready: player.ready

    }));

}

// ====================
// 全員に送信
// ====================

function broadcastRoom(room, data) {

    const message =
        JSON.stringify(data);

    for (
        const player of
        room.players.values()
    ) {

        if (
            player.ws &&
            player.ws.readyState ===
            WebSocket.OPEN
        ) {

            player.ws.send(message);

        }

    }

}

// ====================
// 待機状態を送信
// ====================

function sendWaitingState(room) {

    broadcastRoom(room, {

        type: "waiting",

        players:
            getPlayerList(room),

        playerCount:
            room.players.size,

        maxPlayers:
            room.maxPlayers,

        gameMode:
            room.gameMode

    });

}

// ====================
// 全員準備完了チェック
// ====================

function checkReady(room) {

    // 1人用なら1人でOK
    // 2人以上なら指定人数が揃うまで待つ
    if (
        room.maxPlayers > 1 &&
        room.players.size < room.maxPlayers
    ) {
        return;
    }

    // 全員準備完了しているか
    for (
        const player of
        room.players.values()
    ) {

        if (!player.ready) {
            return;
        }

    }

    // 待機中以外なら開始しない
    if (
        room.phase !== "waiting"
    ) {
        return;
    }

    startCountdown(room);
}

// ====================
// カウントダウン
// ====================

function startCountdown(room) {

    room.phase =
        "countdown";

    room.countdown =
        COUNTDOWN_TIME;

    broadcastRoom(room, {

        type: "countdown",

        count:
            room.countdown,

        players:
            getPlayerList(room)

    });

    room.timer =
        setInterval(() => {

            room.countdown--;

            if (
                room.countdown > 0
            ) {

                broadcastRoom(room, {

                    type: "countdown",

                    count:
                        room.countdown,

                    players:
                        getPlayerList(room)

                });

                return;

            }

            clearInterval(room.timer);

            room.timer = null;

            startGame(room);

        }, 1000);

}

// ====================
// ゲーム開始
// ====================

function startGame(room) {

    room.phase =
        "playing";

    room.timeLeft =
        GAME_TIME;

    room.coins = [];

    // スコアをリセット
    for (
        const player of
        room.players.values()
    ) {

        player.score = 0;

        // 次回のために準備状態を解除
        player.ready = false;

    }

    // コイン生成
    for (
        let i = 0;
        i < START_COINS;
        i++
    ) {

        room.coins.push(
            createCoin()
        );

    }

    broadcastRoom(room, {

        type: "game-start",

        timeLeft:
            room.timeLeft,

        coins:
            room.coins,

        players:
            getPlayerList(room)

    });

    room.timer =
        setInterval(() => {

            room.timeLeft--;

            broadcastRoom(room, {

                type: "game-state",

                timeLeft:
                    room.timeLeft,

                coins:
                    room.coins,

                players:
                    getPlayerList(room)

            });

            if (
                room.timeLeft <= 0
            ) {

                endGame(room);

            }

        }, 1000);

}

// ====================
// ゲーム終了
// ====================

function endGame(room) {

    if (room.timer) {

        clearInterval(
            room.timer
        );

        room.timer = null;

    }

    room.phase =
        "finished";

    const ranking =
        [...room.players.values()]
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .map(
                (player, index) => ({

                    rank:
                        index + 1,

                    id:
                        player.id,

                    name:
                        player.name,

                    score:
                        player.score,

                    color:
                        player.color

                })
            );

    // 次のゲームでは
    // 全員もう一度準備する
    for (
        const player of
        room.players.values()
    ) {

        player.ready = false;

    }

    broadcastRoom(room, {

        type: "game-over",

        ranking:
            ranking

    });

}

// ====================
// WebSocket
// ====================

wss.on("connection", (ws) => {

    let currentRoom = null;

    let playerId = null;

    ws.on("message", (message) => {

        let data;

        try {

            data =
                JSON.parse(message);

        } catch {

            return;

        }

        // ====================
        // 参加
        // ====================

        if (
            data.type ===
            "join"
        ) {

            const roomCode =
                String(
                    data.room || ""
                ).trim();

            if (!roomCode) {

                ws.send(
                    JSON.stringify({

                        type: "error",

                        message:
                            "ルーム番号を入力してください。"

                    })
                );

                return;

            }

            let room;

            // 新しいルーム
            if (!rooms.has(roomCode)) {

                let maxPlayers =
                    Number(
                        data.maxPlayers
                    );

                if (
                    !Number.isInteger(
                        maxPlayers
                    ) ||
                    maxPlayers < 1 ||
                    maxPlayers >
                        MAX_PLAYERS
                ) {

                    maxPlayers = 4;

                }

                room =
                    createRoom(
                        maxPlayers,
                        data.gameMode ||
                            "coin"
                    );

                rooms.set(
                    roomCode,
                    room
                );

            } else {

                room =
                    rooms.get(
                        roomCode
                    );

            }

            // 満員
            if (
                room.players.size >=
                room.maxPlayers
            ) {

                ws.send(
                    JSON.stringify({

                        type: "error",

                        message:
                            `このルームは満員です。${room.maxPlayers}人まで参加できます。`

                    })
                );

                return;

            }

            // ゲーム中は途中参加禁止
            if (
                room.phase ===
                "playing"
            ) {

                ws.send(
                    JSON.stringify({

                        type: "error",

                        message:
                            "ゲーム中です。次のゲームまでお待ちください。"

                    })
                );

                return;

            }

            currentRoom =
                room;

            playerId =
                Math.random()
                    .toString(36)
                    .substring(2) +
                Date.now();

            const playerNumber =
                room.players.size;

            const player = {

                id:
                    playerId,

                name:
                    String(
                        data.name ||
                        "名無し"
                    ).substring(
                        0,
                        20
                    ),

                x:
                    100 +
                    (playerNumber % 5) *
                    130,

                y:
                    80 +
                    Math.floor(
                        playerNumber / 5
                    ) *
                    90,

                score:
                    0,

                ready:
                    false,

                color:
                    playerColors[
                        playerNumber
                    ] ||
                    "white",

                ws:
                    ws

            };

            room.players.set(
                playerId,
                player
            );

            console.log(
                `参加: ${player.name} ` +
                `(${room.players.size}/${room.maxPlayers})`
            );

            // 自分に参加情報
            ws.send(
                JSON.stringify({

                    type:
                        "joined",

                    playerId:
                        playerId,

                    color:
                        player.color,

                    players:
                        getPlayerList(
                            room
                        ),

                    playerCount:
                        room.players.size,

                    maxPlayers:
                        room.maxPlayers,

                    gameMode:
                        room.gameMode,

                    phase:
                        room.phase,

                    coins:
                        room.coins,

                    timeLeft:
                        room.timeLeft

                })
            );

            sendWaitingState(
                room
            );

            return;

        }

        // ====================
        // ルーム未参加
        // ====================

        if (
            !currentRoom ||
            !playerId
        ) {

            return;

        }

        const player =
            currentRoom.players.get(
                playerId
            );

        if (!player) {

            return;

        }

        // ====================
        // 準備完了
        // ====================

        if (
            data.type ===
            "ready"
        ) {

            if (
                currentRoom.maxPlayers > 1 &&
                currentRoom.players.size < currentRoom.maxPlayers
            ) {

                ws.send(
                    JSON.stringify({

                        type:
                            "error",

                        message:
                            "参加人数が揃っていません。"

                    })
                );

                return;

            }

            if (
                currentRoom.phase !==
                "waiting"
            ) {

                return;

            }

            player.ready =
                true;

            sendWaitingState(
                currentRoom
            );

            checkReady(
                currentRoom
            );

            return;

        }

        // ====================
        // プレイヤー移動
        // ====================

        if (
            data.type ===
            "player"
        ) {

            if (
                currentRoom.phase !==
                "playing"
            ) {

                return;

            }

            player.x =
                Number(data.x) ||
                player.x;

            player.y =
                Number(data.y) ||
                player.y;

            broadcastRoom(
                currentRoom,
                {

                    type:
                        "players",

                    players:
                        getPlayerList(
                            currentRoom
                        )

                }
            );

            return;

        }

        // ====================
        // コイン取得
        // ====================

        if (
            data.type ===
            "collect-coin"
        ) {

            if (
                currentRoom.phase !==
                "playing"
            ) {

                return;

            }

            const coinId =
                String(
                    data.coinId
                );

            const coinIndex =
                currentRoom.coins.findIndex(
                    coin =>
                        coin.id ===
                        coinId
                );

            // すでに取得済み
            if (
                coinIndex === -1
            ) {

                return;

            }

            // コイン削除
            currentRoom.coins.splice(
                coinIndex,
                1
            );

            // スコア加算
            player.score++;

            // 新しいコイン
            currentRoom.coins.push(
                createCoin()
            );

            broadcastRoom(
                currentRoom,
                {

                    type:
                        "coin-collected",

                    playerId:
                        playerId,

                    coins:
                        currentRoom.coins,

                    players:
                        getPlayerList(
                            currentRoom
                        )

                }
            );

            return;

        }

        // ====================
// 次のゲーム
// ====================

if (
    data.type ===
    "next-game"
) {

    // GAME OVER後、または
    // 次のゲームの待機中だけ受付
    if (
        currentRoom.phase !== "finished" &&
        currentRoom.phase !== "waiting"
    ) {

        return;

    }

    // GAME OVERから最初に
    // 次のゲームへ進むとき
    if (
        currentRoom.phase === "finished"
    ) {

        currentRoom.phase = "waiting";

        // 全員の準備状態をリセット
        for (
            const p of
            currentRoom.players.values()
        ) {

            p.ready = false;

        }

    }

    // このプレイヤーを準備完了にする
    player.ready = true;

    console.log(
        `次のゲーム準備: ${player.name}`
    );

    // 現在の準備状況を全員へ送信
    sendWaitingState(
        currentRoom
    );

    // 全員準備完了ならゲーム開始
    checkReady(
        currentRoom
    );

    return;

}

        // ====================
        // チャット
        // ====================

        if (
            data.type ===
            "chat"
        ) {

            const text =
                String(
                    data.text || ""
                )
                .trim()
                .substring(
                    0,
                    200
                );

            if (!text) {

                return;

            }

            broadcastRoom(
                currentRoom,
                {

                    type:
                        "chat",

                    name:
                        player.name,

                    text:
                        text

                }
            );

            return;

        }

    });

    // ====================
    // 切断
    // ====================

    ws.on("close", () => {

        if (
            !currentRoom ||
            !playerId
        ) {

            return;

        }

        const player =
            currentRoom.players.get(
                playerId
            );

        if (player) {

            console.log(
                `退出: ${player.name}`
            );

            currentRoom.players.delete(
                playerId
            );

        }

        // 誰かが抜けたら
        // 残った人の準備状態をリセット
        if (
            currentRoom.phase ===
            "waiting" ||
            currentRoom.phase ===
            "finished" ||
            currentRoom.phase ===
            "countdown"
        ) {

            for (
                const p of
                currentRoom.players.values()
            ) {

                p.ready =
                    false;

            }

        }

        // カウントダウン中に人数不足
        if (
            currentRoom.phase ===
            "countdown" &&
            currentRoom.players.size <
            currentRoom.maxPlayers
        ) {

            if (
                currentRoom.timer
            ) {

                clearInterval(
                    currentRoom.timer
                );

                currentRoom.timer =
                    null;

            }

            currentRoom.phase =
                "waiting";

        }

        sendWaitingState(
            currentRoom
        );

        // 全員いなくなったら削除
        if (
            currentRoom.players.size ===
            0
        ) {

            if (
                currentRoom.timer
            ) {

                clearInterval(
                    currentRoom.timer
                );

            }

            for (
                const [
                    code,
                    room
                ] of rooms
            ) {

                if (
                    room ===
                    currentRoom
                ) {

                    rooms.delete(
                        code
                    );

                }

            }

            console.log(
                "空のルームを削除しました"
            );

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
