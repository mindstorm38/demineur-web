
const Demineur = (function(){

	const MINE_PROB = 0.1;

	const GRIDS = [
		{ name: "Facile", size: [16,16], prob: 0.1 },
		{ name: "Normale", size: [24,24], prob: 0.11 },
		{ name: "Difficile", size: [32, 24], prob: 0.12 },
		{ name: "Hardcore", size: [48, 24], prob: 0.14 }
	];

	let gameTable = null;
	let gameTimer = null;
	let gameResetButton = null;
	let gameGridSelector = null;

	let gameData = null;

	function init() {

		gameTimer = document.getElementById("game-timer");
		gameResetButton = document.getElementById("game-reset");
		gameTable = document.getElementById("game-table");

		initGridSelector();

		gameResetButton.addEventListener("click", resetGrid);

		setInterval(repeatUpdater, 50);

	}

	function initGridSelector() {
		
		gameGridSelector = document.getElementById("game-grid-selector");
		gameGridSelector.innerHTML = "";

		let grid, option;
		for ( let i = 0; i < GRIDS.length; i++ ) {

			grid = GRIDS[i];

			option = document.createElement("option")
			option.value = i;
			option.textContent = grid.name + " (" + grid.size[0] + "x" + grid.size[1] + ")";

			gameGridSelector.appendChild(option);

			if ( i === 0 ) {

				gameGridSelector.value = i;
				gridChanged();
				
			}

		}

		gameGridSelector.addEventListener("change", gridChanged);

	}

	function gridChanged() {

		const grid = GRIDS[gameGridSelector.value];
		
		if ( grid != null ) {
			setupGrid(grid.size[0], grid.size[1], grid.prob);
		}

	}

	function isGameRunning() {
		return gameData != null && gameData.ended == null;
	}

	function setupGrid(width, height, prob) {
		
		gameTable.innerHTML = "";

		gameData = {
			width: width,
			height: height,
			started: null,
			ended: null,
			prob: prob,
			bombs: 0,
			covered: (width * height),
			cells: []
		};

		const bombsLimit = Math.floor(gameData.covered * prob);

		let row, cell;

		for ( let x = 0; x < width; x++ ) {

			gameData.cells[x] = [];

			for ( let y = 0; y < height; y++ ) {

				gameData.cells[x][y] = {
					x: x,
					y: y,
					bomb: (gameData.bombs < bombsLimit) ? (Math.random() <= prob) : false,
					disc: false,
					flag: false,
					dist: 0,
					min: {
						x: Math.max(0, x - 1),
						y: Math.max(0, y - 1)
					},
					max: {
						x: Math.min(width - 1, x + 1),
						y: Math.min(height - 1, y + 1)
					},
					elt: null
				};

				if ( gameData.cells[x][y].bomb ) {
					gameData.bombs++;
				}

			}

		}

		foreachCell(function(x, y, data) {
			computeCellDistance(data);
		});

		for ( let y = 0; y < height; y++ ) {

			row = document.createElement("tr");
			gameTable.appendChild(row);

			for ( let x = 0; x < width; x++) {

				cell = document.createElement("td");
				cell.className = "covered";
				row.appendChild(cell);

				const cellData = gameData.cells[x][y];

				cellData.elt = cell;
				computeCellDistance(cellData);

				cell.addEventListener("click", function() {
					discoverCell(cellData);
				});

				cell.addEventListener("contextmenu", function(e) {

					e.preventDefault();
					flagCell(cellData);
					return false;

				});

			}

		}

		updateGameTimer(0);

	}

	function resetGrid() {

		if ( gameData != null ) {
			setupGrid(gameData.width, gameData.height, gameData.prob);
		}

	}

	function foreachCell(callback) {

		if ( !isGameRunning() )
			return;

		for ( let x = 0; x < gameData.width; x++ )
			for ( let y = 0; y < gameData.height; y++ )
				callback(x, y, gameData.cells[x][y]);

	}

	function foreachCellAround(data, callback) {
		
		if ( !isGameRunning() )
			return;

		for ( let x = data.min.x; x <= data.max.x; x++ )
			for ( let y = data.min.y; y <= data.max.y; y++ )
				if ( x != data.x || y != data.y )
					callback(x, y, gameData.cells[x][y]);

	}

	function computeCellDistance(data) {

		let count = 0;

		foreachCellAround(data, function(x, y, dt) {
			if ( dt.bomb ) count++;
		});

		data.dist = count;

	}

	function discoverCell(data, forced) {

		if ( !isGameRunning() )
			return;

		if ( data.disc )
			return;
		
		if ( forced !== true && data.flag )
			return;

		if ( gameData.started == null ) {
			gameData.started = Date.now();
		}

		data.disc = true;
		data.elt.className = "";
		gameData.covered--;

		if ( data.bomb ) {

			data.elt.textContent = "💣";
			data.elt.className = "bomb";

			if ( forced !== true ) {
				
				endGame(true);
				window.alert("Loosed");

			}

		} else {

			if ( data.dist !== 0 ) {

				data.elt.textContent = data.dist;
				data.elt.className = "dist-" + data.dist;

			} else {

				setTimeout(function() {

					foreachCellAround(data, function(x, y, dt) {
						discoverCell(dt);
					});

				}, 20);

			}

			if ( forced !== true && gameData.bombs === gameData.covered ) {
				
				endGame(false);
				window.alert("Win !");

			}

		}

	}

	function discoverAll() {

		foreachCell( function(x, y, data) {
			discoverCell(data, true);
		} );

	}

	function flagCell(data) {

		if ( !isGameRunning() )
			return;

		if ( data.disc )
			return;

		data.flag = !data.flag;

		if ( data.flag ) {
			data.elt.textContent = "🚩";
		} else {
			data.elt.textContent = "";
		}

	}

	function endGame(disc) {

		if ( !isGameRunning() )
			return;

		if (disc)
			discoverAll();
		
		gameData.ended = Date.now();
		updateGameTimer( gameData.ended - gameData.started );

	}

	function repeatUpdater() {

		if ( isGameRunning() ) {

			if ( gameData.started != null ) {
				updateGameTimer( Date.now() - gameData.started );
			}

		}

	}

	function updateGameTimer(timems) {

		const secs = Math.floor( timems / 1000 ) % 60;
		const mins = Math.floor( timems / 1000 / 60 );

		gameTimer.textContent = String(mins).padStart(2, "0") + "：" + String(secs).padStart(2, "0");

	}
	
	function getGameData() {
		return gameData;
	}

	return {
		init: init,
		setupGrid: setupGrid,
		resetGrid: resetGrid,
		isGameRunning: isGameRunning,
		getGameData: getGameData
	};

})();

document.addEventListener("DOMContentLoaded", Demineur.init);