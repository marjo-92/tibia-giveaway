const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set(); 
let currentKeyword = "a";

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Endpoint odbierający dane od StreamElements
app.post('/new-message', (req, res) => {
    // Logujemy wszystko, co przychodzi, aby debugować w logach Rendera
    console.log("Otrzymano dane:", req.body);
    
    // Pobieramy dane z obiektu (uwzględniając, że czasem mogą być zagnieżdżone)
    const sender = req.body.sender || "Nieznany";
    const content = req.body.content || "";
    
    if (content) {
        // Przesyłamy do frontendu
        io.emit('newChat', { sender: sender, content: content });
        
        // Sprawdzamy hasło
        if (content.toLowerCase().includes(currentKeyword.toLowerCase())) {
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
    socket.on('updateKeyword', (kw) => { currentKeyword = kw; io.emit('keywordChanged', kw); });
    socket.on('startFight', () => io.emit('triggerFight'));
    socket.on('reset', () => { participants.clear(); io.emit('participantsReset'); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Serwer startuje na porcie: ${PORT}`); });
