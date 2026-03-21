/*:
 * @plugindesc 贪吃蛇小游戏插件 - 在 RPG Maker 中玩贪吃蛇游戏
 * @author Claude
 *
 * @help
 * ============================================
 * 贪吃蛇小游戏插件
 * ============================================
 *
 * 插件命令：
 *   StartSnakeGame           - 开始贪吃蛇游戏
 *   StopSnakeGame            - 停止贪吃蛇游戏
 *   SetSnakeDifficulty easy  - 设置难度为简单
 *   SetSnakeDifficulty medium - 设置难度为中等
 *   SetSnakeDifficulty hard  - 设置难度为困难
 *
 * 游戏操作：
 *   方向键 - 控制蛇的移动方向
 *   ESC    - 暂停/继续游戏
 *   ENTER  - 重新开始游戏
 *
 * ============================================
 *
 * @param GridSize
 * @desc 网格大小
 * @default 20
 *
 * @param BoardWidth
 * @desc 游戏板宽度（格子数）
 * @default 20
 *
 * @param BoardHeight
 * @desc 游戏板高度（格子数）
 * @default 15
 */

(function() {
    var parameters = PluginManager.parameters('SnakeGame');

    // 参数配置
    var gridSize = Number(parameters['GridSize'] || 20);
    var boardWidth = Number(parameters['BoardWidth'] || 20);
    var boardHeight = Number(parameters['BoardHeight'] || 15);

    // 难度设置 (speed: 毫秒)
    var difficulties = {
        easy: 200,
        medium: 100,
        hard: 50
    };
    var currentDifficulty = 'medium';
    var gameSpeed = difficulties[currentDifficulty];

    // 游戏状态
    var snakeGame = {
        active: false,
        paused: false,
        snake: [],
        direction: 'right',
        nextDirection: 'right',
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        gameLoop: null,
        canvas: null,
        ctx: null,
        uiDiv: null
    };

    // 游戏场景类
    function Scene_SnakeGame() {
        this.initialize.apply(this, arguments);
    }

    Scene_SnakeGame.prototype = Object.create(Scene_Base.prototype);
    Scene_SnakeGame.prototype.constructor = Scene_SnakeGame;

    Scene_SnakeGame.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this.createGameElements();
        this.startGame();
        Input.clear();
    };

    Scene_SnakeGame.prototype.createGameElements = function() {
        // 创建游戏容器
        var container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '0px';
        container.style.top = '0px';
        container.style.width = Graphics.width + 'px';
        container.style.height = Graphics.height + 'px';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        container.style.zIndex = '100';
        document.body.appendChild(container);

        // 创建Canvas
        var canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.width = boardWidth * gridSize;
        canvas.height = boardHeight * gridSize;
        canvas.style.position = 'absolute';
        canvas.style.left = ((Graphics.width - canvas.width) / 2) + 'px';
        canvas.style.top = ((Graphics.height - canvas.height) / 2 + 50) + 'px';
        container.appendChild(canvas);

        snakeGame.canvas = canvas;
        snakeGame.ctx = canvas.getContext('2d');

        // 创建UI
        var uiDiv = document.createElement('div');
        uiDiv.id = 'snake-ui';
        uiDiv.style.position = 'absolute';
        uiDiv.style.left = '0px';
        uiDiv.style.top = '0px';
        uiDiv.style.width = Graphics.width + 'px';
        uiDiv.style.height = '120px';
        uiDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        uiDiv.style.color = 'white';
        uiDiv.style.fontFamily = 'Arial, sans-serif';
        uiDiv.style.fontSize = '20px';
        uiDiv.style.textAlign = 'center';
        uiDiv.style.paddingTop = '10px';
        container.appendChild(uiDiv);

        snakeGame.uiDiv = uiDiv;
    };

    Scene_SnakeGame.prototype.updateUI = function() {
        var html = '<div>分数: ' + snakeGame.score + ' | 最高分: ' + snakeGame.highScore + ' | 难度: ' + currentDifficulty.toUpperCase() + '</div>';
        html += '<div style="margin-top: 10px;">方向键: 移动 | ESC: 暂停 | ENTER: 重新开始</div>';
        if (snakeGame.paused) {
            html += '<div style="margin-top: 10px; color: yellow;">已暂停</div>';
        }
        snakeGame.uiDiv.innerHTML = html;
    };

    Scene_SnakeGame.prototype.drawGame = function() {
        var ctx = snakeGame.ctx;
        var canvas = snakeGame.canvas;

        // 清空画布
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制食物
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            snakeGame.food.x * gridSize + 2,
            snakeGame.food.y * gridSize + 2,
            gridSize - 4,
            gridSize - 4
        );

        // 绘制蛇
        for (var i = 0; i < snakeGame.snake.length; i++) {
            var segment = snakeGame.snake[i];
            var x = segment.x * gridSize + 2;
            var y = segment.y * gridSize + 2;
            var size = gridSize - 4;

            // 头部用深绿色
            if (i === 0) {
                ctx.fillStyle = '#00cc00';
            } else {
                ctx.fillStyle = '#00ff00';
            }

            ctx.fillRect(x, y, size, size);
        }

        // 绘制暂停状态
        if (snakeGame.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffff00';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
        }
    };

    Scene_SnakeGame.prototype.startGame = function() {
        snakeGame.snake = [{ x: 5, y: 5 }];
        snakeGame.direction = 'right';
        snakeGame.nextDirection = 'right';
        snakeGame.score = 0;
        snakeGame.paused = false;
        snakeGame.active = true;

        this.spawnFood();
        this.startGameLoop();
        this.updateUI();
        this.drawGame();
    };

    Scene_SnakeGame.prototype.spawnFood = function() {
        var valid = false;
        while (!valid) {
            snakeGame.food = {
                x: Math.floor(Math.random() * boardWidth),
                y: Math.floor(Math.random() * boardHeight)
            };

            valid = true;
            for (var i = 0; i < snakeGame.snake.length; i++) {
                if (snakeGame.snake[i].x === snakeGame.food.x &&
                    snakeGame.snake[i].y === snakeGame.food.y) {
                    valid = false;
                    break;
                }
            }
        }
    };

    Scene_SnakeGame.prototype.startGameLoop = function() {
        if (snakeGame.gameLoop) {
            clearInterval(snakeGame.gameLoop);
        }

        var self = this;
        snakeGame.gameLoop = setInterval(function() {
            self.gameUpdate();
        }, gameSpeed);
    };

    Scene_SnakeGame.prototype.gameUpdate = function() {
        if (!snakeGame.active) return;

        if (snakeGame.paused) return;

        // 更新方向
        snakeGame.direction = snakeGame.nextDirection;

        // 计算新头部位置
        var head = snakeGame.snake[0];
        var newHead = { x: head.x, y: head.y };

        switch (snakeGame.direction) {
            case 'up':
                newHead.y--;
                break;
            case 'down':
                newHead.y++;
                break;
            case 'left':
                newHead.x--;
                break;
            case 'right':
                newHead.x++;
                break;
        }

        // 检查碰撞
        if (this.checkCollision(newHead)) {
            this.gameOver();
            return;
        }

        // 移动蛇
        snakeGame.snake.unshift(newHead);

        // 检查是否吃到食物
        if (newHead.x === snakeGame.food.x && newHead.y === snakeGame.food.y) {
            snakeGame.score += 10;
            if (snakeGame.score > snakeGame.highScore) {
                snakeGame.highScore = snakeGame.score;
            }
            this.spawnFood();
        } else {
            snakeGame.snake.pop();
        }

        // 更新显示
        this.drawGame();
        this.updateUI();
    };

    Scene_SnakeGame.prototype.checkCollision = function(pos) {
        // 检查墙壁碰撞
        if (pos.x < 0 || pos.x >= boardWidth || pos.y < 0 || pos.y >= boardHeight) {
            return true;
        }

        // 检查自身碰撞
        for (var i = 0; i < snakeGame.snake.length; i++) {
            if (snakeGame.snake[i].x === pos.x && snakeGame.snake[i].y === pos.y) {
                return true;
            }
        }

        return false;
    };

    Scene_SnakeGame.prototype.gameOver = function() {
        snakeGame.active = false;
        if (snakeGame.gameLoop) {
            clearInterval(snakeGame.gameLoop);
        }

        var ctx = snakeGame.ctx;
        var canvas = snakeGame.canvas;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText('按 ENTER 重新开始', canvas.width / 2, canvas.height / 2 + 30);
    };

    Scene_SnakeGame.prototype.restartGame = function() {
        this.startGame();
    };

    Scene_SnakeGame.prototype.togglePause = function() {
        if (snakeGame.active) {
            snakeGame.paused = !snakeGame.paused;
            this.updateUI();
            this.drawGame();
        }
    };

    Scene_SnakeGame.prototype.update = function() {
        Scene_Base.prototype.update.call(this);

        if (Input.isTriggered('cancel')) { // ESC 键
            this.togglePause();
        } else if (Input.isTriggered('ok')) { // ENTER 键
            if (!snakeGame.active) {
                this.restartGame();
            }
        } else if (snakeGame.active && !snakeGame.paused) {
            if (Input.isTriggered('up') && snakeGame.direction !== 'down') {
                snakeGame.nextDirection = 'up';
            } else if (Input.isTriggered('down') && snakeGame.direction !== 'up') {
                snakeGame.nextDirection = 'down';
            } else if (Input.isTriggered('left') && snakeGame.direction !== 'right') {
                snakeGame.nextDirection = 'left';
            } else if (Input.isTriggered('right') && snakeGame.direction !== 'left') {
                snakeGame.nextDirection = 'right';
            }
        }
    };

    Scene_SnakeGame.prototype.stop = function() {
        if (snakeGame.gameLoop) {
            clearInterval(snakeGame.gameLoop);
        }

        if (snakeGame.canvas && snakeGame.canvas.parentNode) {
            snakeGame.canvas.parentNode.removeChild(snakeGame.canvas);
        }

        if (snakeGame.uiDiv && snakeGame.uiDiv.parentNode) {
            snakeGame.uiDiv.parentNode.removeChild(snakeGame.uiDiv);
        }

        snakeGame.active = false;
    };

    // 插件命令处理
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'StartSnakeGame') {
            SceneManager.push(Scene_SnakeGame);
        } else if (command === 'StopSnakeGame') {
            if (SceneManager._scene instanceof Scene_SnakeGame) {
                SceneManager._scene.stop();
            }
            SceneManager.pop();
        } else if (command === 'SetSnakeDifficulty') {
            var difficulty = args[0] ? args[0].toLowerCase() : 'medium';
            if (difficulties[difficulty]) {
                currentDifficulty = difficulty;
                gameSpeed = difficulties[difficulty];
                if (snakeGame.gameLoop) {
                    var scene = SceneManager._scene;
                    if (scene && scene.startGameLoop) {
                        scene.startGameLoop();
                    }
                }
            }
        }
    };

    // 全局函数，方便调试
    window.SnakeGame = {
        start: function() {
            SceneManager.push(Scene_SnakeGame);
        },
        setDifficulty: function(difficulty) {
            if (difficulties[difficulty]) {
                currentDifficulty = difficulty;
                gameSpeed = difficulties[difficulty];
            }
        }
    };
})();