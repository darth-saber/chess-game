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
  console.log('Starting timer for:', currentPlayer);
  if (timerInterval) {
    console.log('Clearing existing timer interval');
    clearInterval(timerInterval);
  }
  timerInterval = setInterval(() => {
    if (gameOver) {
      console.log('Game over, clearing timer interval');
      clearInterval(timerInterval);
      return;
    }
    if (currentPlayer === 'white') {
      whiteTime--;
      console.log('White time:', whiteTime);
      if (whiteTime <= 0) {
        gameOver = true;
        updateStatus(`Time's up! Black wins.`);
        clearInterval(timerInterval);
      }
    } else {
      blackTime--;
      console.log('Black time:', blackTime);
      if (blackTime <= 0) {
        gameOver = true;
        updateStatus(`Time's up! White wins.`);
        clearInterval(timerInterval);
      }
    }
    updateTimerDisplay();
  }, 1000);
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
      // Pause timer during AI move
      clearInterval(timerInterval);
      if (gameMode === 'human-vs-ai' && currentPlayer === 'black') {
        setTimeout(() => {
          makeAIMove();
          if (checkGameEnd()) {
            createBoard();
            return;
          }
          // Resume timer after AI move
          startTimer();
        }, 500);
      } else {
        startTimer();
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
  moveHistory.push(formatMove(move.fromRow, move.fromCol, move.toRow, move.toCol));
  updateMoveHistory();
  undoBtn.disabled = false;
  currentPlayer = 'white';
  createBoard();
  startTimer();
}

// Move a piece on the board
function movePiece(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = '';
}

// Helper function to check if a position is inside the board
function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Helper function to check if path is clear between two squares (for rook, bishop, queen)
function isPathClear(fromRow, fromCol, toRow, toCol) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);
  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;
  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[currentRow][currentCol] !== '') return false;
    currentRow += rowStep;
    currentCol += colStep;
  }
  return true;
}

// Check if move puts own king in check (used to prevent illegal moves)
function doesMovePutKingInCheck(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = '';
  const inCheck = isInCheck(currentPlayer);
  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = target;
  return inCheck;
}

// Validate pawn moves
function isValidPawnMove(fromRow, fromCol, toRow, toCol, piece) {
  const direction = piece === 'P' ? -1 : 1; // White moves up (-1), black moves down (+1)
  const startRow = piece === 'P' ? 6 : 1;
  const target = board[toRow][toCol];

  // Move forward
  if (fromCol === toCol) {
    if (toRow === fromRow + direction && target === '') {
      return true;
    }
    // First move can move two squares
    if (fromRow === startRow && toRow === fromRow + 2 * direction && target === '' && board[fromRow + direction][fromCol] === '') {
      return true;
    }
  }
  // Capture diagonally
  if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
    if (target !== '' && isCurrentPlayerPiece(target) === false) {
      return true;
    }
    // En passant capture
    if (enPassantTarget && enPassantTarget.row === toRow && enPassantTarget.col === toCol) {
      return true;
    }
  }
  return false;
}

// Validate rook moves
function isValidRookMove(fromRow, fromCol, toRow, toCol) {
  if (fromRow !== toRow && fromCol !== toCol) return false;
  if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;
  return true;
}

// Validate knight moves
function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

// Validate bishop moves
function isValidBishopMove(fromRow, fromCol, toRow, toCol) {
  if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
  if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;
  return true;
}

// Validate queen moves
function isValidQueenMove(fromRow, fromCol, toRow, toCol) {
  return isValidRookMove(fromRow, fromCol, toRow, toCol) || isValidBishopMove(fromRow, fromCol, toRow, toCol);
}

// Validate king moves including castling
function isValidKingMove(fromRow, fromCol, toRow, toCol, piece) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Normal one-square move
  if (rowDiff <= 1 && colDiff <= 1) {
    return true;
  }

  // Castling
  if (rowDiff === 0 && colDiff === 2) {
    // Check castling conditions
    if (piece === 'K' && fromRow === 7 && fromCol === 4) {
      // White castling
      if (toCol === 6) {
        // Kingside
        if (!whiteKingMoved && !whiteRookMoved.right &&
            board[7][5] === '' && board[7][6] === '' &&
            !isInCheck('white') &&
            !doesMovePutKingInCheck(7,4,7,5) &&
            !doesMovePutKingInCheck(7,4,7,6)) {
          return true;
        }
      } else if (toCol === 2) {
        // Queenside
        if (!whiteKingMoved && !whiteRookMoved.left &&
            board[7][1] === '' && board[7][2] === '' && board[7][3] === '' &&
            !isInCheck('white') &&
            !doesMovePutKingInCheck(7,4,7,3) &&
            !doesMovePutKingInCheck(7,4,7,2)) {
          return true;
        }
      }
    } else if (piece === 'k' && fromRow === 0 && fromCol === 4) {
      // Black castling
      if (toCol === 6) {
        // Kingside
        if (!blackKingMoved && !blackRookMoved.right &&
            board[0][5] === '' && board[0][6] === '' &&
            !isInCheck('black') &&
            !doesMovePutKingInCheck(0,4,0,5) &&
            !doesMovePutKingInCheck(0,4,0,6)) {
          return true;
        }
      } else if (toCol === 2) {
        // Queenside
        if (!blackKingMoved && !blackRookMoved.left &&
            board[0][1] === '' && board[0][2] === '' && board[0][3] === '' &&
            !isInCheck('black') &&
            !doesMovePutKingInCheck(0,4,0,3) &&
            !doesMovePutKingInCheck(0,4,0,2)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Main move validation function
function isValidMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  if (!piece) return false;
  if (fromRow === toRow && fromCol === toCol) return false;
  // Prevent capturing own pieces
  const target = board[toRow][toCol];
  if (target && (piece.toUpperCase() === target.toUpperCase())) return false;

  // Validate based on piece type
  switch (piece.toLowerCase()) {
    case 'p':
      if (!isValidPawnMove(fromRow, fromCol, toRow, toCol, piece)) return false;
      break;
    case 'r':
      if (!isValidRookMove(fromRow, fromCol, toRow, toCol)) return false;
      break;
    case 'n':
      if (!isValidKnightMove(fromRow, fromCol, toRow, toCol)) return false;
      break;
    case 'b':
      if (!isValidBishopMove(fromRow, fromCol, toRow, toCol)) return false;
      break;
    case 'q':
      if (!isValidQueenMove(fromRow, fromCol, toRow, toCol)) return false;
      break;
    case 'k':
      if (!isValidKingMove(fromRow, fromCol, toRow, toCol, piece)) return false;
      break;
    default:
      return false;
  }

  // Check if move puts own king in check
  if (doesMovePutKingInCheck(fromRow, fromCol, toRow, toCol)) return false;

  return true;
}

// Check if the given player is in check
function isInCheck(player) {
  const kingPos = findKingPosition(player);
  if (!kingPos) return false;
  const opponent = player === 'white' ? 'black' : 'white';

  // Check all opponent pieces if they can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && ((opponent === 'white' && piece === piece.toUpperCase()) || (opponent === 'black' && piece === piece.toLowerCase()))) {
        if (isValidMove(row, col, kingPos.row, kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Move a piece on the board with special move handling
function movePiece(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];

  // Handle castling
  if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
    // Kingside castling
    if (toCol === 6) {
      board[toRow][5] = board[toRow][7];
      board[toRow][7] = '';
      if (piece === 'K') {
        whiteRookMoved.right = true;
      } else {
        blackRookMoved.right = true;
      }
    }
    // Queenside castling
    else if (toCol === 2) {
      board[toRow][3] = board[toRow][0];
      board[toRow][0] = '';
      if (piece === 'K') {
        whiteRookMoved.left = true;
      } else {
        blackRookMoved.left = true;
      }
    }
    if (piece === 'K') {
      whiteKingMoved = true;
    } else {
      blackKingMoved = true;
    }
  }

  // Handle en passant capture
  if (piece.toLowerCase() === 'p' && enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
    if (piece === 'P') {
      board[toRow + 1][toCol] = '';
    } else {
      board[toRow - 1][toCol] = '';
    }
  }

  // Move the piece
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = '';

  // Update castling rights if rook or king moved
  if (piece === 'K') whiteKingMoved = true;
  if (piece === 'k') blackKingMoved = true;
  if (piece === 'R') {
    if (fromRow === 7 && fromCol === 0) whiteRookMoved.left = true;
    if (fromRow === 7 && fromCol === 7) whiteRookMoved.right = true;
  }
  if (piece === 'r') {
    if (fromRow === 0 && fromCol === 0) blackRookMoved.left = true;
    if (fromRow === 0 && fromCol === 7) blackRookMoved.right = true;
  }

  // Handle pawn promotion
  if (piece.toLowerCase() === 'p') {
    if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
      // For simplicity, auto promote to queen
      board[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
    }
  }

  // Update en passant target
  if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
    enPassantTarget = {row: (fromRow + toRow) / 2, col: fromCol};
  } else {
    enPassantTarget = null;
  }
}

// Find the position of the king for the given player
function findKingPosition(player) {
  const kingChar = player === 'white' ? 'K' : 'k';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingChar) {
        return {row, col};
      }
    }
  }
  return null;
}

// Check if the given player is in check (simplified)
function isInCheck(player) {
  // For simplicity, return false (not implemented)
  // TODO: Implement check detection logic
  return false;
}

// Check if the given player has any valid moves (simplified)
function hasAnyValidMoves(player) {
  // For simplicity, check if any piece of player has at least one valid move
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && ((player === 'white' && piece === piece.toUpperCase()) || (player === 'black' && piece === piece.toLowerCase()))) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
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

function isCurrentPlayerPiece(piece) {
  if (currentPlayer === 'white') {
    return piece === piece.toUpperCase();
  } else {
    return piece === piece.toLowerCase();
  }
}

createBoard();
