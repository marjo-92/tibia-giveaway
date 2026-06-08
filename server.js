const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set();
let currentKeyword = "!losuj";

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Endpoint dla StreamElements
app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    if (content && content.toLowerCase().includes(currentKeyword.toLowerCase())) {
        if (!participants.has(sender)) {
            participants.add(sender);
            io.emit('newParticipant', sender);
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });

    socket.on('updateKeyword', (kw) => { currentKeyword = kw; io.emit('keywordChanged', kw); });
    socket.on('startFight', () => io.emit('triggerFight'));
    socket.on('reset', () => { participants.clear(); io.emit('participantsReset'); });
});

server.listen(process.env.PORT || 3000);
