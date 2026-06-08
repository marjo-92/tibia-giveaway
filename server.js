const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// SERWUJE PLIKI Z TEGO FOLDERU (index.html, style.css, itd.)
app.use(express.static(__dirname));
app.use(express.json());

let participants = new Set();
let currentKeyword = "a";

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    if (sender && content) {
        if (content.toLowerCase().trim() === currentKeyword.toLowerCase().trim()) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender); // Wysyłamy do frontendu
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });
    socket.on('updateKeyword', (kw) => { currentKeyword = kw; });
    socket.on('reset', () => { participants.clear(); io.emit('participantsReset'); });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serwer działa na porcie: ${PORT}`));
