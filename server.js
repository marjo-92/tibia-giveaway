const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// Obsługa CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// STANY SYSTEMU TRZYMANE NA SERWERZE (Zabezpieczenie przed odświeżeniem)
let participants = new Set(); 
let winnersList = []; // Przechowuje { nick, status, prize }
let currentKeyword = "a";
let activeVerificationWinner = null;

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/new-message', (req, res) => {
    const { sender, content } = req.body;
    
    if (sender && content) {
        const cleanSender = sender.trim();
        const cleanContent = content.trim();

        // Przesyłamy surowy czat do frontendu dla okienka weryfikacji
        io.emit('newChat', { sender: cleanSender, content: cleanContent });
        
        // Logika dołączania do losowania
        if (cleanContent.toLowerCase() === currentKeyword.toLowerCase()) {
            if (!participants.has(cleanSender)) {
                // Sprawdzamy czy użytkownik już nie wygrał wcześniej
                const alreadyWon = winnersList.some(w => w.nick.toLowerCase() === cleanSender.toLowerCase() && w.status === 'verified');
                if (!alreadyWon) {
                    participants.add(cleanSender);
                    io.emit('newParticipant', cleanSender);
                }
            }
        }
    }
    res.status(200).send('OK');
});

io.on('connection', (socket) => {
    // Wysyłamy komplet danych przy połączeniu/odświeżeniu
    socket.emit('init', { 
        participants: Array.from(participants), 
        keyword: currentKeyword,
        winnersList: winnersList,
        activeWinner: activeVerificationWinner
    });
    
    socket.on('updateKeyword', (kw) => { 
        currentKeyword = kw ? kw.trim() : ""; 
        io.emit('keywordChanged', currentKeyword); 
    });
    
    // Serwer informuje wszystkich o starcie losowania
    socket.on('startFight', () => io.emit('triggerFight'));

    // Serwer synchronizuje wylosowanego użytkownika
    socket.on('setWinner', (winnerNick) => {
        activeVerificationWinner = winnerNick;
        io.emit('winnerSelected', winnerNick);
    });

    // Serwer aktualizuje listę zwycięzców
    socket.on('updateWinners', (updatedList) => {
        winnersList = updatedList;
        io.emit('winnersUpdated', winnersList);
    });
    
    socket.on('reset', () => { 
        participants.clear(); 
        winnersList = [];
        activeVerificationWinner = null;
        io.emit('participantsReset'); 
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serwer działa na porcie: ${PORT}`));
