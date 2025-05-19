const chessboard = document.getElementById('chessboard');

const piecesUnicode = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

let board = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

let selectedSquare = null;
let currentPlayer = 'white';
let lastAIMove = null;
let gameMode = 'human-vs-ai'; // or 'human-vs-human'
let gameOver = false;

// Track if king and rooks have moved for castling rights
let whiteKingMoved = false;
let blackKingMoved = false;
let whiteRookMoved = {left: false, right: false};
let blackRookMoved = {left: false, right: false};

// Track last double pawn move for en passant
let enPassantTarget = null; // {row, col} of pawn that can be captured en passant

// Move history stack for undo functionality
let moveHistory = [];

// Timers
let whiteTime = 300; // 5 minutes in seconds
let blackTime = 300;
let timerInterval = null;

const modeToggleBtn = document.getElementById('modeToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const moveHistoryElement = document.getElementById('moveHistory');
const whiteTimerElement = document.getElementById('whiteTimer');
const blackTimerElement = document.getElementById('blackTimer');

modeToggleBtn.addEventListener('click', () => {
  if (gameMode === 'human-vs-ai') {
    gameMode = 'human-vs-human';
    modeToggleBtn.textContent = 'Switch to Human vs AI';
  } else {
    gameMode = 'human-vs-ai';
    modeToggleBtn.textContent = 'Switch to Human vs Human';
  }
  resetGame();
});

undoBtn.addEventListener('click', () => {
  undoMove();
});

function resetGame() {
  board = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  selectedSquare = null;
  currentPlayer = 'white';
  lastAIMove = null;
  gameOver = false;
  whiteKingMoved = false;
  blackKingMoved = false;
  whiteRookMoved = {left: false, right: false};
  blackRookMoved = {left: false, right: false};
  enPassantTarget = null;
  moveHistory = [];
  updateMoveHistory();
  updateStatus();
  createBoard();
  resetTimers();
  startTimer();
  undoBtn.disabled = true;
}

function updateMoveHistory() {
  moveHistoryElement.innerHTML = '';
  moveHistory.forEach((move, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${move}`;
    moveHistoryElement.appendChild(li);
  });
}

function formatMove(fromRow, fromCol, toRow, toCol, promotion = '') {
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['8','7','6','5','4','3','2','1'];
  return `${files[fromCol]}${ranks[fromRow]}${files[toCol]}${ranks[toRow]}${promotion}`;
}

function undoMove() {
  if (moveHistory.length === 0 || gameOver) return;
  const lastMove = moveHistory.pop();
  // For simplicity, reload the game state from scratch and replay all moves except last
  resetGame();
  for (let i = 0; i < moveHistory.length; i++) {
    const move = moveHistory[i];
    const fromCol = move.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(move[1]);
    const toCol = move.charCodeAt(2) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(move[3]);
    movePiece(fromRow, fromCol, toRow, toCol);
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  }
  updateMoveHistory();
  createBoard();
  undoBtn.disabled = moveHistory.length === 0;
}

function resetTimers() {
  whiteTime = 300;
  blackTime = 300;
  updateTimerDisplay();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  whiteTimerElement.textContent = formatTime(whiteTime);
  blackTimerElement.textContent = formatTime(blackTime);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameOver) {
      clearInterval(timerInterval);
      return;
    }
    if (currentPlayer === 'white') {
      whiteTime--;
      if (whiteTime <= 0) {
        gameOver = true;
        updateStatus(`Time's up! Black wins.`);
        clearInterval(timerInterval);
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        gameOver = true;
        updateStatus(`Time's up! White wins.`);
        clearInterval(timerInterval);
      }
    }
    updateTimerDisplay();
  }, 1000);
}

// Existing functions remain unchanged...

// Modify onSquareClick to update move history and enable undo button
function onSquareClick(row, col) {
  if (gameOver) return;
  if (gameMode === 'human-vs-ai' && currentPlayer === 'black') {
    return;
  }
  const piece = board[row][col];
  if (selectedSquare) {
    if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
      movePiece(selectedSquare.row, selectedSquare.col, row, col);
      // Add move to history
      const promotion = ''; // For simplicity, not handling promotion notation here
      moveHistory.push(formatMove(selectedSquare.row, selectedSquare.col, row, col, promotion));
      updateMoveHistory();
      undoBtn.disabled = false;
      selectedSquare = null;
      if (checkGameEnd()) {
        createBoard();
        return;
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
      createBoard();
      startTimer();
      if (gameMode === 'human-vs-ai' && currentPlayer === 'black') {
        setTimeout(() => {
          makeAIMove();
          if (checkGameEnd()) {
            createBoard();
            return;
          }
        }, 500);
      }
    } else {
      selectedSquare = null;
      createBoard();
    }
  } else {
    if (piece && isCurrentPlayerPiece(piece)) {
      selectedSquare = {row, col};
      highlightMoves(row, col);
    }
  }
}

// Modify makeAIMove to use a simple heuristic AI (capture if possible, else random)
function makeAIMove() {
  if (gameOver) return;
  const moves = [];
  const captureMoves = [];
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece === piece.toLowerCase()) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
              if (board[toRow][toCol] !== '') {
                captureMoves.push({fromRow, fromCol, toRow, toCol});
              } else {
                moves.push({fromRow, fromCol, toRow, toCol});
              }
            }
          }
        }
      }
    }
  }
  let move;
  if (captureMoves.length > 0) {
    move = captureMoves[Math.floor(Math.random() * captureMoves.length)];
  } else if (moves.length > 0) {
    move = moves[Math.floor(Math.random() * moves.length)];
  } else {
    gameOver = true;
    updateStatus();
    highlightKingCheckStatus();
    return;
  }
  movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
  moveHistory.push(formatMove(move.fromRow, move.fromCol, move.toRow, move.toCol));
  updateMoveHistory();
  undoBtn.disabled = false;
  currentPlayer = 'white';
  createBoard();
  startTimer();
}

createBoard();

function highlightMoves(row, col) {
  createBoard();
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    if (parseInt(sq.dataset.row) === row && parseInt(sq.dataset.col) === col) {
      sq.classList.add('highlight');
    }
  });

  // Highlight all valid moves for the selected piece
  for (let toRow = 0; toRow < 8; toRow++) {
    for (let toCol = 0; toCol < 8; toCol++) {
      if (isValidMove(row, col, toRow, toCol)) {
        const selector = `.square[data-row="${toRow}"][data-col="${toCol}"]`;
        const square = document.querySelector(selector);
        if (square) {
          square.classList.add('highlight-move');
        }
      }
    }
  }
}

function updateStatus() {
  const statusDiv = document.getElementById('status');
  if (gameOver) {
    if (isInCheck(currentPlayer)) {
      statusDiv.textContent = `Checkmate! ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} loses.`;
    } else {
      statusDiv.textContent = `Stalemate! The game is a draw.`;
    }
  } else {
    if (isInCheck(currentPlayer)) {
      statusDiv.textContent = `Check! ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} to move.`;
    } else {
      statusDiv.textContent = `Current turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
    }
  }
}

function clearCheckHighlights() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    sq.classList.remove('check');
    sq.classList.remove('checkmate');
  });
}

function highlightKingCheckStatus() {
  clearCheckHighlights();
  const kingPos = findKingPosition(currentPlayer);
  if (!kingPos) return;
  const squareSelector = `.square[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`;
  const kingSquare = document.querySelector(squareSelector);
  if (!kingSquare) return;
  if (gameOver && isInCheck(currentPlayer)) {
    kingSquare.classList.add('checkmate');
  } else if (isInCheck(currentPlayer)) {
    kingSquare.classList.add('check');
  }
}

function checkGameEnd() {
  if (isInCheck(currentPlayer)) {
    if (!hasAnyValidMoves(currentPlayer)) {
      gameOver = true;
      updateStatus();
      highlightKingCheckStatus();
      return true;
    }
  } else {
    if (!hasAnyValidMoves(currentPlayer)) {
      gameOver = true;
      updateStatus();
      highlightKingCheckStatus();
      return true;
    }
  }
  return false;
}

function onSquareClick(row, col) {
  if (gameOver) return;
  if (gameMode === 'human-vs-ai' && currentPlayer === 'black') {
    return;
  }
  const piece = board[row][col];
  if (selectedSquare) {
    if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
      movePiece(selectedSquare.row, selectedSquare.col, row, col);
      selectedSquare = null;
      if (checkGameEnd()) {
        createBoard();
        return;
      }
      currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
      createBoard();
      if (gameMode === 'human-vs-ai' && currentPlayer === 'black') {
        setTimeout(() => {
          makeAIMove();
          if (checkGameEnd()) {
            createBoard();
            return;
          }
        }, 500);
      }
    } else {
      selectedSquare = null;
      createBoard();
    }
  } else {
    if (piece && isCurrentPlayerPiece(piece)) {
      selectedSquare = {row, col};
      highlightMoves(row, col);
    }
  }
}

function makeAIMove() {
  if (gameOver) return;
  const moves = [];
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece === piece.toLowerCase()) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
              moves.push({fromRow, fromCol, toRow, toCol});
            }
          }
        }
      }
    }
  }
  if (moves.length === 0) {
    gameOver = true;
    updateStatus();
    highlightKingCheckStatus();
    return;
  }
  const move = moves[Math.floor(Math.random() * moves.length)];
  movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
  currentPlayer = 'white';
  createBoard();
}

function createBoard() {
  chessboard.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      square.dataset.row = row;
      square.dataset.col = col;
      square.textContent = piecesUnicode[board[row][col]] || '';
      if (lastAIMove &&
          ((lastAIMove.fromRow === row && lastAIMove.fromCol === col) ||
           (lastAIMove.toRow === row && lastAIMove.toCol === col))) {
        square.classList.add('ai-move-highlight');
      }
      chessboard.appendChild(square);

      // Add click event listener to each square
      square.addEventListener('click', () => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        onSquareClick(row, col);
      });
    }
  }
  updateStatus();
  highlightKingCheckStatus();
}

function isCurrentPlayerPiece(piece) {
  if (currentPlayer === 'white') {
    return piece === piece.toUpperCase();
  } else {
    return piece === piece.toLowerCase();
  }
}

createBoard();
