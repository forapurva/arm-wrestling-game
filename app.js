let position = 50; 
let isPlaying = false;

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const endingScreen = document.getElementById('ending-screen');
const armMarker = document.getElementById('arm-marker');

document.getElementById('btn-create').addEventListener('click', () => {
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    isPlaying = true;
});

// Player 1 Pulls Left
document.getElementById('btn-p1-mash').addEventListener('click', () => {
    if (!isPlaying) return;
    position = Math.max(0, position - 5);
    updateArena();
});

// Player 2 Pulls Right
document.getElementById('btn-p2-mash').addEventListener('click', () => {
    if (!isPlaying) return;
    position = Math.min(100, position + 5);
    updateArena();
});

function updateArena() {
    armMarker.style.left = position + '%';
    
    if (position <= 0 || position >= 100) {
        isPlaying = false;
        setTimeout(endGame, 200);
    }
}

function endGame() {
    gameScreen.classList.add('hidden');
    endingScreen.classList.remove('hidden');
    
    let winnerText = position <= 0 ? "Player 1 Wins!" : "Player 2 Wins!";
    document.getElementById('match-result').innerText = winnerText;
}
