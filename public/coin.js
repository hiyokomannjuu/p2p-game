// コインの描画
function drawCoins(ctx, coins) {

    for (const coin of coins) {

        ctx.beginPath();

        ctx.arc(
            coin.x,
            coin.y,
            11,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "gold";
        ctx.fill();

        ctx.strokeStyle = "orange";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "black";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            "$",
            coin.x,
            coin.y
        );
    }
}
//コインの当たり判定
function checkCoinCollision(player, coins, socket) {

    const playerCenterX =
        player.x + player.size / 2;

    const playerCenterY =
        player.y + player.size / 2;

    for (const coin of coins) {

        const dx =
            playerCenterX - coin.x;

        const dy =
            playerCenterY - coin.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (distance < 25) {

            if (
                socket &&
                socket.readyState === WebSocket.OPEN
            ) {

                socket.send(
                    JSON.stringify({

                        type: "collect-coin",

                        coinId: coin.id

                    })
                );

            }

            break;

        }

    }

}
