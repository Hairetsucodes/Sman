const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017?appName=Spammaman', { useNewUrlParser: true });

const playerSchema = new mongoose.Schema({
    name: String,
    score: Number,
});

const Player = mongoose.model('Player', playerSchema);

const targetPositions = [
    { x: 200, y: 100 },
    { x: 400, y: 200 },
    { x: 600, y: 150 },
    { x: 800, y: 300 },
    { x: 1000, y: 250 }
];

let players = [];
let bombs = [];
let targets = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('new player', (name) => {
        const player = new Player({ name, score: 0 });
        players.push({ id: socket.id, player });
        socket.emit('player id', socket.id);
        console.log(`player ${name} joined the game`);
        io.emit('update players', players.map(p => ({ name: p.player.name, score: p.player.score })));
    });

    socket.on('move player', (x, y) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.x = x;
            player.y = y;
            io.emit('move player', socket.id, x, y);
        }
    });

    socket.on('drop bomb', (x, y) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            const bomb = { x, y, playerId: socket.id };
            bombs.push(bomb);
            io.emit('drop bomb', socket.id, x, y);
        }
    });

    socket.on('check collision', () => {
        for (const bomb of bombs) {
            const bombRect = { x: bomb.x, y: bomb.y, width: 32, height: 32 };
            for (const target of targets) {
                const targetRect = { x: target.x, y: target.y, width: 64, height: 64 };
                if (checkRectCollision(bombRect, targetRect)) {
                    target.destroyed = true;
                    io.emit('destroy target', target.id);
                    const player = players.find(p => p.id === bomb.playerId);
                    if (player) {
                        player.player.score += 10;
                        io.emit('update score', socket.id, player.player.score);
                    }
                }
            }
        }
    });

    socket.on('start game', () => {
        targets = targetPositions.map((pos, i) => ({ id: i, x: pos.x, y: pos.y, destroyed: false }));
        io.emit('start game', targets);
    });
});

function checkRectCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y);
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});