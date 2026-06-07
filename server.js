const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

let participants = new Set(); 
let currentKeyword = "!losuj";
let currentChatroomId = "";
let kickWs = null;

const ignoredBots = ['botrix', 'kickbot', 'streamelements', 'nightbot'];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// FUNKCJA ŁĄCZĄCA BEZPOŚREDNIO Z CZATEM KICKA
function connectToKickChat(chatroomId) {
    if (kickWs) {
        try { kickWs.close(); } catch(e) {}
    }

    currentChatroomId = chatroomId.trim();
    if (!currentChatroomId) return;

    console.log(`[KICK] Łączenie z czatem o ID: ${currentChatroomId}`);
    io.emit('kickStatus', { status: 'connecting' });
    
    // Oficjalny klucz Pushera używany przez platformę Kick
    const kickPusherKey = "eb1d5f2830e9ce97b905"; 
    const wsUrl = `wss://ws-mt1.pusher.com/app/${kickPusherKey}?protocol=7&client=js&version=7.4.0&flash=false`;

    kickWs = new WebSocket(wsUrl);

    kickWs.on('open', () => {
        console.log('[KICK] Połączono z serwerem. Subskrybuję kanał czatu...');
        
        const subscribeMessage = {
            event: "pusher:subscribe",
            data: {
                auth: "",
                channel: `chatrooms.${currentChatroomId}.v2`
            }
        };
        
        kickWs.send(JSON.stringify(subscribeMessage));
        io.emit('kickStatus', { status: 'connected', chatroomId: currentChatroomId });
    });

    kickWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            
            // Wyłapujemy event nowej wiadomości na czacie
            if (msg.event === "App\\Events\\ChatMessageEvent") {
                const chatData = JSON.parse(msg.data);
                const sender = chatData.sender.username;
                const content = chatData.content;
                
                handleKickMessage(sender, content);
            }
        } catch (err) {
            console.error('[KICK] Błąd przetwarzania wiadomości:', err);
        }
    });

    kickWs.on('close', () => {
        console.log('[KICK] Połączenie z czatem zostało zamknięte.');
        io.emit('kickStatus', { status: 'disconnected' });
        
        // Auto-reconnect: próba ponownego połączenia za 5 sekund w razie rozłączenia
        setTimeout(() => {
            if (currentChatroomId === chatroomId) {
                connectToKickChat(chatroomId);
            }
        }, 5000);
    });

    kickWs.on('error', (err) => {
        console.error('[KICK] Błąd połączenia WebSocket:', err.message);
        io.emit('kickStatus', { status: 'error', message: err.message });
    });
}

function handleKickMessage(sender, content) {
    const usernameLower = sender.toLowerCase();

    if (ignoredBots.includes(usernameLower)) return;

    if (content.toLowerCase().includes(currentKeyword.toLowerCase())) {
        if (!participants.has(sender)) {
            participants.add(sender);
            io.emit('newParticipant', sender);
            console.log(`[Czat Kicka] Zaproszono gracza: ${sender}`);
        }
    }
}

io.on('connection', (socket) => {
    // Wysyłamy aktualny stan po wejściu na stronę
    socket.emit('init', {
        participants: Array.from(participants),
        keyword: currentKeyword,
        chatroomId: currentChatroomId
    });

    socket.on('updateKeyword', (newKeyword) => {
        currentKeyword = newKeyword;
        io.emit('keywordChanged', currentKeyword);
    });

    socket.on('changeChatroom', (chatroomId) => {
        connectToKickChat(chatroomId);
    });

    socket.on('resetParticipants', () => {
        participants.clear();
        io.emit('participantsReset');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie: ${PORT}`);
});
