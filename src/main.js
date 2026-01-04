// const { invoke } = window.__TAURI__.core;

// let greetInputEl;
// let greetMsgEl;

// async function greet() {
//   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//   greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
// }

// window.addEventListener("DOMContentLoaded", () => {
//   greetInputEl = document.querySelector("#greet-input");
//   greetMsgEl = document.querySelector("#greet-msg");
//   document.querySelector("#greet-form").addEventListener("submit", (e) => {
//     e.preventDefault();
//     greet();
//   });
// });


// Default words data (will be loaded via fetch)
const DEFAULT_WORDS = [];

// DOM 要素
const japaneseWordEl = document.getElementById('japanese-word');
const startButtonEl = document.getElementById('start-button');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const bestScoreEl = document.getElementById('best-score');
const fallingArea = document.getElementById('falling-area');
const typingInput = document.getElementById('typing-input');

let WORDS = [];
let currentIndex = 0;
let currentFallingElement = null;
let currentProblem = null;
let score = 0;
let isPlaying = false;

async function loadWords() {
    try {
        let data = null;

        // Try Tauri command first (works when running via tauri app)
        try {
            if (typeof window !== 'undefined' && window.__TAURI__) {
                const gw = window.__TAURI__;
                if (typeof gw.invoke === 'function') {
                    data = await gw.invoke('load_words_data');
                    console.info('Loaded words via Tauri invoke');
                } else if (gw.core && typeof gw.core.invoke === 'function') {
                    data = await gw.core.invoke('load_words_data');
                    console.info('Loaded words via Tauri invoke (core)');
                }
            }
        } catch (e) {
            console.warn('Tauri invoke failed, trying fetch:', e);
        }

        // Try fetch default.json if Tauri didn't work
        if (!data) {
            try {
                const response = await fetch('./data/default.json');
                if (response.ok) {
                    data = await response.json();
                    console.info('Loaded words via fetch');
                }
            } catch (e) {
                console.warn('Fetch failed, using embedded DEFAULT_WORDS:', e);
            }
        }

        // Fallback: use embedded default words
        if (!data) {
            data = DEFAULT_WORDS;
            console.info('Using embedded DEFAULT_WORDS');
        }

        // Set up game with loaded data
        WORDS = Array.isArray(data) ? data : [];
        if (WORDS.length === 0) {
            japaneseWordEl.textContent = '単語データが見つかりません。';
            startButtonEl.disabled = true;
        } else {
            japaneseWordEl.textContent = '準備完了！スタートボタンを押してください。';
            startButtonEl.disabled = false;
        }
    } catch (e) {
        console.error('loadWords error:', e);
        japaneseWordEl.textContent = `エラー: 単語データの読み込みに失敗しました`;
        startButtonEl.disabled = true;
    }
}

function shuffleWords() {
    for (let i = WORDS.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [WORDS[i], WORDS[j]] = [WORDS[j], WORDS[i]];
    }
}

function updateScore() {
    scoreEl.textContent = `正解: ${score}`;
}

function showWord() {
    const w = WORDS[currentIndex];
    japaneseWordEl.textContent = w ? w.ja : '---';
    typingInput.value = '';
    messageEl.textContent = '';
}

function endGame() {
    isPlaying = false;
    typingInput.disabled = true;
    startButtonEl.disabled = false;
    document.body.classList.remove('playing');
    japaneseWordEl.textContent = 'お疲れ様でした！';
    alert(`ゲーム終了！\nスコア: ${score} / ${WORDS.length}`);
    const best = Number(localStorage.getItem('bestScore') || 0);
    if (score > best) {
        localStorage.setItem('bestScore', String(score));
        bestScoreEl.textContent = `最高: ${score}`;
        messageEl.textContent += ' — 新記録！';
    } else {
        bestScoreEl.textContent = best > 0 ? `最高: ${best}` : '最高: -';
    }
}

function startGame() {
    if (!WORDS || WORDS.length === 0) return;
    shuffleWords();
    currentIndex = 0;
    score = 0;
    isPlaying = true;
    scoreEl.textContent = `正解: ${score}`;
    fallingArea.innerHTML = '';
    document.body.classList.add('playing');
    startButtonEl.disabled = true;
    // focus after transition for nicer UX
    setTimeout(() => typingInput.focus(), 250);
    typingInput.disabled = false;
    const best = Number(localStorage.getItem('bestScore') || 0);
    bestScoreEl.textContent = best > 0 ? `最高: ${best}` : '最高: -';
    showWord();
    setTimeout(() => {
        typingInput.focus();
        spawnWord();
    }, 300);
}

function spawnWord() {
    if (!isPlaying || currentIndex >= WORDS.length) {
        if (currentIndex >= WORDS.length) endGame();
        return;
    }

    // 1. 問題をランダムに選択
    const wordData = WORDS[currentIndex];

    // 2. HTML要素を作成
    const wordEl = document.createElement('div');
    wordEl.classList.add('falling-word');
    wordEl.textContent = wordData.ja;

    // 3. 横方向の開始位置をランダムに設定
    const randomLeft = Math.random() * 75;
    wordEl.style.left = `${randomLeft + 5}%`;

    // 4. エリアに追加（これでCSSアニメーションが自動開始）
    fallingArea.appendChild(wordEl);
    currentFallingElement = wordEl;

    wordEl.addEventListener('animationend', () => {
        if (isPlaying && wordEl.parentNode) {
            handleMiss(wordEl);
        }
    });
}

function handleSuccess() {
    if (!currentFallingElement) return;
    score++;
    scoreEl.textContent = `正解: ${score}`;
    currentFallingElement.classList.add('solved');
    const target = currentFallingElement;
    setTimeout(() => {
        if (target.parentNode) fallingArea.removeChild(target);
    }, 200);
    currentFallingElement = null;
    prepareNextTurn();
}

function handleMiss(element) {
    if (element.parentNode) {
        fallingArea.removeChild(element);
    }
    currentFallingElement = null;
    prepareNextTurn();
}

function prepareNextTurn() {
    currentIndex++;
    typingInput.value = '';
    typingInput.focus();
    showWord();
    spawnWord();
}

// イベント登録
window.addEventListener('DOMContentLoaded', () => {
    loadWords();
    startButtonEl.addEventListener('click', startGame);

    typingInput.addEventListener('keydown', (e) => {
        if (!isPlaying || currentIndex >= WORDS.length) return;

        if (e.key === 'Enter') {
            const input = e.target.value.trim().toLowerCase();
            const target = WORDS[currentIndex].en.toLowerCase();
            if (input === target) {
                handleSuccess();
            } else {
                messageEl.textContent = "아니요! 다시 입력해주세요!";
                typingInput.value = '';
            }
        }

    });
});