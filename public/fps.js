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
            20,
            20
        );

        // ----------------------------
        // チーム表示
        // ----------------------------

        ctx.fillStyle = "white";

        ctx.font =
            "12px sans-serif";
        ctx.textAlign = "left";

        ctx.fillText(
            `${player.name || "名無し"} / ${player.team || "?"}`,
            x + 15, y - 5
        );
        // ----------------------------
        // HP表示
        // ----------------------------
        // 味方だけHPを表示
        if (player.team === myTeam) {

            // HP表示の背景
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(
                x + 8,
                y + 20,
                45,
                18
            );

            // HP表示
            ctx.fillStyle = "white";
            ctx.font = "12px sans-serif";

            ctx.fillText(
                `HP: ${player.hp ?? 100}`,
                x + 12,
                y + 33
            );
        }

    }
}
// ==================================================
// FPS PC用・マウス照準
// ==================================================

canvas.addEventListener("mousemove", (event) => {

    if (gameMode !== "fps") {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    // マウスの位置をキャンバス座標に変換
    const mouseX =
        (event.clientX - rect.left) *
        (canvas.width / rect.width);

    const mouseY =
        (event.clientY - rect.top) *
        (canvas.height / rect.height);

    // 自分の中心
    const centerX =
        myPlayer.x + 15;

    const centerY =
        myPlayer.y + 15;

    // マウス方向
    let dx = mouseX - centerX;
    let dy = mouseY - centerY;

    const length =
        Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
        return;
    }

    // 正規化
    dx /= length;
    dy /= length;

    shootDirection = {
        x: dx,
        y: dy
    };

});


// ===============================================
// FPS PC用・射撃
// ===============================================

canvas.addEventListener("click", () => {

    if (gameMode !== "fps") {
        return;
    }

    if (gamePhase !== "playing") {
        return;
    }

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

});


// 射撃方向
let shootDirection = {
    x: 0,
    y: -1
};


// ==================================================
// FPS スマホ用・右スティック（照準）
// ==================================================

// PCではスティックを非表示
const isMobile =
    /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
    );

const aimStick = document.createElement("div");

aimStick.id = "aimStick";

aimStick.style.position = "fixed";
aimStick.style.right = "30px";
aimStick.style.bottom = "30px";

aimStick.style.width = "120px";
aimStick.style.height = "120px";

aimStick.style.border = "3px solid white";
aimStick.style.borderRadius = "50%";

aimStick.style.background =
    "rgba(255,255,255,0.15)";

aimStick.style.touchAction = "none";

if (isMobile) {
    document.body.appendChild(aimStick);
}


// 右スティックの中心
const aimStickKnob = document.createElement("div");

aimStickKnob.style.position = "absolute";

aimStickKnob.style.left = "35px";
aimStickKnob.style.top = "35px";

aimStickKnob.style.width = "50px";
aimStickKnob.style.height = "50px";

aimStickKnob.style.borderRadius = "50%";

aimStickKnob.style.background =
    "rgba(255,255,255,0.7)";

aimStickKnob.style.touchAction = "none";

aimStick.appendChild(aimStickKnob);


// ==================================================
// 右スティック操作
// ==================================================

// ==================================================
// 右スティック操作・外側で連射
// ==================================================

let aimShooting = false;
let aimShootTimer = null;

function shootFPS() {
    if (gameMode !== "fps") {
        return;
    }

    if (gamePhase !== "playing") {
        return;
    }

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

function startAimShooting() {
    if (aimShooting) {
        return;
    }

    aimShooting = true;

    shootFPS();

    aimShootTimer = setInterval(() => {
        shootFPS();
    }, 150);
}

function stopAimShooting() {
    aimShooting = false;

    if (aimShootTimer) {
        clearInterval(aimShootTimer);
        aimShootTimer = null;
    }
}

aimStick.addEventListener(
    "pointerdown",
    (event) => {
        aimStick.setPointerCapture(event.pointerId);
    }
);

aimStick.addEventListener(
    "pointermove",
    (event) => {

        if (event.buttons === 0) {
            return;
        }

        const rect =
            aimStick.getBoundingClientRect();

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

        if (distance > 5) {
            shootDirection = {
                x: dx / maxDistance,
                y: dy / maxDistance
            };
        }

        aimStickKnob.style.left =
            `${35 + dx}px`;

        aimStickKnob.style.top =
            `${35 + dy}px`;

        // 外側まで倒したら射撃開始
        if (distance >= maxDistance * 0.85) {
            startAimShooting();
        } else {
            stopAimShooting();
        }
    }
);

function resetAimStick() {

    stopAimShooting();

    aimStickKnob.style.left = "35px";
    aimStickKnob.style.top = "35px";
}

aimStick.addEventListener(
    "pointerup",
    resetAimStick
);

aimStick.addEventListener(
    "pointercancel",
    resetAimStick
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


// ==================================================
// FPS MAP 描画
// ==================================================

function drawFPSMap(ctx) {
    const map = window.maps[window.currentMap || "map1"];
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, map.width, map.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, map.width - 20, map.height - 20);

    for (const wall of map.walls) {
        ctx.fillStyle = "#555";
        ctx.fillRect(
            wall.x,
            wall.y,
            wall.width,
            wall.height
        );
    }
}
