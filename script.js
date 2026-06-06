const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let players = [];
let boss = { x: 400, y: 240, hp: 1000, maxHp: 1000, size: 36, isDead: false, name: "Ferumbras" };
let damageTexts = [];
let visualEffects = [];
let gameActive = false;
let registrationOpen = false;
let killTimer = 0;
let killInterval = 60;
let pusherInstance = null;

class Player {
    constructor(name) {
        this.name = name;
        this.x = Math.random() > 0.5 ? Math.random() * 100 + 40 : Math.random() * 100 + 660;
        this.y = Math.random() > 0.5 ? Math.random() * 100 + 40 : Math.random() * 100 + 340;
        this.color = ["#ff5555", "#55ff55", "#5555ff", "#ffff55", "#ff55ff", "#55ffff"][Math.floor(Math.random() * 6)];
        this.speed = 1.5 + Math.random() * 1.2;
        this.isDead = false;
    }
    update() {
        if (this.isDead || boss.isDead) return;
        let dx = boss.x - this.x;
        let dy = boss.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 60) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        } else if (gameActive) {
            this.x += (Math.random() * 4 - 2);
            this.y += (Math.random() * 4 - 2);
            if (Math.random() < 0.05) {
                let dmg = Math.floor(Math.random() * 90) + 10;
                damageTexts.push({ x: boss.x + (Math.random()*40-20), y: boss.y - 35, text: `-${dmg}`, color: "#ff0000", timer: 20 });
            }
        }
    }
    draw() {
        if (this.isDead) return;
        ctx.fillStyle = this.color; ctx.fillRect(this.x - 12, this.y - 12, 24, 24);
        ctx.fillStyle = "#ffdbac"; ctx.fillRect(this.x - 6, this.y - 22, 12, 12);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - 27);
    }
}

async function connectAndListen() {
    const channelName = document.getElementById("kickChannel").value.trim().toLowerCase();
    const command = document.getElementById("chatCommand").value.trim().toLowerCase();
    if (!channelName || !command) return alert("Wpisz nick oraz hasło do zapisu!");

    document.getElementById("statusText").innerText = "Łączenie z API Kick...";
    document.getElementById("statusText").style.color = "#ffff55";
    document.getElementById("lootMessage").innerText = "";
    players = [];
    gameActive = false;
    boss.isDead = false;
    boss.hp = boss.maxHp;

    try {
        const response = await fetch(`https://kick.com{channelName}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        const chatroomId = data.chatroom.id;

        if (pusherInstance) pusherInstance.disconnect();
        
        pusherInstance = new Pusher('32cbd69e4b950bf97679', { cluster: 'us2', forceTLS: true });
        const channel = pusherInstance.subscribe(`chatrooms.${chatroomId}.v2`);
        
        registrationOpen = true;
        document.getElementById("statusText").innerHTML = `🟢 Zapisy OTWARTE! Kanał: <b>${channelName}</b> | Hasło: <span style="color:#00ff00; font-weight:bold;">${command}</span> | Zapisanych: <b id="count">0</b>`;
        document.getElementById("statusText").style.color = "#00ff00";

        channel.bind('App\\Events\\ChatMessageEvent', function(msg) {
            if (!registrationOpen || gameActive) return;
            
            const messageText = msg.content.trim().toLowerCase();
            const senderName = msg.sender.username;

            if (messageText === command) {
                const exists = players.some(p => p.name.toLowerCase() === senderName.toLowerCase());
                if (!exists) {
                    players.push(new Player(senderName));
                    document.getElementById("count").innerText = players.length;
                    damageTexts.push({ x: Math.random()*600+100, y: Math.random()*300+80, text: `+ ${senderName}`, color: "#00ff00", timer: 40 });
                }
            }
        });

    } catch (err) {
        document.getElementById("statusText").innerText = "❌ Błąd! Sprawdź czy nick kanału jest poprawny.";
        document.getElementById("statusText").style.color = "#ff3333";
    }
}

function startBossFight() {
    if (players.length === 0) return alert("Nikt jeszcze nie zapisał się na losowanie!");
    
    const targetWinners = parseInt(document.getElementById("winnersCount").value);
    if (players.length <= targetWinners) return alert("Masz za mało zapisanych osób!");

    registrationOpen = false;
    gameActive = true;
    boss.hp = boss.maxHp;
    boss.isDead = false;
    
    document.getElementById("statusText").innerText = "⚔️ WALKA W TOKU! Ferumbras rzuca czary obszarowe!";
    document.getElementById("statusText").style.color = "#ff3333";
    document.getElementById("lootMessage").innerText = "Ferumbras: The world will tremble before my power!";
    
    killInterval = Math.max(18, Math.floor(240 / players.length));
    killTimer = 0;
}

function executeBossAttack() {
    let alivePlayers = players.filter(p => !p.isDead);
    const targetWinners = parseInt(document.getElementById("winnersCount").value);

    if (alivePlayers.length <= targetWinners) {
        boss.hp = 0; boss.isDead = true; gameActive = false;
        damageTexts.push({ x: boss.x, y: boss.y, text: "-99999!!!", color: "#ffff00", timer: 70 });
        
        let prize = document.getElementById("prizeText").value;
        let winnersNames = alivePlayers.map(p => `<span style="color:#ffffff;">${p.name}</span>`).join(", ");
        
        document.getElementById("statusText").innerText = "🏁 KONIEC LOSOWANIA!";
        document.getElementById("statusText").style.color = "#ffff55";
        document.getElementById("lootMessage").innerHTML = `
            <span style="color: #ffaa00;">Ferumbras dies.</span><br>
            Loot of Ferumbras: You see <span style="color:#ff55ff; text-decoration: underline;">${prize}</span>.<br>
            Gratulacje dla ocalałych: ${winnersNames}!
        `;
        return;
    }

    if (alivePlayers.length > targetWinners) {
        let victim = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        victim.isDead = true;

        visualEffects.push({ type: 'ue', x: boss.x, y: boss.y, radius: 10, maxRadius: 350, color: "rgba(255, 30, 30, 0.4)", timer: 20 });
        visualEffects.push({ type: 'beam', x1: boss.x, y1: boss.y, x2: victim.x, y2: victim.y, timer: 12 });
        damageTexts.push({ x: victim.x, y: victim.y - 15, text: "-DODGE OR DIE", color: "#ff3333", timer: 35 });
        visualEffects.push({ type: 'puff', x: victim.x, y: victim.y, radius: 4, maxRadius: 18, color: "rgba(220,220,220,0.5)", timer: 15 });
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#474747"; ctx.lineWidth = 1;
    for(let x=0; x<canvas.width; x+=32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for(let y=0; y<canvas.height; y+=32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    if (gameActive && !boss.isDead) {
        killTimer++;
        if (killTimer >= killInterval) { executeBossAttack(); killTimer = 0; }
        let aliveCount = players.filter(p => !p.isDead).length;
        let targetWinners = parseInt(document.getElementById("winnersCount").value);
        if (boss.hp > 10 && aliveCount > targetWinners) boss.hp -= 0.6;
    }

    if (!boss.isDead) {
        ctx.fillStyle = "#7a0099"; ctx.fillRect(boss.x - boss.size/2, boss.y - boss.size/2, boss.size, boss.size);
        ctx.fillStyle = "#ffaa00"; ctx.fillRect(boss.x - 10, boss.y - boss.size/2 - 8, 20, 8);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; ctx.fillText(boss.name, boss.x, boss.y - 42);
        
        let barWidth = 80; let hpPercent = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = "#000000"; ctx.fillRect(boss.x - barWidth/2, boss.y - 34, barWidth, 6);
        ctx.fillStyle = hpPercent > 0.25 ? "#00ff00" : "#ff0000"; ctx.fillRect(boss.x - barWidth/2, boss.y - 34, barWidth * hpPercent, 6);
    } else {
        ctx.fillStyle = "#4a005c"; ctx.fillRect(boss.x - 18, boss.y - 8, 36, 16);
    }

    players.forEach(p => { p.update(); p.draw(); });

    for (let i = visualEffects.length - 1; i >= 0; i--) {
        let fx = visualEffects[i];
        if (fx.type === 'beam') {
            ctx.strokeStyle = "#ff3333"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
        } else if (fx.type === 'ue') {
            ctx.fillStyle = fx.color; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2); ctx.fill();
            fx.radius += (fx.maxRadius - fx.radius) * 0.15;
        } else {
            ctx.strokeStyle = fx.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2); ctx.stroke();
            fx.radius += (fx.maxRadius - fx.radius) * 0.2;
        }
        fx.timer--; if (fx.timer <= 0) visualEffects.splice(i, 1);
    }

    for (let i = damageTexts.length - 1; i >= 0; i--) {
        let dt = damageTexts[i]; ctx.fillStyle = dt.color; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText(dt.text, dt.x, dt.y); dt.y -= 0.6; dt.timer--; if (dt.timer <= 0) damageTexts.splice(i, 1);
    }
    requestAnimationFrame(gameLoop);
}
gameLoop();
