// ==================================================
// 2D FPS
// ==================================================

console.log("FPS.js 読み込み成功");

// FPS専用処理はここに追加していく
// ==================================================
// FPS チーム選択表示
// ==================================================

const teamSelect =
    document.getElementById("teamSelect");


// ゲームモードが変更されたとき
gameModeInput.addEventListener("change", () => {

    if (gameModeInput.value === "fps") {

        // FPSならチーム選択を表示
        teamSelect.style.display = "block";

    } else {

        // FPS以外なら非表示
        teamSelect.style.display = "none";

    }

});

// ==================================================
// チーム選択
// ==================================================

let myTeam = null;

const teamAButton =
    document.getElementById("teamAButton");

const teamBButton =
    document.getElementById("teamBButton");

const myTeamDisplay =
    document.getElementById("myTeamDisplay");




teamAButton.addEventListener("click", () => {

    myTeam = "A";

    myTeamDisplay.textContent =
        "チーム：🔵 Aチーム";

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({
                type: "change-team",
                team: "A"
            })
        );

    }

});

teamBButton.addEventListener("click", () => {

    myTeam = "B";

    myTeamDisplay.textContent =
        "チーム：🔴 Bチーム";

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({
                type: "change-team",
                team: "B"
            })
        );

    }

});

// ==================================================
// 自分のチーム表示
// ==================================================

function updateTeamDisplay() {

    if (!myTeamDisplay) {
        return;
    }

    if (myTeam === "A") {

        myTeamDisplay.textContent =
            "チーム：🔵 Aチーム";

    } else if (myTeam === "B") {

        myTeamDisplay.textContent =
            "チーム：🔴 Bチーム";

    } else {

        myTeamDisplay.textContent =
            "チーム：未選択";

    }

}
// ==================================================
// FPS プレイヤー描画
// ==================================================

// ==================================================
// FPS プレイヤー描画
// ==================================================

function drawFPSPlayers(ctx, players, myPlayerId) {

    for (const player of players) {

        const x = player.x;
        const y = player.y;

        // ----------------------------
        // チームで色を決める
        // ----------------------------

        if (player.team === "A") {

            ctx.fillStyle = "blue";

        } else if (player.team === "B") {

            ctx.fillStyle = "red";

        } else {

            ctx.fillStyle = "gray";

        }

        // ----------------------------
        // プレイヤー本体
        // ----------------------------

        ctx.fillRect(
            x,
            y,
            30,
            30
        );

        // ----------------------------
        // チーム表示
        // ----------------------------

        ctx.fillStyle = "white";

        ctx.font =
            "12px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
              `${player.name || "名無し"} / ${player.team || "?"}`,
              x + 15,y - 5
              );
        // ----------------------------
        // HP表示
        // ----------------------------

        ctx.fillStyle = "white";

        ctx.font =
            "12px sans-serif";

        ctx.fillText(
            `HP: ${player.hp ?? 100}`,
            x + 15,
            y + 45
        );

    }

}
// ==================================================
// FPS 攻撃
// ==================================================

canvas.addEventListener("click", () => {

    // FPSモード以外では攻撃しない
    if (gameMode !== "fps") {
        return;
    }

    // ゲーム中以外は攻撃しない
    if (gamePhase !== "playing") {
        return;
    }

    // サーバーに攻撃を送る
    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({
                type: "fps-shoot"
            })
        );

    }

});

// ==================================================
// FPS スマホ用・射撃方向ジョイスティック
// ==================================================

const aimControls =
    document.createElement("div");

aimControls.id = "aimControls";

aimControls.innerHTML = `
    <div>
        <button data-aim="up">↑</button>
    </div>

    <div>
        <button data-aim="left">←</button>
        <button data-aim="down">↓</button>
        <button data-aim="right">→</button>
    </div>
`;

aimControls.style.textAlign = "center";
aimControls.style.userSelect = "none";
aimControls.style.position = "fixed";
aimControls.style.right = "20px";
aimControls.style.bottom = "20px";

document.body.appendChild(aimControls);


// 射撃方向
let shootDirection = {
    x: 0,
    y: -1
};


// ボタン処理
aimControls
    .querySelectorAll("button")
    .forEach((button) => {

        button.style.width = "60px";
        button.style.height = "60px";
        button.style.fontSize = "25px";
        button.style.margin = "3px";
        button.style.touchAction = "none";

        button.addEventListener(
            "pointerdown",
            (event) => {

                event.preventDefault();

                const direction =
                    button.dataset.aim;

                if (direction === "up") {
                    shootDirection = {
                        x: 0,
                        y: -1
                    };
                }

                if (direction === "down") {
                    shootDirection = {
                        x: 0,
                        y: 1
                    };
                }

                if (direction === "left") {
                    shootDirection = {
                        x: -1,
                        y: 0
                    };
                }

                if (direction === "right") {
                    shootDirection = {
                        x: 1,
                        y: 0
                    };
                }

            }
        );

    });

    // ==================================================
// FPS スマホ用・撃つボタン
// ==================================================

const shootButton =
    document.createElement("button");

shootButton.id = "shootButton";

shootButton.textContent = "🔫 撃つ";

shootButton.style.position = "fixed";
shootButton.style.right = "45px";
shootButton.style.bottom = "180px";

shootButton.style.width = "100px";
shootButton.style.height = "60px";

shootButton.style.fontSize = "20px";
shootButton.style.touchAction = "none";

document.body.appendChild(shootButton);


// ==================================================
// 撃つ
// ==================================================

shootButton.addEventListener(
    "pointerdown",
    (event) => {

        event.preventDefault();

        // FPS以外では撃たない
        if (gameMode !== "fps") {
            return;
        }

        // ゲーム中以外では撃たない
        if (gamePhase !== "playing") {
            return;
        }

        // サーバーへ射撃方向を送る
        if (
            socket &&
            socket.readyState === WebSocket.OPEN
        ) {

            socket.send(
                JSON.stringify({
                    type: "fps-shoot",
                    direction: shootDirection
                })
            );

        }

    }
);

// ==================================================
// FPS 銃の描画
// ==================================================

function drawFPSGun(ctx, player) {

    if (!player) {
        return;
    }

    // 現在の射撃方向
    const dx = shootDirection.x;
    const dy = shootDirection.y;

    // プレイヤーの中心
    const centerX =
        player.x + 15;

    const centerY =
        player.y + 15;

    // 銃の長さ
    const gunLength = 25;

    // 銃口
    const gunX =
        centerX + dx * gunLength;

    const gunY =
        centerY + dy * gunLength;

    // 銃を描く
    ctx.strokeStyle = "black";
    ctx.lineWidth = 8;

    ctx.beginPath();

    ctx.moveTo(
        centerX,
        centerY
    );

    ctx.lineTo(
        gunX,
        gunY
    );

    ctx.stroke();

    // 銃口
    ctx.fillStyle = "black";

    ctx.beginPath();

    ctx.arc(
        gunX,
        gunY,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();

}

// ==================================================
// FPS 弾の描画
// ==================================================

let fpsBullets = [];

function drawFPSBullets(ctx) {

    for (const bullet of fpsBullets) {

        ctx.fillStyle = "black";

        ctx.beginPath();

        ctx.arc(
            bullet.x,
            bullet.y,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}
