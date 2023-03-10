const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 600;

let playerId;
let players = {};
let bombs = [];
let targets = [];

socket.on('connect', () => {
    console.log('connected to server');
});

socket.on('player id', (id) => {
    playerId = id;
});

socket.on('update players', (playerList) => {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';
    playerList.sort((a, b) => b.score - a.score);
    for (const player of playerList) {
        const li = document.createElement('li');
        li.textContent = `${player.name}: ${player.score}`;
        scoreboard.appendChild(li);
    }
});

socket.on('start game', (targetList) => {
    targets = targetList;
});

socket.on('destroy target', (id) => {
    targets.find(t => t.id === id).destroyed = true;
});

socket.on('update score', (id, score) => {
    if (id === playerId) {
        const scoreElem = document.getElementById('score');
        scoreElem.textContent = `Score: ${score}`;
    }
});

socket.on('move player', (id, x, y) => {
    players[id].x = x;
    players[id].y = y;
});

socket.on('drop bomb', (id, x, y) => {
    const bomb = new Bomb(x, y, id === playerId);
    bombs.push(bomb);
});

function joinGame() {
    const name = prompt('Enter your name:');
    socket.emit('new player', name);
}

function movePlayer(x, y) {
    socket.emit('move player', x, y);
}

function dropBomb(x, y) {
    socket.emit('drop bomb', x, y);
}

function checkCollision() {
    socket.emit('check collision');
}

function startGame() {
    socket.emit('start game');
    const introScreen = document.getElementById('intro-screen');
    introScreen.style.display = 'none';
}

function update() {
    requestAnimationFrame(update);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const target of targets) {
        if (!target.destroyed) {
            const img = new Image();
            img.src = 'target.png';
            ctx.drawImage(img, target.x, target.y);
        }
    }

    for (const player of Object.values(players)) {
        const img = new Image();
        img.src = 'plane.png';
        ctx.drawImage(img, player.x, player.y);
    }

    for (const bomb of bombs) {
        bomb.update();
        const img = new Image();
        img.src = 'bomb.png';
        ctx.drawImage(img, bomb.x, bomb.y);
    }

    checkCollision();
}

update();

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowLeft':
            movePlayer(players[playerId].x - 5, players[playerId].y);
            break;
        case 'ArrowRight':
            movePlayer(players[playerId].x + 5, players[playerId].y);
            break;
        case 'ArrowUp':
            movePlayer(players[playerId].x, players[playerId].y - 5);
            break;
        case 'ArrowDown':
            movePlayer(players[playerId].x, players[playerId].y + 5);
            break;
        case 'Space':
            dropBomb(players[playerId].x + 32, players[playerId].y + 32);
            break;
    }
});