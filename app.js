import { createClient } from 'https://esm.sh'

// REPLACE THESE WITH YOUR COPIED DETAILS
const SUPABASE_URL = 'sb_publishable_JnY3vAGCA_Vg8ry7wTecvg_ZRHBG37c' 
const SUPABASE_KEY = 'sb_secret_lYAEJ3vvvMeClU7HgrrsyQ_m3DsSrhe'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let currentMatchId = null;
let playerRole = null; // 'player1' or 'player2'
let matchChannel = null;

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const matchInput = document.getElementById('match-input');
const displayMatchId = document.getElementById('display-match-id');
const statusText = document.getElementById('status-text');
const mashBtn = document.getElementById('mash-btn');
const armIndicator = document.getElementById('arm-indicator');

// Event Listeners
createBtn.addEventListener('click', createMatch);
joinBtn.addEventListener('click', joinMatch);
mashBtn.addEventListener('click', handleMash);

// 1. Create a Match
async function createMatch() {
    statusText.innerText = "Creating match...";
    const { data, error } = await supabase
        .from('matches')
        .insert([{ player_1_score: 0, player_2_score: 0, status: 'waiting' }])
        .select()
        .single();

    if (error) {
        alert("Error creating match: " + error.message);
        return;
    }

    currentMatchId = data.id;
    playerRole = 'player1';
    setupGameUI();
}

// 2. Join an Existing Match
async function joinMatch() {
    const matchId = matchInput.value.trim();
    if (!matchId) return alert("Please enter a Match ID");

    statusText.innerText = "Joining match...";
    
    // Update match status to playing
    const { data, error } = await supabase
        .from('matches')
        .update({ status: 'playing' })
        .eq('id', matchId)
        .select()
        .single();

    if (error || !data) {
        alert("Match not found or unable to join.");
        return;
    }

    currentMatchId = data.id;
    playerRole = 'player2';
    setupGameUI();
}

// 3. Switch screens and start listening live
function setupGameUI() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    displayMatchId.innerText = currentMatchId;

    // Listen to real-time database updates for this specific match
    matchChannel = supabase
        .channel(`match:${currentMatchId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'matches', 
            filter: `id=eq.${currentMatchId}` 
        }, (payload) => {
            updateGameState(payload.new);
        })
        .subscribe();
}

// 4. Update the arm movement instantly on screen
function updateGameState(match) {
    if (match.status === 'playing') {
        statusText.innerText = "BATTLE! MASH THE BUTTON!";
        mashBtn.disabled = false;
    }

    const p1 = match.player_1_score || 0;
    const p2 = match.player_2_score || 0;
    const total = p1 + p2;
    
    // Calculate middle position shift based on mashing
    let positionPercentage = 50;
    if (total > 0) {
        positionPercentage = 50 + (((p1 - p2) / total) * 40); // bounds it between 10% and 90%
    }
    
    armIndicator.style.left = `${positionPercentage}%`;

    // Check Win Conditions
    if (p1 - p2 >= 20) {
        endGame("Player 1 Wins!");
    } else if (p2 - p1 >= 20) {
        endGame("Player 2 Wins!");
    }
}

// 5. Send button mash data to Supabase
async function handleMash() {
    if (!currentMatchId) return;

    // Increment current score directly in the database using RPC or an update snippet
    if (playerRole === 'player1') {
        // Fetch current match to get latest score dynamically
        let { data } = await supabase.from('matches').select('player_1_score').eq('id', currentMatchId).single();
        await supabase.from('matches').update({ player_1_score: (data.player_1_score || 0) + 1 }).eq('id', currentMatchId);
    } else {
        let { data } = await supabase.from('matches').select('player_2_score').eq('id', currentMatchId).single();
        await supabase.from('matches').update({ player_2_score: (data.player_2_score || 0) + 1 }).eq('id', currentMatchId);
    }
}

function endGame(message) {
    statusText.innerText = message;
    mashBtn.disabled = true;
    if (matchChannel) supabase.removeChannel(matchChannel);
}
