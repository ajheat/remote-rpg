function init() {
	var canvas = document.getElementById('gridCanvas');
	var ctx = canvas.getContext('2d');
	var containerDiv = document.getElementById('canvasDiv');
	var tokenGrid = new TokenGrid(15, 15);
	tokenGrid.addToken(new Token(1, 1, '#990099', 'circle'));
	tokenGrid.addToken(new Token(14, 13, '#009900', 'square'));
	var gridView = new GridCanvas(canvas, 40, tokenGrid, containerDiv);
	
	var resizeListener = function(e) {
		gridView.resize();
	}
	
	window.addEventListener('resize', resizeListener, false);
	window.addEventListener('orientationChange', resizeListener, false);
}

function Token(x, y, color, type) {
  this.x = x;
  this.y = y;
  this.color = color;
  this.type = type;
}

function TokenGrid(rows, cols) {
  this.rows = rows;
  this.cols = cols;

  this.tokens = [];

  this.gridContents = [];
  for (var i = 0; i < this.cols; i++) {
    this.gridContents[i] = [];
    for (var j = 0; j < this.rows; j++) {
      this.gridContents[i].push(null);
    }
  }
}

TokenGrid.prototype.addToken = function(token) {
  this.tokens.push(token);
  this.gridContents[token.x][token.y] = token;
}

TokenGrid.prototype.getTokenAtCoords = function(x, y) {
  return this.gridContents[x][y];
}

TokenGrid.prototype.moveTokenTo = function(token, x, y) {
  if (this.gridContents[x][y] === null) {
	this.gridContents[token.x][token.y] = null;
	token.x = x;
	token.y = y;
	this.gridContents[x][y] = token;
  }
}

function GridCanvas(canvas, cellSize, tokenGrid, container) {
  this.canvas = canvas;
  this.tGrid = tokenGrid;
  this.container = container;

  this.rows = this.tGrid.rows;
  this.cols = this.tGrid.cols;

  this.cellSize = cellSize;
  this.tokenOffset = cellSize / 10;
  this.tokenSize = cellSize - (this.tokenOffset * 2);
  this.xOffset = 0;
  this.yOffset = 0;
  this.canvasTop = canvas.offsetTop;
  this.canvasLeft = canvas.offsetLeft;
  this.ctx = canvas.getContext('2d');

  this.resetMovementVariables();
  var gridCanvas = this;
  
  var mouseDownListener = function(x, y) {
	if (x > gridCanvas.viewWidth || y > gridCanvas.viewHeight) {
		return;
	}
    var gridCoords = gridCanvas.getGridCoords(x, y);
    var token = gridCanvas.tGrid.getTokenAtCoords(gridCoords.x, gridCoords.y);
    if (token !== null) {
      gridCanvas.dragging = true;
      gridCanvas.activeToken = token;
      
      var coords = gridCanvas.getTokenPixelCoords(token);
      gridCanvas.activeX = coords.x;
      gridCanvas.activeY = coords.y;
    } else {
      gridCanvas.panning = true;
    }
    gridCanvas.prevX = x;
    gridCanvas.prevY = y;
  }
  
  var mouseMoveListener = function(x, y) {
	  if (gridCanvas.panning || gridCanvas.dragging) {
      var deltaX = gridCanvas.prevX - x;
      var deltaY = gridCanvas.prevY - y;
      gridCanvas.prevX = x;
      gridCanvas.prevY = y;

      if (gridCanvas.panning) {
        gridCanvas.adjustXOffset(deltaX);
        gridCanvas.adjustYOffset(deltaY);
        gridCanvas.render();
      } else if (gridCanvas.dragging) {
        gridCanvas.activeX -= deltaX;
        gridCanvas.activeY -= deltaY;
        gridCanvas.render();
      }
    }
  }

  canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);

  canvas.addEventListener('mousedown', function(e) {
    var loc = gridCanvas.getEventLocation(e);
	mouseDownListener(loc.x, loc.y);
	
  });
  canvas.addEventListener('touchstart', function(e) {
	  var touch = e.touches[0];
	  var loc = gridCanvas.getEventLocation(touch);
	  mouseDownListener(loc.x, loc.y);
  });
  canvas.addEventListener('mouseup', function(e) {
    var loc = gridCanvas.getEventLocation(e);
	gridCanvas.finishMovement(loc.x, loc.y);
  });
  canvas.addEventListener('touchend', function(e) {
    var touch = e.changedTouches[0];
	var loc = gridCanvas.getEventLocation(touch);
	gridCanvas.finishMovement(loc.x, loc.y);
  });
  canvas.addEventListener('mousemove', function(e) {
    var loc = gridCanvas.getEventLocation(e);
	mouseMoveListener(loc.x, loc.y);
  });
  canvas.addEventListener('touchmove', function(e) {
    var touch = e.touches[0];
	var loc = gridCanvas.getEventLocation(touch);
	mouseMoveListener(loc.x, loc.y);
  });
  canvas.addEventListener('mouseout', function(e) {
	var loc = gridCanvas.getEventLocation(e);
    gridCanvas.finishMovement(loc.x, loc.y);
  });
  canvas.addEventListener('wheel', function(e) {
  	gridCanvas.adjustXOffset(e.deltaX / 10);
    gridCanvas.adjustYOffset(e.deltaY / 10);
    gridCanvas.render();
  	return false;
  }, false);
  this.resize();
}

GridCanvas.prototype.finishMovement = function(x, y) {
  if (this.dragging) {
    this.recalcTokenPosition(this.activeToken, x, y);
  }
  this.resetMovementVariables();
  this.render();
}

GridCanvas.prototype.recalcTokenPosition = function(token, x, y) {
  var coords = this.getGridCoords(x, y);
  if (x !== token.x || y !== token.getY) {
    this.tGrid.moveTokenTo(token, coords.x, coords.y);
  }
}

GridCanvas.prototype.resetMovementVariables = function() {
  this.panning = false;
  this.dragging = false;
  this.activeToken = null;
  this.prevX = 0;
  this.prevY = 0;
  this.dragX = 0;
  this.dragY = 0;
}

GridCanvas.prototype.adjustXOffset = function(delta) {
  this.xOffset -= delta;
  this.validateXOffset();
}

GridCanvas.prototype.validateXOffset = function() {
  if (this.xOffset > 0) {
    this.xOffset = 0;
  } else if (this.xOffset < 0 - this.maxXOffset) {
    this.xOffset = 0 - this.maxXOffset;
  }
}

GridCanvas.prototype.adjustYOffset = function(delta) {
  this.yOffset -= delta;
  this.validateYOffset();
}

GridCanvas.prototype.validateYOffset = function() {
  if (this.yOffset > 0) {
    this.yOffset = 0;
  } else if (this.yOffset < 0 - this.maxYOffset) {
    this.yOffset = 0 - this.maxYOffset;
  }
}

GridCanvas.prototype.getEventLocation = function(e) {
  var x = e.pageX - this.canvasLeft;
  var y = e.pageY - this.canvasTop;
  return {
    x: x,
    y: y
  };
}

GridCanvas.prototype.getGridCoords = function(x, y) {
  var gridX = Math.floor((x - this.fixedOffset - this.xOffset) / this.cellSize);
  var gridY = Math.floor((y - this.fixedOffset - this.yOffset) / this.cellSize);
  return {
    x: gridX,
    y: gridY
  };
}

GridCanvas.prototype.fitToSpace = function() {
  // maybe move this declaration somewhere else 
  this.fixedOffset = 1;
  
  this.height = this.canvas.height;
  this.width = this.canvas.width;
  var viewWidth = this.width - (this.width % this.cellSize) - (this.fixedOffset * 2);
  var totalWidth = this.cellSize * this.cols;
  if (totalWidth < viewWidth) {
    this.viewWidth = totalWidth;
    this.maxXOffset = 0;
  } else {
    this.viewWidth = viewWidth;
    this.maxXOffset = totalWidth - viewWidth;
  }
  this.validateXOffset();
  
  var viewHeight = this.height - (this.height % this.cellSize) - (this.fixedOffset * 2);
  var totalHeight = this.cellSize * this.rows;
  if (totalHeight < viewHeight) {
    this.viewHeight = totalHeight;
    this.maxYOffset = 0;
  } else {
    this.viewHeight = viewHeight;
    this.maxYOffset = totalHeight - viewHeight;
  }
  this.validateYOffset();
}

GridCanvas.prototype.lineBetween = function(x1, y1, x2, y2) {
  this.lineBetweenAbsolute(x1 + this.fixedOffset, y1 + this.fixedOffset, x2 + this.fixedOffset, y2 + this.fixedOffset);
}

GridCanvas.prototype.lineBetweenAbsolute = function(x1, y1, x2, y2) {
  this.ctx.beginPath();
  this.ctx.moveTo(x1, y1);
  this.ctx.lineTo(x2, y2);
  this.ctx.stroke();
}

GridCanvas.prototype.resize = function() {
	this.ctx.canvas.width = this.container.clientWidth;
	this.ctx.canvas.height = this.container.clientHeight;
	this.fitToSpace();
	this.render();
}

GridCanvas.prototype.render = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.renderGrid();
  this.renderIdleTokens();
  this.renderBorder();
  this.renderActiveToken();
}

GridCanvas.prototype.renderGrid = function() {
  var gridOffsetX = this.xOffset % this.cellSize;
  var gridOffsetY = this.yOffset % this.cellSize;
  for (var i = 0; i * this.cellSize + gridOffsetX <= this.viewWidth; i++) {
    this.lineBetween(i * this.cellSize + gridOffsetX, 0, i * this.cellSize + gridOffsetX, this.viewHeight);
  }

  for (var j = 0; j * this.cellSize + gridOffsetY <= this.viewHeight; j++) {
    this.lineBetween(0, j * this.cellSize + gridOffsetY, this.viewWidth, j * this.cellSize + gridOffsetY);
  }
}

GridCanvas.prototype.getTokenPixelCoords = function(token) {
  var x = token.x * this.cellSize + this.fixedOffset + this.xOffset;
  var y = token.y * this.cellSize + this.fixedOffset + this.yOffset;
  x += this.tokenOffset;
  y += this.tokenOffset;
  return {
    x: x,
    y: y
  };
}

GridCanvas.prototype.renderSingleToken = function(token, x, y) {
	var style = this.ctx.fillStyle;
  if (token.type === 'circle') {
  	var radius = this.tokenSize / 2;
    this.ctx.fillStyle = token.color;

    this.ctx.beginPath();
    this.ctx.arc(x + radius, y + radius, radius, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.fillStyle = style;
  } else if (token.type === 'square') {
    this.ctx.fillStyle = token.color;
    this.ctx.fillRect(x, y, this.tokenSize, this.tokenSize);
    this.ctx.fillStyle = style;
  }
}

GridCanvas.prototype.renderIdleTokens = function() {
  for (var i = 0; i < this.tGrid.tokens.length; i++) {
    var token = this.tGrid.tokens[i];
    if (token !== this.activeToken) {
      var coords = this.getTokenPixelCoords(token);
	  this.renderSingleToken(token, coords.x, coords.y);
    }
  }
}

GridCanvas.prototype.renderActiveToken = function() {
	if (this.activeToken !== null) {
		this.renderSingleToken(this.activeToken, this.activeX, this.activeY);
	}
}

GridCanvas.prototype.renderBorder = function() {
  var lineWidth = this.ctx.lineWidth;
  this.ctx.lineWidth = 3;
  this.ctx.strokeRect(this.fixedOffset, this.fixedOffset, this.viewWidth, this.viewHeight);
  this.ctx.lineWidth = lineWidth;
  
  var style = this.ctx.fillStyle;
  
  this.ctx.fillStyle = '#ffffff';
  this.ctx.fillRect(0, this.viewHeight + 2, this.canvas.width, this.canvas.height - this.viewHeight);
  this.ctx.fillRect(this.viewWidth + 2, 0, this.canvas.width - this.viewWidth, this.canvas.height);
  this.ctx.fillStyle = style;
}