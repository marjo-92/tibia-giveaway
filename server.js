const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// 1. API - musi być PRZED express.static
app.post('/new-message', (req, res) => {
    console.log("OTRZYMANO DANE Z WIDGETU:", req.body);
    const { sender, content } = req.body;
    
    if (sender && content) {
        if (content.toLowerCase().trim() === currentKeyword.toLowerCase().trim()) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
            }
        }
    }
    res.status(200).send('OK');
});

// 2. PLIKI STATYCZNE (index.html, style.css)
app.use(express.static(__dirname));

let participants = new Set();
let currentKeyword = "a";

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });
    socket.on('updateKeyword', (kw) => { currentKeyword = kw; });
    socket.on('reset', () => { 
        participants.clear(); 
        io.emit('participantsReset'); 
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serwer działa na porcie: ${PORT}`));
