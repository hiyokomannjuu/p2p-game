const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const nameInput = document.getElementById("nameInput");
const playerCountInput = document.getElementById("playerCount");
const gameModeInput =
    document.getElementById("gameMode");
const login = document.getElementById("login");
const game = document.getElementById("game");

const gameStatus = document.getElementById("gameStatus");
const readyButton = document.getElementById("readyButton");
const playerCountDisplay =
    document.getElementById("playerCountDisplay");

let socket = null;

let myPlayerId = null;
let myColor = "red";

let players = [];
let coins = [];

let maxPlayers = 0;
let timeLeft = 60;
let gameMode = "coin";

let gamePhase = "waiting";
let gameLoopStarted = false;

const keys = {};

const myPlayer = {
    x: 200,
    y: 200,
    size: 30
};


// ==================================================
// PC操作
// ==================================================

document.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

});

document.addEventListener("keyup", (event) => {

    keys[event.key.toLowerCase()] = false;

});


// ==================================================
// スマホ操作
// ==================================================

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
            () => {

                keys[key] = false;

            }
        );

    });

game.appendChild(mobileControls);


// ==================================================
// 参加
// ==================================================

joinButton.addEventListener("click", () => {

    const name =
        nameInput.value.trim();

    const room =
        roomInput.value.trim();

    const selectedPlayers =
        Number(playerCountInput.value);

    if (!name) {

        alert("名前を入力してください");

        return;

    }

    if (!room) {

        alert("ルーム番号を入力してください");

        return;

    }

    socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    );


    // ----------------------------------------------
    // 接続成功
    // ----------------------------------------------

    socket.addEventListener("open", () => {

        socket.send(
            JSON.stringify({

                type: "join",

                room: room,

                name: name,

                maxPlayers: selectedPlayers,
                
                gameMode: gameModeInput.value,
                
                team: typeof myTeam !== "undefined" ? myTeam : null

            })
        );

    });


    // ----------------------------------------------
    // サーバーからのメッセージ
    // ----------------------------------------------

    socket.addEventListener("message",
        (event) => {

            let data;

            try {

                data =
                    JSON.parse(event.data);

            } catch {

                return;

            }

            // ======================================
            // FPS 弾の受信
            // ======================================

             if (data.type === "fps-state") {

                fpsBullets =
                        data.bullets || [];

                players =
                        data.players || [];

              }

            // ======================================
            // 参加完了
            // ======================================

            if (data.type === "joined") {

                myPlayerId =
                    data.playerId;

                myColor =
                    data.color;

                players =
                    data.players || [];

                coins =
                    data.coins || [];

                maxPlayers =
                    data.maxPlayers;
                gameMode = data.gameMode || "coin"; 
                timeLeft =
                    data.timeLeft || 60;

                gamePhase =
                    data.phase || "waiting";

                login.style.display =
                    "none";

                game.style.display =
                    "block";

                updatePlayerCount();

                updateReadyButton();

                updateStatus();

                if (!gameLoopStarted) {

                    gameLoopStarted = true;

                    requestAnimationFrame(
                        gameLoop
                    );

                }

            }


            // ======================================
            // 待機
            // ======================================

            if (data.type === "waiting") {

     players =
        data.players || [];

     maxPlayers =
        data.maxPlayers ||
        maxPlayers;

     gameMode =
        data.gameMode || gameMode;

     gamePhase =
        "waiting";

          // GAME OVERを消す
     const gameOver =
        document.getElementById("gameOver");

     if (gameOver) {
        gameOver.remove();
    }

    updatePlayerCount();

    updateReadyButton();

    updateStatus();

}


            // ======================================
            // カウントダウン
            // ======================================

            if (data.type === "countdown") {

                players =
                    data.players || players;

                gamePhase =
                    "countdown";

                updatePlayerCount();

                updateReadyButton();

                gameStatus.innerHTML =
                    `🔥 ${data.count}`;

            }


            // ======================================
            // ゲーム開始
            // ======================================

            if (data.type === "game-start") {

                players =
                    data.players || [];

                coins =
                    data.coins || [];

                timeLeft =
                    data.timeLeft || 60;

                gamePhase =
                    "playing";

                updatePlayerCount();

                updateReadyButton();

                updateStatus();

            }


            // ======================================
            // ゲーム中
            // ======================================

            if (data.type === "game-state") {

                players =
                    data.players || players;

                coins =
                    data.coins || coins;

                timeLeft =
                    data.timeLeft;

                gamePhase =
                    "playing";

                updateStatus();

            }


            // ======================================
            // プレイヤー更新
            // ======================================

            if (data.type === "players") {

                players =
                    data.players || [];

                updatePlayerCount();

                updateStatus();

            }


            // ======================================
            // コイン取得
            // ======================================

            if (
                data.type ===
                "coin-collected"
            ) {

                coins =
                    data.coins || [];

                players =
                    data.players || players;

                updateStatus();

            }


            // ======================================
            // ゲーム終了
            // ======================================

            if (
                data.type ===
                "game-over"
            ) {

                gamePhase =
                    "finished";

                coins = [];

                updateReadyButton();

                showGameOver(
                    data.ranking || []
                );

            }


            // ======================================
            // エラー
            // ======================================

            if (data.type === "error") {

                alert(data.message);

            }


            // ======================================
            // チャット
            // ======================================

            if (data.type === "chat") {

                addChatMessage(
                    data.name,
                    data.text
                );

            }

        }
    );


    // ----------------------------------------------
    // 接続エラー
    // ----------------------------------------------

    socket.addEventListener(
        "error",
        () => {

            alert(
                "サーバーとの接続でエラーが発生しました。"
            );

        }
    );


    // ----------------------------------------------
    // 切断
    // ----------------------------------------------

    socket.addEventListener(
        "close",
        () => {

            gameStatus.textContent =
                "サーバーとの接続が切れました";

            readyButton.disabled = true;

        }
    );

});


// ==================================================
// 準備完了ボタン
// ==================================================

readyButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            socket.readyState !==
            WebSocket.OPEN
        ) {

            return;

        }

        if (gamePhase === "waiting") {

            socket.send(
                JSON.stringify({
                    type: "ready"
                })
            );

        }

        else if (
            gamePhase === "finished"
        ) {

            socket.send(
                JSON.stringify({
                    type: "next-game"
                })
            );

        }

    }
);


// ==================================================
// プレイヤー人数表示
// ==================================================

function updatePlayerCount() {

    playerCountDisplay.textContent =
        `参加人数：${players.length} / ${maxPlayers}`;

}


// ==================================================
// 準備ボタン表示
// ==================================================

function updateReadyButton() {

    if (gamePhase === "waiting") {

        const me =
            players.find(
                player =>
                    player.id === myPlayerId
            );

        const ready =
            me && me.ready;

        if (ready) {

            readyButton.textContent =
                "準備完了済み";

            readyButton.disabled = true;

        } else {

            readyButton.textContent =
                "準備完了";

            readyButton.disabled =
                players.length < maxPlayers;

        }

    }

    else if (
        gamePhase === "countdown"
    ) {

        readyButton.textContent =
            "ゲーム開始！";

        readyButton.disabled = true;

    }

    else if (
        gamePhase === "playing"
    ) {

        readyButton.textContent =
            "ゲーム中";

        readyButton.disabled = true;

    }

    else if (
        gamePhase === "finished"
    ) {

        readyButton.textContent =
            "次のゲームの準備完了";

        readyButton.disabled = false;

    }

}


// ==================================================
// 状態表示
// ==================================================

function updateStatus() {

    if (gamePhase === "waiting") {

        const readyCount =
            players.filter(
                player => player.ready
            ).length;

        if (players.length < maxPlayers) {

            gameStatus.textContent =
                `👥 プレイヤーを待っています`;

        } else {

            gameStatus.textContent =
                `✅ 準備完了：${readyCount} / ${maxPlayers}`;

        }

    }

    else if (
        gamePhase === "playing"
    ) {

        gameStatus.textContent =
            `⏱️ ${timeLeft}秒`;

    }

}


// ==================================================
// ゲーム更新
// ==================================================

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
        gamePhase !==
        "playing"
    ) {

        return;

    }


    // ----------------------------------------------
    // 移動速度
    // ----------------------------------------------

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


    // ----------------------------------------------
    // 斜め移動を速くしない
    // ----------------------------------------------

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
            dx *
            speed *
            deltaTime;

        myPlayer.y +=
            dy *
            speed *
            deltaTime;

    }


    // ----------------------------------------------
    // 画面外防止
    // ----------------------------------------------

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


    // ----------------------------------------------
    // サーバーへ位置送信
    // ----------------------------------------------

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


    // ----------------------------------------------
    // コインとの当たり判定
    // ----------------------------------------------

    const playerCenterX =
        myPlayer.x +
        myPlayer.size / 2;

    const playerCenterY =
        myPlayer.y +
        myPlayer.size / 2;

    for (const coin of coins) {

        const dx =
            playerCenterX -
            coin.x;

        const dy =
            playerCenterY -
            coin.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
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


// ==================================================
// 描画
// ==================================================

function draw() {

    console.log("DRAW動いてる");
    
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // ----------------------------------------------
    // コイン
    // ---------------------------------------------
    
    if (gameMode !== "fps") {
    drawCoins(ctx, coins);
}

    // ----------------------------------------------
    // プレイヤー描画
    // ----------------------------------------------

if (gameMode === "fps") {

    // FPSならfps.jsの描画を使う
    drawFPSPlayers(
        ctx,
        players,
        myPlayerId
    );

     // 弾を描画
    drawFPSBullets(ctx);


    // 自分の銃を描画
    drawFPSGun(
        ctx,
        myPlayer
    );

} else {
    // コインゲームは今まで通り
    for (const player of players) {

        if (
            player.id === myPlayerId
        ) {
            continue;
        }

        ctx.fillStyle =
            player.color || "blue";

        ctx.fillRect(
            player.x,
            player.y,
            30,
            30
        );

    }

}


   // ----------------------------------------------
   // 自分
   // ----------------------------------------------

if (gameMode !== "fps") {

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
        myPlayer.y - 7
    );

}


}


// ==================================================
// ゲームループ
// ==================================================

function gameLoop(currentTime) {

    update(currentTime);

    draw();

    requestAnimationFrame(
        gameLoop
    );

}


// ==================================================
// ゲーム終了画面
// ==================================================

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
        "20px";

    result.style.zIndex =
        "1000";

    result.style.minWidth =
        "280px";


    let html =
        "<strong>🏆 GAME OVER</strong><br><br>";


    ranking.forEach((player) => {

        let medal = "";

        if (player.rank === 1) {

            medal = "🥇";

        } else if (
            player.rank === 2
        ) {

            medal = "🥈";

        } else if (
            player.rank === 3
        ) {

            medal = "🥉";

        }


        html +=
            `${medal} ${player.rank}位　` +
            `${escapeHtml(player.name)}　` +
            `${player.score}枚<br>`;

    });


    html += `
    <br>

    <button id="nextGameButton">
        次のゲームへ
    </button>

    <br><br>

    <small>
        全員が準備完了すると次のゲームが始まります
    </small>
`;

    result.innerHTML =
        html;


    document.body.appendChild(
        result
    );
const nextGameButton =
    document.getElementById("nextGameButton");

nextGameButton.addEventListener(
    "click",
    () => {

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {

            alert(
                "サーバーとの接続がありません"
            );

            return;

        }

        nextGameButton.disabled = true;

        nextGameButton.textContent =
            "準備完了！";

        socket.send(
            JSON.stringify({
                type: "next-game"
            })
        );

    }
);
}


// ==================================================
// HTML安全化
// ==================================================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ==================================================
// チャット
// ==================================================

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
