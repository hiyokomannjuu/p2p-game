const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const nameInput = document.getElementById("nameInput");
const playerCountInput = document.getElementById("playerCount");
const gameModeInput =
    document.getElementById("gameMode");
const gameTimeInput =
    document.getElementById("gameTime");
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
//プレイヤーのスポーン場所
const myPlayer = {
    x: 40,
    y: 240,
    size: 20
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

// ====================
// FPS スコアボード
// ====================

let scoreboardVisible = false;

document.addEventListener("keydown", (e) => {

    if (e.code !== "Tab") {
        return;
    }

    if (gameMode !== "fps") {
        return;
    }

    e.preventDefault();

    scoreboardVisible = true;

    updateScoreboard();
});

document.addEventListener("keyup", (e) => {

    if (e.code !== "Tab") {
        return;
    }

    scoreboardVisible = false;

    updateScoreboard();
});

// ==================================================
// スマホ用 左スティック
// ==================================================

const moveStick = document.createElement("div");

moveStick.id = "moveStick";

moveStick.style.position = "fixed";
moveStick.style.left = "30px";
moveStick.style.bottom = "30px";

moveStick.style.width = "120px";
moveStick.style.height = "120px";

moveStick.style.border = "3px solid white";
moveStick.style.borderRadius = "50%";

moveStick.style.background = "rgba(255,255,255,0.15)";
moveStick.style.touchAction = "none";

document.body.appendChild(moveStick);

moveStick.style.display =
    /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
    )
        ? "block"
        : "none";


// スティック本体
const moveStickKnob = document.createElement("div");

moveStickKnob.style.position = "absolute";

moveStickKnob.style.left = "35px";
moveStickKnob.style.top = "35px";

moveStickKnob.style.width = "50px";
moveStickKnob.style.height = "50px";

moveStickKnob.style.borderRadius = "50%";

moveStickKnob.style.background =
    "rgba(255,255,255,0.7)";

moveStickKnob.style.touchAction = "none";

moveStick.appendChild(moveStickKnob);


// スティックの入力値
let moveStickX = 0;
let moveStickY = 0;


// スティック操作
moveStick.addEventListener(
    "pointermove",
    (event) => {

        if (event.buttons === 0) {
            return;
        }

        const rect =
            moveStick.getBoundingClientRect();

        const centerX =
            rect.left + rect.width / 2;

        const centerY =
            rect.top + rect.height / 2;

        let dx =
            event.clientX - centerX;

        let dy =
            event.clientY - centerY;

        const maxDistance = 35;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance > maxDistance) {

            dx =
                dx / distance *
                maxDistance;

            dy =
                dy / distance *
                maxDistance;

        }

        moveStickX =
            dx / maxDistance;

        moveStickY =
            dy / maxDistance;

        moveStickKnob.style.left =
            `${35 + dx}px`;

        moveStickKnob.style.top =
            `${35 + dy}px`;

    }
);


// 指を離した
function resetMoveStick() {

    moveStickX = 0;
    moveStickY = 0;

    moveStickKnob.style.left = "35px";
    moveStickKnob.style.top = "35px";

}

moveStick.addEventListener(
    "pointerup",
    resetMoveStick
);

moveStick.addEventListener(
    "pointercancel",
    resetMoveStick
);
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

                gameTime: Number(gameTimeInput.value),

                map: document.getElementById("mapSelect").value,


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

            if (data.type === "team-kills") {

                const teamKillsDisplay =
                    document.getElementById("teamKillsDisplay");

                if (teamKillsDisplay) {

                    teamKillsDisplay.style.display = "block";

                    teamKillsDisplay.textContent =
                        `🔵 Aチーム：${data.teamKills.A}キル　` +
                        `🔴 Bチーム：${data.teamKills.B}キル`;

                }

            }

            if (data.type === "team-kills") {

                const teamKillsDisplay =
                    document.getElementById("teamKillsDisplay");

                if (teamKillsDisplay) {

                    teamKillsDisplay.style.display = "block";

                    teamKillsDisplay.textContent =
                        `🔵 Aチーム：${data.teamKills.A}キル　` +
                        `🔴 Bチーム：${data.teamKills.B}キル`;

                }

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
                window.currentMap =
                    data.map || "map1";
                timeLeft =
                    data.timeLeft || 60;

                updateMobileScoreboardButton();

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

                updateMobileScoreboardButton();

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
                    data.result
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

        if (timeLeft === 0) {
            gameStatus.textContent = `⏱️ 無制限`;
        } else {
            gameStatus.textContent = `⏱️ ${timeLeft}秒`;
        }

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

    //プレーヤーの速さ
    const speed = 160;

    let dx = 0;
    let dy = 0;


    // キーボード移動
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


    // スマホ左スティック
    if (
        typeof moveStickX !== "undefined" &&
        typeof moveStickY !== "undefined"
    ) {

        // スティックが実際に動いているときだけ入力する
        if (
            Math.abs(moveStickX) > 0.05 ||
            Math.abs(moveStickY) > 0.05
        ) {

            dx += moveStickX;
            dy += moveStickY;

        }

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

        // 移動前の位置を保存
        const oldX = myPlayer.x;
        const oldY = myPlayer.y;

        // 移動
        myPlayer.x +=
            dx *
            speed *
            deltaTime;

        myPlayer.y +=
            dy *
            speed *
            deltaTime;

        // 壁との当たり判定
        const currentMap =
            maps[window.currentMap || "map1"];

        if (
            gameMode === "fps" &&
            currentMap
        ) {

            for (const wall of currentMap.walls) {

                const hit =
                    myPlayer.x < wall.x + wall.width &&
                    myPlayer.x + myPlayer.size > wall.x &&
                    myPlayer.y < wall.y + wall.height &&
                    myPlayer.y + myPlayer.size > wall.y;

                if (hit) {

                    // 壁にぶつかったら元の位置に戻す
                    myPlayer.x = oldX;
                    myPlayer.y = oldY;

                    break;
                }
            }
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

            // FPSマップを描画
            drawFPSMap(ctx);

            // プレイヤーを描画
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

    function showGameOver(resultData) {

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


        if (resultData.type === "ranking") {

            resultData.ranking.forEach((player) => {

                let medal = "";

                if (player.rank === 1) {
                    medal = "🥇";
                } else if (player.rank === 2) {
                    medal = "🥈";
                } else if (player.rank === 3) {
                    medal = "🥉";
                }

                html +=
                    `${medal} ${player.rank}位 ` +
                    `${escapeHtml(player.name)} ` +
                    `${player.score}枚<br>`;
            });

            const myResult =
                resultData.ranking.find(
                    (player) =>
                        player.id === myPlayerId
                );

            if (myResult) {

                html += `
            <hr>

            <strong>📊 あなたの成績</strong><br><br>

            🔫 キル：${myResult.kills}<br>
            💀 デス：${myResult.deaths}<br>
            💥 与ダメージ：${myResult.damageDealt}<br>
            🛡️ 被ダメージ：${myResult.damageTaken}<br>
        `;

            }

        }
        if (resultData.type === "tdm") {

            const teamKills = resultData.teamKills;

            html += `
        🔵 Aチーム：${teamKills.A}キル<br>
        🔴 Bチーム：${teamKills.B}キル<br><br>
    `;

            if (teamKills.A > teamKills.B) {

                html += "🏆 Aチームの勝利！<br>";

            } else if (teamKills.B > teamKills.A) {

                html += "🏆 Bチームの勝利！<br>";

            } else {

                html += "🤝 引き分け！<br>";

            }

            const myResult =
                resultData.players.find(
                    (player) =>
                        player.id === myPlayerId
                );

            if (myResult) {

                html += `
            <hr>

            <strong>📊 あなたの成績</strong><br><br>

            🔫 キル：${myResult.kills}<br>
            💀 デス：${myResult.deaths}<br>
            💥 与ダメージ：${myResult.damageDealt}<br>
            🛡️ 被ダメージ：${myResult.damageTaken}<br>
        `;
            }
        }


        html += `
    <br>

    <button id="detailButton">
        詳細を見る
    </button>

    <br><br>

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
        const detailButton =
            document.getElementById("detailButton");

        detailButton.onclick = () => {
            alert("詳細成績を表示する予定！");
        };
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

    // ==================================================
    // FPS スコアボード表示
    // ==================================================

    function updateScoreboard() {

        let scoreboard = document.getElementById("fpsScoreboard");

        // 初回だけ作る
        if (!scoreboard) {

            scoreboard = document.createElement("div");

            scoreboard.id = "fpsScoreboard";

            scoreboard.style.position = "fixed";
            scoreboard.style.top = "50%";
            scoreboard.style.left = "50%";
            scoreboard.style.transform = "translate(-50%, -50%)";

            scoreboard.style.width = "600px";
            scoreboard.style.maxWidth = "90%";

            scoreboard.style.background = "rgba(0, 0, 0, 0.65)";
            scoreboard.style.color = "rgba(255,255,255,0.8)";

            scoreboard.style.padding = "15px";
            scoreboard.style.borderRadius = "8px";

            scoreboard.style.zIndex = "9999";

            scoreboard.style.fontFamily = "sans-serif";
            scoreboard.style.fontSize = "14px";

            document.body.appendChild(scoreboard);
        }

        // 非表示
        if (!scoreboardVisible || gameMode !== "fps") {
            scoreboard.style.display = "none";
            return;
        }

        scoreboard.style.display = "block";

        // チームごとに分ける
        const teamA = players.filter(p => p.team === "A");
        const teamB = players.filter(p => p.team === "B");

        let html = "";

        html += `
        <div style="text-align:center;font-size:18px;margin-bottom:10px;">
            スコアボード
        </div>
    `;

        // Aチーム
        html += `
        <div style="margin-bottom:12px;">
            <div style="font-size:16px;">
                🔵 Aチーム
            </div>

            <div style="display:grid;grid-template-columns:1fr 60px 60px 100px;gap:8px;opacity:0.85;">
                <span>名前</span>
                <span>K</span>
                <span>D</span>
                <span>ダメージ</span>
            </div>
    `;

        for (const player of teamA) {

            html += `
            <div style="display:grid;grid-template-columns:1fr 60px 60px 100px;gap:8px;">
                <span>${player.name}</span>
                <span>${player.kills ?? 0}</span>
                <span>${player.deaths ?? 0}</span>
                <span>${player.damageDealt ?? 0}</span>
            </div>
        `;
        }

        html += `</div>`;

        // Bチーム
        html += `
        <div>
            <div style="font-size:16px;">
                🔴 Bチーム
            </div>

            <div style="display:grid;grid-template-columns:1fr 60px 60px 100px;gap:8px;opacity:0.85;">
                <span>名前</span>
                <span>K</span>
                <span>D</span>
                <span>ダメージ</span>
            </div>
    `;

        for (const player of teamB) {

            html += `
            <div style="display:grid;grid-template-columns:1fr 60px 60px 100px;gap:8px;">
                <span>${player.name}</span>
                <span>${player.kills ?? 0}</span>
                <span>${player.deaths ?? 0}</span>
                <span>${player.damageDealt ?? 0}</span>
            </div>
        `;
        }

        html += `</div>`;

        scoreboard.innerHTML = html;
    }
    // ==================================================
    // スマホ版 FPS スコアボード
    // ==================================================

    const mobileScoreboardButton =
        document.getElementById("mobileScoreboardButton");

    if (mobileScoreboardButton) {

        // 指で押した
        mobileScoreboardButton.addEventListener("touchstart", (e) => {

            e.preventDefault();

            if (gameMode !== "fps") {
                return;
            }

            scoreboardVisible = true;
            updateScoreboard();
        });

        // 指を離した
        mobileScoreboardButton.addEventListener("touchend", (e) => {

            e.preventDefault();

            scoreboardVisible = false;
            updateScoreboard();
        });

        // マウスでもテストできるようにする
        mobileScoreboardButton.addEventListener("mousedown", () => {

            if (gameMode !== "fps") {
                return;
            }

            scoreboardVisible = true;
            updateScoreboard();
        });

        mobileScoreboardButton.addEventListener("mouseup", () => {

            scoreboardVisible = false;
            updateScoreboard();
        });
    }

    // スマホ用スコアボードボタンの表示
    // FPSのときだけスマホ用スコアボードボタンを表示
    function updateMobileScoreboardButton() {

        const button =
            document.getElementById("mobileScoreboardButton");

        if (!button) {
            return;
        }

        if (gameMode === "fps") {
            button.style.display = "inline-block";
        } else {
            button.style.display = "none";
        }
    }
    // ====================
    // チャット開閉
    // ====================

    const chatToggleButton =
        document.getElementById("chatToggleButton");

    const chatWindow =
        document.getElementById("chatWindow");

    chatToggleButton.addEventListener("click", () => {

        if (chatWindow.style.display === "block") {

            chatWindow.style.display = "none";

        } else {

            chatWindow.style.display = "block";

        }

    });
