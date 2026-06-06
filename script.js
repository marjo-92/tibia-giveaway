let players = []; // Tablica przechowująca unikalne nicki zapisanych osób
let registrationOpen = false;
let socketInstance = null;
let currentChatroomId = null;
let currentChannelName = "";

// 🟢 KROK 1: Autoryzacja i pobranie ID z oficjalnego API platformy Kick
async function handleLogin() {
    const channelInput = document.getElementById("channelInput").value.trim();
    const statusDiv = document.getElementById("loginStatus");
    if (!channelInput) { statusDiv.innerText = "Wpisz nazwę kanału!"; return; }

    statusDiv.style.color = "#ffff55";
    statusDiv.innerText = "Łączenie z bazą danych Kick...";

    try {
        const response = await fetch(`https://kick.com{channelInput.toLowerCase()}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        currentChatroomId = data.chatroom.id;
        currentChannelName = data.slug;
        
        // Przejście do głównego pulpitu
        document.getElementById("loginView").style.display = "none";
        document.getElementById("mainInterface").style.display = "flex";
        document.getElementById("connectedChannel").innerText = currentChannelName;
        
        updateSummaryLayout();
    } catch (err) {
        statusDiv.style.color = "#ff3333";
        statusDiv.innerText = "Nie znaleziono takiego kanału na Kicku!";
    }
}

function updateSummaryLayout() {
    document.getElementById("summaryPrize").innerText = document.getElementById("prizeText").value;
    document.getElementById("summaryKeyword").innerText = document.getElementById("chatCommand").value;
}

// 🟢 KROK 2: Otwarcie linii WebSocket i nasłuchiwanie słowa kluczowego na czacie
function connectAndListen() {
    const command = document.getElementById("chatCommand").value.trim().toLowerCase();
    if (!command) return alert("Wpisz hasło do zapisu!");
    if (!currentChatroomId) return alert("Błąd sesji. Zaloguj się ponownie.");

    updateSummaryLayout();
    document.getElementById("statusText").innerText = "Ustanawianie połączenia z serwerem czatu Kick (WebSocket)...";
    document.getElementById("statusText").style.color = "#ffff55";
    
    players = [];
    document.getElementById("count").innerText = "0";
    document.getElementById("viewerList").innerHTML = '<div id="emptyMessage">Napisz hasło na czacie, aby dołączyć...</div>';
    document.getElementById("winnersList").innerHTML = '<div class="empty-winners">Brak zwycięzców. Czekam na losowanie...</div>';

    if (socketInstance) socketInstance.close();
    
    // Połączenie z serwerem nadawczym
    socketInstance = new WebSocket("wss://://pusher.com");

    socketInstance.onopen = function() {
        const msg = {
            event: "pusher:subscribe",
            data: { channel: `chatrooms.${currentChatroomId}.v2` }
        };
        socketInstance.send(JSON.stringify(msg));
        
        registrationOpen = true;
        document.getElementById("statusText").innerHTML = `🟢 Zapisy URUCHOMIONE! Czat kanału: <b>${currentChannelName}</b> | Słowo: <b style="color:#00e701">${command}</b>`;
        document.getElementById("statusText").style.color = "#00e701";
    };

    socketInstance.onmessage = function(event) {
        if (!registrationOpen) return;
        
        const response = JSON.parse(event.data);
        if (response.event === "App\\Events\\ChatMessageEvent") {
            const msgData = JSON.parse(response.data);
            const messageText = msgData.content.trim().toLowerCase();
            const senderName = msgData.sender.username;

            if (messageText === command) {
                const exists = players.some(name => name.toLowerCase() === senderName.toLowerCase());
                if (!exists) {
                    players.push(senderName);
                    
                    document.getElementById("count").innerText = players.length;
                    
                    const emptyMsg = document.getElementById("emptyMessage");
                    if (emptyMsg) emptyMsg.remove();
                    
                    const listContainer = document.getElementById("viewerList");
                    listContainer.innerHTML += `<div class="viewer-tag">${senderName}</div>`;
                }
            }
        }
    };

    socketInstance.onerror = function(err) {
        document.getElementById("statusText").innerText = "❌ Połączenie sieciowe przerwane.";
        document.getElementById("statusText").style.color = "#ff3333";
    };
}

// 🟢 KROK 3: Bezpieczne losowanie tekstowe zadanej liczby zwycięzców
function startTextLottery() {
    if (players.length === 0) return alert("Nikt jeszcze nie zapisał się na losowanie!");
    
    const targetCount = parseInt(document.getElementById("winnersCount").value);
    if (players.length < targetCount) return alert("Masz mniej zapisanych osób niż wybrana liczba zwycięzców!");

    registrationOpen = false;
    document.getElementById("statusText").innerText = "🏁 Zapisy zamknięte. Trwa wybór ocalałych...";
    document.getElementById("statusText").style.color = "#ffff55";

    // Klonujemy tablicę, aby losować bez powtórzeń
    let pool = [...players];
    let luckyWinners = [];

    for (let i = 0; i < targetCount; i++) {
        let randomIndex = Math.floor(Math.random() * pool.length);
        luckyWinners.push(pool[randomIndex]);
        pool.splice(randomIndex, 1); // Usuwamy, by ta sama osoba nie wygrała dwa razy
    }

    // Wyświetlenie wyników w prawej kolumnie
    const winnersContainer = document.getElementById("winnersList");
    winnersContainer.innerHTML = "";
    
    luckyWinners.forEach(winner => {
        winnersContainer.innerHTML += `<div class="winner-tag">🏆 ${winner}</div>`;
    });

    let prize = document.getElementById("prizeText").value;
    document.getElementById("statusText").innerHTML = `🎉 Losowanie zakończone! Nagroda: <b>${prize}</b> trafiła do wybranych osób!`;
    document.getElementById("statusText").style.color = "#00e701";
}

// 🟢 KROK 4: Pełne czyszczenie bazy danych na żądanie
function resetAllData() {
    players = [];
    registrationOpen = false;
    if (socketInstance) socketInstance.close();
    
    document.getElementById("count").innerText = "0";
    document.getElementById("statusText").innerText = "Status: Dane wyczyszczone. Podaj parametry i otwórz zapisy.";
    document.getElementById("statusText").style.color = "#a1a1aa";
    document.getElementById("viewerList").innerHTML = '<div id="emptyMessage">Napisz hasło na czacie, aby dołączyć...</div>';
    document.getElementById("winnersList").innerHTML = '<div class="empty-winners">Brak zwycięzców. Czekam na losowanie...</div>';
}
