const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// Ręczne nagłówki CORS – to musi być, żeby StreamElements mogło "rozmawiać" z serwerem
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let participants = new Set(); 
let currentKeyword = "a";

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    
    if (sender && content) {
        // Przesyłamy czat dalej
        io.emit('newChat', { sender, content });
        
        // Logika hasła (bez zmian, Twoja sprawdzona wersja)
        if (content.toLowerCase().trim() === currentKeyword.toLowerCase().trim()) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });
    
    socket.on('updateKeyword', (kw) => { 
        currentKeyword = kw; 
        io.emit('keywordChanged', kw); 
    });
    
    socket.on('startFight', () => io.emit('triggerFight'));
    socket.on('reset', () => { 
        participants.clear(); 
        io.emit('participantsReset'); 
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serwer działa na porcie: ${PORT}`));
