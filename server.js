const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set();
let config = { tc: 0, pass: "", excluded: [] };

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    console.log("Dane odebrane:", req.body); // Sprawdź logi na Renderze!
    const { sender, content } = req.body;

    if (sender && content) {
        // Przesyłanie na czat na stronie (nowy event: chatMessage)
        io.emit('chatMessage', { sender, content });

        // Logika losowania
        if (content.toLowerCase().trim() === config.pass.toLowerCase().trim()) {
            if (!config.excluded.includes(sender) && !participants.has(sender)) {
                participants.add(sender);
                // Przesyłanie do listy uczestników
                io.emit('newParticipant', { sender });
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.on('updateConfig', (data) => {
        config = data;
        console.log("Nowa konfiguracja:", config);
    });
    socket.on('reset', () => {
        participants.clear();
        io.emit('participantsReset');
    });
});

server.listen(3000, () => console.log("Serwer działa na porcie 3000"));
