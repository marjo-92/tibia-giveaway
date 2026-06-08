const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// Ręczne nagłówki CORS rozbudowane o obsługę preflight (OPTIONS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    
    // Jeśli StreamElements pyta o zgodę przed wysłaniem danych, od razu mówimy OK
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

let participants = new Set(); 
let currentKeyword = "a";

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    console.log("Dane odebrane przez serwer:", req.body);
    const { sender, content } = req.body;
    
    if (sender && content) {
        // Przesyłamy czat dalej
        io.emit('newChat', { sender, content });
        
        // Twoja sprawdzona logika porównywania
        if (content.toLowerCase().trim() === currentKeyword.toLowerCase().trim()) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
            }
        }
    }
    res.status(200).send('OK');
});

// Serwowanie plików statycznych (CSS) na samym dole
app.use(express.static(__dirname));

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
server.listen(PORT, '0.0.0.0', () => console.log(`Serwer działa na porcie: ${PORT}`));
