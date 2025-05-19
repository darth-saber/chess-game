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

// Helper to check if castling move is valid
function canCastle(color, side) {
  if (color === 'white') {
    if (whiteKingMoved) return false;
    if (side === 'left' && whiteRookMoved.left) return false;
    if (side === 'right' && whiteRookMoved.right) return false;
    const row = 7;
    if (side === 'left') {
      if (board[row][1] !== '' || board[row][2] !== '' || board[row][3] !== '') return false;
      if (isInCheck(color)) return false;
      if (isSquareAttacked(row, 2, 'black') || isSquareAttacked(row, 3, 'black')) return false;
      return true;
    } else if (side === 'right') {
      if (board[row][5] !== '' || board[row][6] !== '') return false;
      if (isInCheck(color)) return false;
      if (isSquareAttacked(row, 5, 'black') || isSquareAttacked(row, 6, 'black')) return false;
      return true;
    }
  } else {
    if (blackKingMoved) return false;
    if (side === 'left' && blackRookMoved.left) return false;
    if (side === 'right' && blackRookMoved.right) return false;
    const row = 0;
    if (side === 'left') {
      if (board[row][1] !== '' || board[row][2] !== '' || board[row][3] !== '') return false;
      if (isInCheck(color)) return false;
      if (isSquareAttacked(row, 2, 'white') || isSquareAttacked(row, 3, 'white')) return false;
      return true;
    } else if (side === 'right') {
      if (board[row][5] !== '' || board[row][6] !== '') return false;
      if (isInCheck(color)) return false;
      if (isSquareAttacked(row, 5, 'white') || isSquareAttacked(row, 6, 'white')) return false;
      return true;
    }
  }
  return false;
}

// Helper function to find the king position for a given color
function findKingPosition(color) {
  const king = color === 'white' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) {
        return {row: r, col: c};
      }
    }
  }
  return null;
}

// Check if a given square is attacked by opponent pieces
function isSquareAttacked(row, col, attackerColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && ((attackerColor === 'white' && piece === piece.toUpperCase()) || (attackerColor === 'black' && piece === piece.toLowerCase()))) {
        if (isValidMove(r, c, row, col, true)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if the current player's king is in check
function isInCheck(color) {
  const kingPos = findKingPosition(color);
  if (!kingPos) return false;
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(kingPos.row, kingPos.col, opponentColor);
}

function hasAnyValidMoves(color) {
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && ((color === 'white' && piece === piece.toUpperCase()) || (color === 'black' && piece === piece.toLowerCase()))) {
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

function isValidMove(fromRow, fromCol, toRow, toCol, ignoreCheck = false) {
  if (gameOver) return false;
  const piece = board[fromRow][fromCol];
  const target = board[toRow][toCol];
  if (piece === '') return false;
  if (target !== '' && isCurrentPlayerPiece(target)) return false;

  const pieceType = piece.toLowerCase();
  const direction = piece === piece.toUpperCase() ? -1 : 1;
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  // Castling check
  if (pieceType === 'k' && fromRow === toRow && Math.abs(colDiff) === 2) {
    const side = colDiff === 2 ? 'right' : 'left';
    if (canCastle(currentPlayer, side)) {
      if (ignoreCheck) return true;
      const tempBoard = board.map(row => row.slice());
      tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
      tempBoard[fromRow][fromCol] = '';
      if (side === 'right') {
        tempBoard[toRow][toCol - 1] = tempBoard[toRow][7];
        tempBoard[toRow][7] = '';
      } else {
        tempBoard[toRow][toCol + 1] = tempBoard[toRow][0];
        tempBoard[toRow][0] = '';
      }
      const inCheck = isInCheckAfterMove(tempBoard, currentPlayer);
      return !inCheck;
    }
    return false;
  }

  function isPathClear() {
    let stepRow = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    let stepCol = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
    let r = fromRow + stepRow;
    let c = fromCol + stepCol;
    while (r !== toRow || c !== toCol) {
      if (board[r][c] !== '') return false;
      r += stepRow;
      c += stepCol;
    }
    return true;
  }

  let valid = false;
  switch (pieceType) {
    case 'p':
      if (colDiff === 0) {
        if (rowDiff === direction && target === '') valid = true;
        if ((fromRow === 1 && piece === 'p' || fromRow === 6 && piece === 'P') &&
            rowDiff === 2 * direction && target === '' &&
            board[fromRow + direction][fromCol] === '') valid = true;
      }
      if (Math.abs(colDiff) === 1 && rowDiff === direction && target !== '' && !isCurrentPlayerPiece(target)) valid = true;
      break;
    case 'r':
      if (rowDiff === 0 || colDiff === 0) {
        valid = isPathClear();
      }
      break;
    case 'n':
      if ((Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
          (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)) {
        valid = true;
      }
      break;
    case 'b':
      if (Math.abs(rowDiff) === Math.abs(colDiff)) {
        valid = isPathClear();
      }
      break;
    case 'q':
      if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
        valid = isPathClear();
      }
      break;
    case 'k':
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        valid = true;
      }
      break;
  }
  if (!valid) return false;

  if (ignoreCheck) return true;

  const tempFrom = board[fromRow][fromCol];
  const tempTo = board[toRow][toCol];
  board[toRow][toCol] = tempFrom;
  board[fromRow][fromCol] = '';
  const inCheck = isInCheck(currentPlayer);
  board[fromRow][fromCol] = tempFrom;
  board[toRow][toCol] = tempTo;

  return !inCheck;
}

function isInCheckAfterMove(tempBoard, color) {
  const king = color === 'white' ? 'K' : 'k';
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (tempBoard[r][c] === king) {
        kingPos = {row: r, col: c};
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false;
  const opponentColor = color === 'white' ? 'black' : 'white';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = tempBoard[r][c];
      if (piece && ((opponentColor === 'white' && piece === piece.toUpperCase()) || (opponentColor === 'black' && piece === piece.toLowerCase()))) {
        if (isValidMoveOnBoard(tempBoard, r, c, kingPos.row, kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isValidMoveOnBoard(tempBoard, fromRow, fromCol, toRow, toCol) {
  const piece = tempBoard[fromRow][fromCol];
  const target = tempBoard[toRow][toCol];
  if (piece === '') return false;
  if (target !== '' && ((piece === piece.toUpperCase() && target === target.toUpperCase()) || (piece === piece.toLowerCase() && target === target.toLowerCase()))) return false;

  const pieceType = piece.toLowerCase();
  const direction = piece === piece.toUpperCase() ? -1 : 1;
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  function isPathClear() {
    let stepRow = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    let stepCol = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
    let r = fromRow + stepRow;
    let c = fromCol + stepCol;
    while (r !== toRow || c !== toCol) {
      if (tempBoard[r][c] !== '') return false;
      r += stepRow;
      c += stepCol;
    }
    return true;
  }

  switch (pieceType) {
    case 'p':
      if (colDiff === 0) {
        if (rowDiff === direction && target === '') return true;
        if ((fromRow === 1 && piece === 'p' || fromRow === 6 && piece === 'P') &&
            rowDiff === 2 * direction && target === '' &&
            tempBoard[fromRow + direction][fromCol] === '') return true;
      }
      if (Math.abs(colDiff) === 1 && rowDiff === direction && target !== '' && !((piece === piece.toUpperCase() && target === target.toUpperCase()) || (piece === piece.toLowerCase() && target === target.toLowerCase()))) return true;
      return false;
    case 'r':
      if (rowDiff === 0 || colDiff === 0) {
        return isPathClear();
      }
      return false;
    case 'n':
      if ((Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
          (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)) {
        return true;
      }
      return false;
    case 'b':
      if (Math.abs(rowDiff) === Math.abs(colDiff)) {
        return isPathClear();
      }
      return false;
    case 'q':
      if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
        return isPathClear();
      }
      return false;
    case 'k':
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        return true;
      }
    return false;
  default:
    return false;
  }
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = '';
  lastAIMove = {fromRow, fromCol, toRow, toCol};

  // Update moved flags for castling rights
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

  // Handle castling move rook reposition
  if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
    const row = fromRow;
    if (toCol === 6) { // kingside
      board[row][5] = board[row][7];
      board[row][7] = '';
      if (piece === 'K') whiteRookMoved.right = true;
      else blackRookMoved.right = true;
    } else if (toCol === 2) { // queenside
      board[row][3] = board[row][0];
      board[row][0] = '';
      if (piece === 'K') whiteRookMoved.left = true;
      else blackRookMoved.left = true;
    }
  }

  // Handle en passant capture
  if (piece.toLowerCase() === 'p') {
    if (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
      if (fromCol !== toCol) {
        const direction = piece === piece.toUpperCase() ? 1 : -1;
        board[toRow + direction][toCol] = '';
      }
    }
  }

  // Update enPassantTarget for double pawn move
  if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
    enPassantTarget = {row: (fromRow + toRow) / 2, col: fromCol};
  } else {
    enPassantTarget = null;
  }

  // Handle pawn promotion
  if (piece.toLowerCase() === 'p') {
    const promotionRow = piece === 'P' ? 0 : 7;
    if (toRow === promotionRow) {
      const promotionPiece = prompt('Pawn promotion! Enter Q, R, B, or N:', 'Q');
      const validPromotions = ['Q', 'R', 'B', 'N'];
      let promotedPiece = 'Q';
      if (promotionPiece && validPromotions.includes(promotionPiece.toUpperCase())) {
        promotedPiece = promotionPiece.toUpperCase();
      }
      board[toRow][toCol] = piece === 'P' ? promotedPiece : promotedPiece.toLowerCase();
    }
  }
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
