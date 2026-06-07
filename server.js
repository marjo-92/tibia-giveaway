const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set(); 
let currentKeyword = "!losuj";
let currentChatroomId = "";

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    // Inicjalizacja stanu dla nowego okna
    socket.emit('init', {
        participants: Array.from(participants),
        keyword: currentKeyword,
        chatroomId: currentChatroomId
    });

    // Odebranie nowego gracza zweryfikowanego przez przeglądarkę
    socket.on('addPlayer', (username) => {
        if (!participants.has(username)) {
            participants.add(username);
            io.emit('newParticipant', username);
            console.log(`[SERWER] Dodano gracza z czatu: ${username}`);
        }
    });

    socket.on('updateKeyword', (newKeyword) => {
        currentKeyword = newKeyword;
        io.emit('keywordChanged', currentKeyword);
    });

    socket.on('saveChatroomId', (chatroomId) => {
        currentChatroomId = chatroomId;
        io.emit('chatroomIdUpdated', chatroomId);
    });

    socket.on('resetParticipants', () => {
        participants.clear();
        io.emit('participantsReset');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie: ${PORT}`);
});
