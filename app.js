const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_JnY3vAGCA_Vg8ry7wTecvg_ZRHBG37c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let roomId = null;
let playerRole = null; 
let gameState = { position: 50, status: 'waiting' };
let channel = null;

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');
const statusText = document.getElementById('status-text');
const displayRoomId = document.getElementById('display-room-id');
const turnIndicator = document.getElementById('turn-indicator');
const armMarker = document.getElementById('arm-marker');
const btnMash = document.getElementById('btn-mash');

document.getElementById('btn-create').addEventListener('click', createRoom);
document.getElementById('btn-join').addEventListener('click', joinRoom);
btnMash.addEventListener('click', handleMash);

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function createRoom() {
    roomId = generateRoomCode();
    playerRole = 'player1';
    initMultiplayer(roomId);
}

function joinRoom() {
    const input = document.getElementById('room-input').value.trim().toUpperCase();
    if (!input) return alert('Please enter a room code.');
    roomId = input;
    playerRole = 'player2';
    initMultiplayer(roomId);
}

function initMultiplayer(roomCode) {
    statusText.innerText = "Connecting to room...";
    
    channel = supabase.channel(`room-${roomCode}`, {
        config: { broadcast: { self: true } }
    });

    channel
    .on('broadcast', { event: 'sync' }, ({ payload }) => {
        handleStateUpdate(payload);
    })
    .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            setupScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            displayRoomId.innerText = roomCode;

            if (playerRole === 'player1') {
                turnIndicator.innerText = "Waiting for Player 2 to join...";
            } else {
                gameState.status = 'playing';
                broadcastState(gameState);
            }
        }
    });
}

function broadcastState(state) {
    if (channel) {
        channel.send({
            type: 'broadcast',
            event: 'sync',
            payload: state
        });
    }
}

function handleStateUpdate(payload) {
    gameState = payload;
    armMarker.style.left = `${gameState.position}%`;

    if (gameState.status === 'playing') {
        turnIndicator.innerText = "MATCH LIVE! MASH THE BUTTON!";
        btnMash.disabled = false;
    }

    if (gameState.position <= 0 || gameState.position >= 100) {
        endGame();
    }
}

function handleMash() {
    if (gameState.status !== 'playing') return;
    if (playerRole === 'player1') {
        gameState.position = Math.max(0, gameState.position - 4);
    } else if (playerRole === 'player2') {
        gameState.position = Math.min(100, gameState.position + 4);
    }
    broadcastState(gameState);
}

function endGame() {
    gameState.status = 'ended';
    btnMash.disabled = true;
    let winnerText = gameState.position <= 0 ? "Player 1 Wins!" : "Player 2 Wins!";
    document.getElementById('match-result').innerText = winnerText;
    gameScreen.classList.add('hidden');
    endingScreen.classList.remove('hidden');
}
