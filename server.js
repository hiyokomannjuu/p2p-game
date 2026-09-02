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

        hp: player.hp,

        color: player.color,

        ready: player.ready,

        team: player.team

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

    // FPS用のチームキル数
    if (room.gameMode === "fps") {
    room.teamKills = {
        A: 0,
        B: 0
    };
}

    // スコアをリセット
    for (
        const player of
        room.players.values()
    ) {

        player.score = 0;
        player.hp = 100;

        // FPSでは復活時の無敵時間を管理する
       player.invulnerableUntil = 0;

        // 次回のために準備状態を解除
        player.ready = false;
    }

    // コイン生成
    if (room.gameMode !== "fps") {

    for (
        let i = 0;
        i < START_COINS;
        i++
    ) {

        room.coins.push(
            createCoin()
        );

    }

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

                team:
                       data.gameMode === "fps" &&
                      (data.team === "A" || data.team === "B")
                       ? data.team
                    : null,

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

                hp:
                   100,

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
          // FPS チーム変更
          // ====================

  if (data.type === "change-team") {

    // FPSモード以外では無視
    if (currentRoom.gameMode !== "fps") {
        return;
    }

    // ゲーム開始後は変更禁止
    if (currentRoom.phase !== "waiting") {
        return;
    }

    // AかB以外は無視
    if (
        data.team !== "A" &&
        data.team !== "B"
    ) {
        return;
    }

    // チームを変更
    player.team = data.team;

    console.log(
        `${player.name} → チーム${player.team}`
    );

    // 全員に最新のプレイヤー情報を送る
    broadcastRoom(
        currentRoom,
        {
            type: "players",
            players: getPlayerList(currentRoom)
        }
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

        // ===================
        // FPS 射撃
        // ===================

        if (data.type === "fps-shoot") {

    // FPS以外では使えない
    if (currentRoom.gameMode !== "fps") {
        return;
    }

    // ゲーム中以外では撃てない
    if (currentRoom.phase !== "playing") {
        return;
    }

    // 射撃方向
    const direction = data.direction;

    // 方向がない・おかしい場合
    if (
        !direction ||
        typeof direction.x !== "number" ||
        typeof direction.y !== "number"
    ) {
        return;
    }

    // 弾の配列を用意
    if (!currentRoom.bullets) {
        currentRoom.bullets = [];
    }

    // 弾を作る
    const bullet = {

        id:
            Math.random()
                .toString(36)
                .substring(2) +
            Date.now(),

        // プレイヤーの中央から発射
        x:
            player.x + 15,

        y:
            player.y + 15,

        // 飛ぶ方向
        dx:
            direction.x,

        dy:
            direction.y,

        // 誰が撃ったか
        ownerId:
            player.id,

        // チーム
        team:
            player.team,

        // ダメージ
        damage:
            25

    };

    // 弾を追加
    currentRoom.bullets.push(
        bullet
    );

    console.log(
        `${player.name} が射撃！`,
        bullet
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
                // FPS 射撃
                // ====================

              if (
            data.type ===
            "fps-shoot"
              ) {

                // FPS以外では撃てない
              if (
                currentRoom.gameMode !==
                "fps"
             ) {

                 return;

             }

                 // ゲーム中以外は撃てない
            if (
                currentRoom.phase !==
                "playing"
            ) {

                return;

            }

                 // 射撃方向
            const direction =
                data.direction || {
                    x: 0,
                    y: -1
                };

            const dx =
                Number(direction.x) || 0;

            const dy =
                Number(direction.y) || 0;

                 // プレイヤーの中心から弾を出す
            const bullet = {

                id:
                    Math.random()
                        .toString(36)
                        .substring(2) +
                    Date.now(),

                x:
                    player.x + 15,

                y:
                    player.y + 15,

                dx:
                    dx,

                dy:
                    dy,

                ownerId:
                    playerId,

                team:
                    player.team,

                damage:
                    25

            };

                  // 弾を追加
            if (
                !currentRoom.bullets
            ) {

                currentRoom.bullets = [];

            }

            currentRoom.bullets.push(
                bullet
            );

            console.log(
                `射撃: ${player.name}`
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

// ==================================================
// FPS 弾の更新
// ==================================================

setInterval(() => {

    for (const currentRoom of rooms.values()) {

        // FPS以外は無視
        if (currentRoom.gameMode !== "fps") {
            continue;
        }

        // 弾がなければ作る
        if (!currentRoom.bullets) {
            currentRoom.bullets = [];
        }

        // 弾を動かす
        for (
            let i = currentRoom.bullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                currentRoom.bullets[i];

            // 弾の速度
            const bulletSpeed = 10;

            bullet.x +=
                bullet.dx * bulletSpeed;

            bullet.y +=
                bullet.dy * bulletSpeed;


            // --------------------------------
            // 画面外なら削除
            // --------------------------------

            if (
                bullet.x < 0 ||
                bullet.x > 800 ||
                bullet.y < 0 ||
                bullet.y > 500
            ) {

                currentRoom.bullets.splice(i, 1);

                continue;

            }


            // --------------------------------
            // プレイヤーとの当たり判定
            // --------------------------------

            for (
                const target of currentRoom.players.values()
            ) {

                // 自分には当たらない
                if (
                    target.id ===
                    bullet.ownerId
                ) {
                    continue;
                }
                // リスポーン直後の3秒間は無敵
                if (
                    target.invulnerableUntil &&
                   Date.now() < target.invulnerableUntil
                     ) {
                  continue;
                   }
                // 同じチームには当たらない
                if (
                    bullet.team &&
                    target.team &&
                    bullet.team === target.team
                ) {
                    continue;
                }

                const hit =
                    bullet.x >= target.x &&
                    bullet.x <= target.x + 30 &&
                    bullet.y >= target.y &&
                    bullet.y <= target.y + 30;

                if (hit) {

                    // HPを減らす
                    target.hp =
                        (target.hp ?? 100) -
                        (bullet.damage ?? 25);

                    // HPが0未満にならないようにする
                    target.hp =
                        Math.max(
                            0,
                            target.hp
                        );

                    console.log(
                        `${target.name} HP: ${target.hp}`
                    );

                    // --------------------------------
                    // HPが0になったら死亡・リスポーン
                    // --------------------------------

                  if (target.hp <= 0) {

                     // 倒したプレイヤーのチームにキルを加算
    if (bullet.team === "A") {
        currentRoom.teamKills.A++;
    } else if (bullet.team === "B") {
        currentRoom.teamKills.B++;
    }

    console.log(
        `${target.name} が倒された！`
    );

    // チームのスポーン位置へ戻す
    if (target.team === "A") {
        target.x = 100;
        target.y = 220;
    } else {
        target.x = 670;
        target.y = 220;
    }

    // HPを全回復
    target.hp = 100;

    // 3秒間無敵
    target.invulnerableUntil =
        Date.now() + 3000;

    console.log(
        `${target.name} がリスポーン！`
    );
}

                    // 弾を削除
                    currentRoom.bullets.splice(i, 1);

                    break;

                }

            }

        }


        // --------------------------------
        // 全員に弾とプレイヤーを送信
        // --------------------------------

        broadcastRoom(
            currentRoom,
            {
                type: "fps-state",

                bullets:
                    currentRoom.bullets,

                players:
                    getPlayerList(
                        currentRoom
                    )
            }
        );

    }

}, 16);

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
