const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// Ręczne nagłówki CORS - to musi zostać, bo bez tego przesyłanie nie działa
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let participants = new Set(); 
let config = { password: "a", tc: 0, excluded: [] }; // Twój obiekt konfiguracyjny

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    
    if (sender && content) {
        // Przesyłamy czat (oryginalne dane)
        io.emit('newChat', { sender, content });
        
        // Logika hasła (bez zmian, Twoja sprawdzona wersja)
        if (content.toLowerCase().trim() === config.password.toLowerCase().trim()) {
            if (!participants.has(sender) && !config.excluded.includes(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    socket.emit('init', { participants: Array.from(participants), config });
    
    socket.on('updateConfig', (newConfig) => { 
        config = newConfig; 
    });
    
    socket.on('reset', () => { 
        participants.clear(); 
        io.emit('participantsReset'); 
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serwer działa na porcie: ${PORT}`));
