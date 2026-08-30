const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const nameInput = document.getElementById("nameInput");
const gameMode = document.getElementById("gameMode");

const login = document.getElementById("login");
const game = document.getElementById("game");
const chatRoom = document.getElementById("chatRoom");

const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");

const mobileControls =
    document.getElementById("mobileControls");

let socket = null;

let currentMode = "chat";

let players = [];

let coins = [];

let winner = null;


// ====================
// 自分
// ====================

const myPlayer = {

    x: 200,

    y: 200,

    size: 30,

    score: 0

};


// ====================
// キー
// ====================

const keys = {};

document.addEventListener(
    "keydown",
    (event) => {

        keys[
            event.key.toLowerCase()
        ] = true;

    }
);


document.addEventListener(
    "keyup",
    (event) => {

        keys[
            event.key.toLowerCase()
        ] = false;

    }
);


// ====================
// 自分のID
// ====================

const playerId =
    Math.random()
        .toString(36)
        .substring(2);


// ====================
// モード表示
// ====================

function updateModeDisplay() {

    if (currentMode === "chat") {

        chatRoom.style.display = "block";

        game.style.display = "none";

        mobileControls.style.display = "none";

    } else {

        chatRoom.style.display = "none";

        game.style.display = "block";

        mobileControls.style.display = "block";

    }

}


// ====================
// 参加
// ====================

joinButton.addEventListener(
    "click",
    () => {

        const name =
            nameInput.value.trim();

        const room =
            roomInput.value.trim();

        currentMode =
            gameMode.value;


        if (!room) {

            alert(
                "ルームコードを入力してください"
            );

            return;

        }


        socket =
            new WebSocket(
                `${location.protocol === "https:"
                    ? "wss"
                    : "ws"}://${location.host}`
            );


        // ====================
        // 接続
        // ====================

        socket.addEventListener(
            "open",
            () => {

                socket.send(
                    JSON.stringify({

                        type: "join",

                        room: room,

                        name: name,

                        mode: currentMode

                    })
                );


                login.style.display =
                    "none";


                updateModeDisplay();


                requestAnimationFrame(
                    gameLoop
                );

            }
        );


        // ====================
        // 受信
        // ====================

        socket.addEventListener(
            "message",
            (event) => {

                const data =
                    JSON.parse(
                        event.data
                    );


                // --------------------
                // チャット
                // --------------------

                if (
                    data.type === "chat"
                ) {

                    addChatMessage(
                        data.name,
                        data.text
                    );

                    return;

                }


                // --------------------
                // ゲーム状態
                // --------------------

                if (
                    data.type ===
                    "game-state"
                ) {

                    players =
                        data.players || [];

                    coins =
                        data.coins || [];

                    winner =
                        data.winner || null;


                    // 自分を探す

                    const me =
                        players.find(
                            p =>
                                p.id ===
                                playerId
                        );


                    if (me) {

                        myPlayer.x =
                            me.x;

                        myPlayer.y =
                            me.y;

                        myPlayer.score =
                            me.score;

                    }


                    return;

                }

            }
        );

    }
);


// ====================
// プレイヤー移動
// ====================

function update() {

    if (
        currentMode === "chat"
    ) {

        return;

    }


    if (winner) {

        return;

    }


    const speed = 4;


    if (
        keys["w"] ||
        keys["arrowup"]
    ) {

        myPlayer.y -= speed;

    }


    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {

        myPlayer.y += speed;

    }


    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {

        myPlayer.x -= speed;

    }


    if (
        keys["d"] ||
        keys["arrowright"]
    ) {

        myPlayer.x += speed;

    }


    // ====================
    // 画面外制限
    // ====================

    myPlayer.x =
        Math.max(
            0,
            Math.min(
                canvas.width -
                myPlayer.size,
                myPlayer.x
            )
        );


    myPlayer.y =
        Math.max(
            0,
            Math.min(
                canvas.height -
                myPlayer.size,
                myPlayer.y
            )
        );


    // ====================
    // サーバーへ送信
    // ====================

    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({

                type: "player",

                id: playerId,

                x: myPlayer.x,

                y: myPlayer.y

            })
        );

    }

}


// ====================
// 描画
// ====================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    if (
        currentMode === "chat"
    ) {

        return;

    }


    // ====================
    // 背景
    // ====================

    ctx.fillStyle = "#333";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // ====================
    // コイン
    // ====================

    for (
        const coin of coins
    ) {

        ctx.beginPath();

        ctx.arc(
            coin.x,
            coin.y,
            12,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "gold";

        ctx.fill();

        ctx.strokeStyle =
            "white";

        ctx.stroke();

    }


    // ====================
    // プレイヤー
    // ====================

    for (
        const player of players
    ) {

        const isMe =
            player.id ===
            playerId;


        ctx.fillStyle =
            isMe
                ? "red"
                : "blue";


        ctx.fillRect(
            player.x,
            player.y,
            30,
            30
        );


        // 名前

        ctx.fillStyle =
            "white";

        ctx.font =
            "14px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            player.name,
            player.x + 15,
            player.y - 5
        );

    }


    // ====================
    // スコア
    // ====================

    ctx.textAlign =
        "left";

    ctx.font =
        "bold 20px sans-serif";

    ctx.fillStyle =
        "white";


    ctx.fillText(
        `🪙 コイン: ${myPlayer.score} / 10`,
        15,
        30
    );


    // ====================
    // 勝利
    // ====================

    if (winner) {

        ctx.fillStyle =
            "rgba(0,0,0,0.7)";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        ctx.fillStyle =
            "gold";

        ctx.font =
            "bold 40px sans-serif";

        ctx.textAlign =
            "center";


        ctx.fillText(
            `🏆 ${winner} の勝利！`,
            canvas.width / 2,
            canvas.height / 2
        );


        ctx.font =
            "20px sans-serif";

        ctx.fillStyle =
            "white";


        ctx.fillText(
            "ページを更新するともう一度遊べます",
            canvas.width / 2,
            canvas.height / 2 + 45
        );

    }

}


// ====================
// ゲームループ
// ====================

function gameLoop() {

    update();

    draw();

    requestAnimationFrame(
        gameLoop
    );

}


// ====================
// チャット
// ====================

function addChatMessage(
    name,
    text
) {

    const message =
        document.createElement(
            "div"
        );


    message.textContent =
        `${name}: ${text}`;


    chatMessages.appendChild(
        message
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


// ====================
// チャット送信
// ====================

function sendChat() {

    const text =
        chatInput.value.trim();


    if (!text) {

        return;

    }


    if (
        !socket ||
        socket.readyState !==
        WebSocket.OPEN
    ) {

        alert(
            "まだ接続されていません"
        );

        return;

    }


    socket.send(
        JSON.stringify({

            type: "chat",

            text: text

        })
    );


    chatInput.value = "";

}


chatSend.addEventListener(
    "click",
    sendChat
);


chatInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            sendChat();

        }

    }
);
