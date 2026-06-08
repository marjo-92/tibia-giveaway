const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// --- TO JEST TEN BRAKUJĄCY FRAGMENT (CORS) ---
// Bez tego StreamElements nie może wysyłać wiadomości do serwera
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
// ---------------------------------------------

// Odbieranie wiadomości ze StreamElements
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

// Serwowanie plików HTML i CSS
app.use(express.static(__dirname));

let participants = new Set();
let currentKeyword = "a";

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });
    
    socket.on('updateKeyword', (kw) => { 
        currentKeyword = kw; 
    });
    
    socket.on('reset', () => { 
        participants.clear(); 
        io.emit('participantsReset'); 
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serwer działa na porcie: ${PORT}`));
