const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set();
let config = { tcAmount: 0, password: "", excluded: [] };

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    
    // Wysyłamy czat do interfejsu
    io.emit('newChat', { sender, content });

    // Sprawdzamy hasło i czy użytkownik nie jest na czarnej liście
    if (sender && content && content.toLowerCase().trim() === config.password.toLowerCase().trim()) {
        if (!config.excluded.includes(sender) && !participants.has(sender)) {
            participants.add(sender);
            io.emit('newParticipant', { sender, count: participants.size });
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.on('updateConfig', (data) => {
        config = data;
        io.emit('configUpdated', config);
    });
    socket.on('reset', () => { participants.clear(); io.emit('participantsReset'); });
});

server.listen(3000);
