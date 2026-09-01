const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const nameInput = document.getElementById("nameInput");

const login = document.getElementById("login");
const game = document.getElementById("game");

let socket;

const myPlayer = {
    x: 200,
    y: 200,
    size: 30
};

const otherPlayers = [];

const keys = {};

// ====================
// PC キーボード操作
// ====================

document.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});

// ====================
// スマホ操作ボタンを作る
// ====================

const mobileControls = document.createElement("div");

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

mobileControls.querySelectorAll("button").forEach((button) => {

    button.style.width = "70px";
    button.style.height = "70px";
    button.style.fontSize = "30px";
    button.style.margin = "5px";
    button.style.touchAction = "none";

    const key = button.dataset.key;

    button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys[key] = true;
});

button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    keys[key] = false;
});

button.addEventListener("pointercancel", (event) => {
    event.preventDefault();
    keys[key] = false;
});

    // タッチキャンセル
    button.addEventListener("pointercancel", () => {
        keys[key] = false;
    });
});

// ゲーム画面の下にボタンを追加
game.appendChild(mobileControls);

// ====================
// ルーム参加
// ====================

joinButton.addEventListener("click", () => {

     const name = nameInput.value.trim();
     const room = roomInput.value.trim();
    if (!room) {
        alert("ルームコードを入力してください");
        return;
    }

    socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    );

    socket.addEventListener("open", () => {

        socket.send(JSON.stringify({
            type: "join",
            room: room,
            name: name 
        }));

        login.style.display = "none";
        game.style.display = "block";

        requestAnimationFrame(gameLoop);
    });

    socket.addEventListener("message", (event) => {

        const data = JSON.parse(event.data);
if (data.type === "chat") {
    addChatMessage(data.name, data.text);
}
        if (data.type === "player") {

            let player = otherPlayers.find(
                p => p.id === data.id
            );

            if (!player) {

                player = {
                    id: data.id,
                    x: data.x,
                    y: data.y
                };

                otherPlayers.push(player);
            }

            player.x = data.x;
            player.y = data.y;
        }
    });
});

// ====================
// プレイヤーID
// ====================

const playerId =
    Math.random().toString(36).substring(2);

// ====================
// プレイヤー更新
// ====================

function update() {

    const speed = 4;

    if (keys["w"] || keys["arrowup"]) {
        myPlayer.y -= speed;
    }

    if (keys["s"] || keys["arrowdown"]) {
        myPlayer.y += speed;
    }

    if (keys["a"] || keys["arrowleft"]) {
        myPlayer.x -= speed;
    }

    if (keys["d"] || keys["arrowright"]) {
        myPlayer.x += speed;
    }

    myPlayer.x = Math.max(
        0,
        Math.min(
            canvas.width - myPlayer.size,
            myPlayer.x
        )
    );

    myPlayer.y = Math.max(
        0,
        Math.min(
            canvas.height - myPlayer.size,
            myPlayer.y
        )
    );

    if (socket && socket.readyState === WebSocket.OPEN) {

        socket.send(JSON.stringify({
            type: "player",
            id: playerId,
            x: myPlayer.x,
            y: myPlayer.y
        }));
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

    // 自分
    ctx.fillStyle = "red";

    ctx.fillRect(
        myPlayer.x,
        myPlayer.y,
        myPlayer.size,
        myPlayer.size
    );

    // 他のプレイヤー
    ctx.fillStyle = "blue";

    for (const player of otherPlayers) {

        ctx.fillRect(
            player.x,
            player.y,
            30,
            30
        );
    }
}

// ====================
// ゲームループ
// ====================

function gameLoop() {

    update();
    draw();

    requestAnimationFrame(gameLoop);
}
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");

function addChatMessage(name, text) {
    const message = document.createElement("div");
    message.textContent = `${name}: ${text}`;

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChat() {
    const text = chatInput.value.trim();

    if (!text) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert("まだゲームに接続されていません");
        return;
    }

    socket.send(JSON.stringify({
        type: "chat",
        text: text
    }));


    chatInput.value = "";
}

chatSend.addEventListener("click", sendChat);

chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendChat();
    }
});
