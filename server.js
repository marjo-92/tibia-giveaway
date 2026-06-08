const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set(); 
let currentKeyword = "a"; // Twoje hasło ustawione na sztywno

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Furtka dla StreamElements
app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    
    console.log(`Log z serwera: Otrzymano od ${sender} treść: ${content}`);
    
    if (content && sender) {
        if (content.toLowerCase().includes(currentKeyword.toLowerCase())) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
                console.log(`Sukces: Dodano gracza ${sender}`);
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), keyword: currentKeyword });

    socket.on('updateKeyword', (newKeyword) => {
        currentKeyword = newKeyword;
        io.emit('keywordChanged', currentKeyword);
    });

    socket.on('startFight', () => io.emit('triggerFight'));
    
    socket.on('reset', () => {
        participants.clear();
        io.emit('participantsReset');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie: ${PORT}`);
});
