const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.json());

// Logika CORS - musi być na samej górze
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

let participants = new Set();
let config = { password: "a" };

app.post('/new-message', (req, res) => {
    // To jest najważniejsza linia. Jeśli jej nie ma w logach, 
    // to dane nie docierają z widgetu.
    console.log("OTRZYMANO DANE Z WIDGETU:", JSON.stringify(req.body));
    
    const { sender, content } = req.body;
    
    if (sender && content) {
        if (content.toLowerCase().trim() === config.password.toLowerCase().trim()) {
            if (!participants.has(sender)) {
                participants.add(sender);
                io.emit('newParticipant', sender);
            }
        }
    }
    res.status(200).send('OK');
});

app.get('/', (req, res) => res.send('Serwer działa.'));

http.listen(3000, () => console.log("Serwer nasłuchuje na porcie 3000"));
