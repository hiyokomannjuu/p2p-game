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
