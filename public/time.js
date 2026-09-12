// ==================================================
// ゲーム時間設定
// ==================================================

const GAME_TIMES = {
    coin: 60,       // コイン集め：1分
    fps: 150,       // TDM：2分30秒
    battle: 180,    // バトル：3分
    survival: 300   // 生き残り：5分
};


// ゲームモードから時間を取得
function getGameTime(gameMode) {

    return GAME_TIMES[gameMode] ?? 60;

}
