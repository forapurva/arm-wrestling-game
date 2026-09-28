// --- Supabase Configuration ---
// Replace these strings with your actual Supabase URL and Anon Key from Step 2
const SUPABASE_URL = "Yhttps://kippkusktbsvfpsdknew.supabase.co";
const SUPABASE_KEY = "sb_publishable_JnY3vAGCA_Vg8ry7wTecvg_ZRHBG37c";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Game State Variables ---
let roomId = null;
let playerRole = null; // 'player1' or 'player2'
let gameState = { position: 50, status: 'waiting' };
let channel = null;

// --- DOM Elements ---
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');
const statusText = document.getElementById('status-text');
const displayRoomId = document.getElementById('display-room-id');
const turnIndicator = document.getElementById('turn-indicator');
const armMarker = document.getElementById('arm-marker');
const btnMash = document.getElementById('btn-mash');

// --- Photo Configuration ---
// Place your character image filenames here inside your GitHub repository
const p1ImageURL = "p1.jpg"; 
const p2ImageURL = "p2.jpg"; 

// --- Event Listeners ---
document.getElementById('btn-create').addEventListener('click', createRoom);
document.getElementById('btn-join').addEventListener('click', joinRoom);
btnMash.addEventListener('click', handleMash);

// --- Room Creation & Management ---
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

// --- Live Realtime Synchronization Sync ---
function initMultiplayer(roomCode) {
    statusText.innerText = "Connecting to room...";
    
    // Create a realtime broadcast channel for the specific room code
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

            // Apply photo references dynamically if they exist
            document.getElementById('p1-photo').style.backgroundImage = `url(${p1ImageURL})`;
            document.getElementById('p2-photo').style.backgroundImage = `url(${p2ImageURL})`;

            if (playerRole === 'player1') {
                turnIndicator.innerText = "Waiting for Player 2 to join...";
            } else {
                // If player 2 joins, notify player 1 to kick off the game state
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
    
    // Update match visual position (0% is P1 win, 100% is P2 win)
    armMarker.style.left = `${gameState.position}%`;

    if (gameState.status === 'playing') {
        turnIndicator.innerText = "MATCH LIVE! MASH THE BUTTON!";
        btnMash.disabled = false;
    }

    // Check for Win/Loss state triggers
    if (gameState.position <= 0 || gameState.position >= 100) {
        endGame();
    }
}

// --- Gameplay Mechanics ---
function handleMash() {
    if (gameState.status !== 'playing') return;

    // Player 1 pulls left (-3), Player 2 pulls right (+3)
    if (playerRole === 'player1') {
        gameState.position = Math.max(0, gameState.position - 3);
    } else if (playerRole === 'player2') {
        gameState.position = Math.min(100, gameState.position + 3);
    }

    broadcastState(gameState);
}

// --- End Sequence Execution ---
function endGame() {
    gameState.status = 'ended';
    btnMash.disabled = true;
    
    let winnerText = "";
    if (gameState.position <= 0) {
        winnerText = "Player 1 Wins the Arm Wrestle!";
    } else {
        winnerText = "Player 2 Wins the Arm Wrestle!";
    }

    document.getElementById('match-result').innerText = winnerText;
    gameScreen.classList.add('hidden');
    endingScreen.classList.remove('hidden');
}
