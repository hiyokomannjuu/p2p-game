var maps = {
    map1: {
        width: 1000,
        height: 500,

        spawnA: {
            x: 80,
            y: 235
        },

        spawnB: {
            x: 890,
            y: 235
        },

        walls: [
            { x: 140, y: 140, width: 30, height: 80 },
            { x: 140, y: 280, width: 30, height: 80 },

            { x: 250, y: 190, width: 30, height: 120 },

            { x: 830, y: 140, width: 30, height: 80 },
            { x: 830, y: 280, width: 30, height: 80 },

            { x: 720, y: 190, width: 30, height: 120 },

            { x: 400, y: 150, width: 50, height: 50 },
            { x: 550, y: 150, width: 50, height: 50 },

            { x: 400, y: 300, width: 50, height: 50 },
            { x: 550, y: 300, width: 50, height: 50 },

            { x: 200, y: 400, width: 600, height: 60 },
            { x: 200, y: 40, width: 600, height: 60 }
        ]
    },

    map2: {
        width: 1000,
        height: 500,

        spawnA: {
            x: 80,
            y: 235
        },

        spawnB: {
            x: 890,
            y: 235
        },

        walls: []
    },

    map3: {
        width: 1000,
        height: 500,

        spawnA: {
            x: 80,
            y: 235
        },

        spawnB: {
            x: 890,
            y: 235
        },

        walls: []
    }
};

// Node.js（server.js）からも使えるようにする
if (typeof module !== "undefined") {
    module.exports = { maps };
}
