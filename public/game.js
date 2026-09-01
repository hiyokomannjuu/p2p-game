const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const nameInput = document.getElementById("nameInput");

const login = document.getElementById("login");
const game = document.getElementById("game");

let socket = null;
let myPlayerId = null;
let myColor = "red";

let coins = [];
let players = [];

let timeLeft = 60;
let gameStarted = false;
let gameOver = false;

const keys = {};

const myPlayer = {
    x: 200,
    y: 200,
    size: 30
};

// ====================
// 情報表示
// ====================

const gameInfo = document.createElement("div");

gameInfo.style.fontSize = "22px";
gameInfo.style.fontWeight = "bold";
gameInfo.style.margin = "10px";

gameInfo.innerHTML = `
    <div id="timeDisplay">⏱️ 60秒</div>
    <div id="scoreDisplay">🪙 自分: 0枚</div>
`;

game.insertBefore(gameInfo, canvas);

const timeDisplay =
    document.getElementById("timeDisplay");

const scoreDisplay =
    document.getElementById("scoreDisplay");

// ====================
// ランキング
// ====================

const rankingDisplay = document.createElement("div");

rankingDisplay.style.width = "800px";
rankingDisplay.style.maxWidth = "95%";
rankingDisplay.style.margin = "10px auto";
rankingDisplay.style.padding = "10px";
rankingDisplay.style.background = "#111";
rankingDisplay.style.color = "white";
rankingDisplay.style.borderRadius = "10px";
rankingDisplay.style.textAlign = "left";

game.appendChild(rankingDisplay);

// ====================
// PC操作
// ====================

document.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

});

document.addEventListener("keyup", (event) => {

    keys[event.key.toLowerCase()] = false;

});

// ====================
// スマホ操作
// ====================

const mobileControls =
    document.createElement("div");

mobileControls.id = "mobileControls";

mobileControls.innerHTML = `
    <div>
        <button data-key="arrowup">↑</button>
    </div>

    <div>
        <button data-key="arrowleft">←</button>
        <button data-key="arrowdown">↓</button>
        <button data-key="arrowright">→</button>
    </div>
`;

mobileControls.style.textAlign = "center";
mobileControls.style.marginTop = "15px";
mobileControls.style.userSelect = "none";

mobileControls
    .querySelectorAll("button")
    .forEach((button) => {

        button.style.width = "70px";
        button.style.height = "70px";
        button.style.fontSize = "30px";
        button.style.margin = "5px";
        button.style.touchAction = "none";

        const key = button.dataset.key;

        button.addEventListener(
            "pointerdown",
            (event) => {

                event.preventDefault();

                button.setPointerCapture(
                    event.pointerId
                );

                keys[key] = true;

            }
        );

        button.addEventListener(
            "pointerup",
            (event) => {

                event.preventDefault();

                keys[key] = false;

            }
        );

        button.addEventListener(
            "pointercancel",
            (event) => {

                event.preventDefault();

                keys[key] = false;

            }
        );

    });

game.appendChild(mobileControls);

// ====================
// ルーム参加
// ====================

joinButton.addEventListener("click", () => {

    const name =
        nameInput.value.trim();

    const room =
        roomInput.value.trim();

    if (!room) {

        alert(
            "ルームコードを入力してください"
        );

        return;

    }

    socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    );

    socket.addEventListener(
        "open",
        () => {

            socket.send(
                JSON.stringify({

                    type: "join",
                    room: room,
                    name: name

                })
            );

            login.style.display = "none";
            game.style.display = "block";

            gameStarted = true;
            gameOver = false;

            requestAnimationFrame(
                gameLoop
            );

        }
    );

    socket.addEventListener(
        "message",
        (event) => {

            const data =
                JSON.parse(event.data);

            // ====================
            // 自分の情報
            // ====================

            if (data.type === "joined") {

                myPlayerId =
                    data.playerId;

                myColor =
                    data.color;

                players =
                    data.players || [];

                coins =
                    data.coins || [];

                timeLeft =
                    data.timeLeft;

                updateRanking();

            }

            // ====================
            // プレイヤー一覧
            // ====================

            if (data.type === "players") {

                players =
                    data.players || [];

                updateRanking();

            }

            // ====================
            // ゲーム状態
            // ====================

            if (data.type === "game-state") {

                coins =
                    data.coins || [];

                timeLeft =
                    data.timeLeft;

                players =
                    data.players || players;

                timeDisplay.textContent =
                    `⏱️ ${timeLeft}秒`;

                updateRanking();

            }

            // ====================
            // コイン取得
            // ====================

            if (
                data.type ===
                "coin-collected"
            ) {

                coins =
                    data.coins || [];

                players =
                    data.players || players;

                updateRanking();

            }

            // ====================
            // ゲーム終了
            // ====================

            if (
                data.type ===
                "game-over"
            ) {

                gameStarted = false;
                gameOver = true;

                showGameOver(
                    data.ranking || []
                );

            }

            // ====================
            // エラー
            // ====================

            if (data.type === "error") {

                alert(data.message);

            }

            // ====================
            // チャット
            // ====================

            if (data.type === "chat") {

                addChatMessage(
                    data.name,
                    data.text
                );

            }

        }
    );

});

// ====================
// 時間ベース移動
// ====================

let lastTime =
    performance.now();

function update(currentTime) {

    const deltaTime =
        Math.min(
            (currentTime - lastTime) / 1000,
            0.05
        );

    lastTime =
        currentTime;

    if (
        !gameStarted ||
        gameOver
    ) {
        return;
    }

    const speed = 240;

    let dx = 0;
    let dy = 0;

    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        dy -= 1;
    }

    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        dy += 1;
    }

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        dx -= 1;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        dx += 1;
    }

    // ====================
    // 斜め移動を一定速度にする
    // ====================

    if (
        dx !== 0 ||
        dy !== 0
    ) {

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        dx /= length;
        dy /= length;

        myPlayer.x +=
            dx * speed * deltaTime;

        myPlayer.y +=
            dy * speed * deltaTime;

    }

    // ====================
    // 画面外防止
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
    // 自分の位置を送信
    // ====================

    if (
        socket &&
        socket.readyState ===
            WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({

                type: "player",

                id: myPlayerId,

                x: myPlayer.x,

                y: myPlayer.y

            })
        );

    }

    // ====================
    // コイン当たり判定
    // ====================

    for (const coin of coins) {

        const playerCenterX =
            myPlayer.x +
            myPlayer.size / 2;

        const playerCenterY =
            myPlayer.y +
            myPlayer.size / 2;

        const distanceX =
            playerCenterX -
            coin.x;

        const distanceY =
            playerCenterY -
            coin.y;

        const distance =
            Math.sqrt(
                distanceX *
                    distanceX +
                distanceY *
                    distanceY
            );

        if (distance < 25) {

            if (
                socket &&
                socket.readyState ===
                    WebSocket.OPEN
            ) {

                socket.send(
                    JSON.stringify({

                        type:
                            "collect-coin",

                        coinId:
                            coin.id

                    })
                );

            }

            break;

        }

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

    // ====================
    // コイン
    // ====================

    for (const coin of coins) {

        ctx.beginPath();

        ctx.arc(
            coin.x,
            coin.y,
            11,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "gold";

        ctx.fill();

        ctx.strokeStyle =
            "orange";

        ctx.lineWidth = 3;

        ctx.stroke();

        // コインの「$」
        ctx.fillStyle =
            "black";

        ctx.font =
            "bold 12px sans-serif";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            "$",
            coin.x,
            coin.y
        );

    }

    // ====================
    // 他プレイヤー
    // ====================

    for (
        const player of players
    ) {

        if (
            player.id ===
            myPlayerId
        ) {
            continue;
        }

        ctx.fillStyle =
            player.color ||
            "blue";

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
            "12px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            player.name || "名無し",
            player.x + 15,
            player.y - 6
        );

    }

    // ====================
    // 自分
    // ====================

    ctx.fillStyle =
        myColor;

    ctx.fillRect(
        myPlayer.x,
        myPlayer.y,
        myPlayer.size,
        myPlayer.size
    );

    ctx.fillStyle =
        "white";

    ctx.font =
        "12px sans-serif";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "YOU",
        myPlayer.x + 15,
        myPlayer.y - 6
    );

}

// ====================
// ランキング更新
// ====================

function updateRanking() {

    const sortedPlayers =
        [...players].sort(
            (a, b) =>
                b.score - a.score
        );

    let html =
        "<strong>🏆 ランキング</strong><br>";

    sortedPlayers.forEach(
        (player, index) => {

            const medal =
                index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `${index + 1}.`;

            html += `
                <div>
                    ${medal}
                    <span style="
                        display:inline-block;
                        width:12px;
                        height:12px;
                        background:${player.color};
                        margin-right:5px;
                    "></span>
                    ${escapeHtml(player.name)}
                   　
                    ${player.score}枚
                </div>
            `;

        }
    );

    rankingDisplay.innerHTML =
        html;

    const me =
        players.find(
            player =>
                player.id ===
                myPlayerId
        );

    if (me) {

        scoreDisplay.textContent =
            `🪙 自分: ${me.score}枚`;

    }

}

// ====================
// HTML安全化
// ====================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

// ====================
// ゲーム終了画面
// ====================

function showGameOver(ranking) {

    const old =
        document.getElementById(
            "gameOver"
        );

    if (old) {
        old.remove();
    }

    const result =
        document.createElement("div");

    result.id =
        "gameOver";

    result.style.position =
        "fixed";

    result.style.left =
        "50%";

    result.style.top =
        "50%";

    result.style.transform =
        "translate(-50%, -50%)";

    result.style.background =
        "white";

    result.style.color =
        "black";

    result.style.padding =
        "30px";

    result.style.borderRadius =
        "15px";

    result.style.fontSize =
        "22px";

    result.style.zIndex =
        "1000";

    let html =
        "<strong>🏁 ゲーム終了！</strong><br><br>";

    ranking
        .slice(0, 10)
        .forEach((player) => {

            html += `
                ${player.rank}位　
                ${escapeHtml(player.name)}
                　
                ${player.score}枚
                <br>
            `;

        });

    result.innerHTML =
        html;

    document.body.appendChild(
        result
    );

}

// ====================
// ゲームループ
// ====================

function gameLoop(currentTime) {

    update(currentTime);

    draw();

    requestAnimationFrame(
        gameLoop
    );

}

// ====================
// チャット
// ====================

const chatInput =
    document.getElementById(
        "chatInput"
    );

const chatSend =
    document.getElementById(
        "chatSend"
    );

const chatMessages =
    document.getElementById(
        "chatMessages"
    );

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
            "まだゲームに接続されていません"
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
            event.key ===
            "Enter"
        ) {

            sendChat();

        }

    }
);
