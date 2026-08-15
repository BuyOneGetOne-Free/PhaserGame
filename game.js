const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#202020",
    scene: {
        create: create
    }
};

const game = new Phaser.Game(config);

const STARTING_MONEY = 50;
const MINIMUM_BET = 10;

let money = STARTING_MONEY;
let bet = MINIMUM_BET;
let isGameOver = false;

let moneyText;
let betText;
let resultText;
let coin;
let coinText;
let gameOverText;
let minusButton;
let plusButton;
let allButton;
let restartButton;

function create() {
    this.add.text(400, 50, "COIN FLIP", {
        fontSize: "48px",
        color: "#ffffff"
    }).setOrigin(0.5);

    moneyText = this.add.text(400, 120, "", {
        fontSize: "32px",
        color: "#ffd700"
    }).setOrigin(0.5);

    coin = this.add.circle(400, 230, 70, 0xffd700)
        .setStrokeStyle(6, 0xd19a00)
        .setInteractive({ useHandCursor: true });

    coinText = this.add.text(400, 230, "?", {
        fontSize: "64px",
        color: "#202020",
        fontStyle: "bold"
    }).setOrigin(0.5);

    coin.on("pointerdown", flipCoin);

    resultText = this.add.text(400, 320, "Click the coin", {
        fontSize: "32px",
        color: "#ffffff"
    }).setOrigin(0.5);

    betText = this.add.text(400, 370, "", {
        fontSize: "28px",
        color: "#ffffff"
    }).setOrigin(0.5);

    minusButton = createButton(this, 250, 430, "-10", decreaseBet);
    plusButton = createButton(this, 400, 430, "+10", increaseBet);
    allButton = createButton(this, 550, 430, "ALL", betAll);

    gameOverText = this.add.text(400, 495, "GAME OVER", {
        fontSize: "40px",
        color: "#ff5555",
        fontStyle: "bold"
    }).setOrigin(0.5).setVisible(false);

    restartButton = createButton(this, 400, 550, "RESTART", restartGame);
    restartButton.setVisible(false).disableInteractive();

    updateUI();
}

function createButton(scene, x, y, label, callback) {
    const button = scene.add.text(x, y, label, {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#444444",
        padding: {
            x: 20,
            y: 10
        }
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    button.on("pointerdown", callback);
    button.on("pointerover", function () {
        button.setStyle({ backgroundColor: "#666666" });
    });
    button.on("pointerout", function () {
        button.setStyle({ backgroundColor: "#444444" });
    });

    return button;
}

function decreaseBet() {
    if (isGameOver) {
        return;
    }

    bet = Math.max(MINIMUM_BET, bet - 10);
    updateUI();
}

function increaseBet() {
    if (isGameOver) {
        return;
    }

    bet = Math.min(money, bet + 10);
    updateUI();
}

function betAll() {
    if (isGameOver) {
        return;
    }

    bet = money;
    updateUI();
}

function flipCoin() {
    if (isGameOver) {
        return;
    }

    const flippedBet = bet;
    const isHead = Phaser.Math.Between(0, 1) === 0;

    if (isHead) {
        money += flippedBet;
        coinText.setText("H");
        resultText.setText("HEAD! +$" + flippedBet);
        resultText.setColor("#00ff88");
    } else {
        money -= flippedBet;
        coinText.setText("T");
        resultText.setText("TAIL! -$" + flippedBet);
        resultText.setColor("#ff5555");
    }

    if (bet > money) {
        bet = money;
    }

    updateUI();

    if (money < MINIMUM_BET) {
        gameOver();
    }
}

function updateUI() {
    moneyText.setText("Money: $" + money);
    betText.setText("Bet: $" + bet);
}

function gameOver() {
    isGameOver = true;

    coin.disableInteractive();
    minusButton.disableInteractive();
    plusButton.disableInteractive();
    allButton.disableInteractive();

    minusButton.setAlpha(0.5);
    plusButton.setAlpha(0.5);
    allButton.setAlpha(0.5);

    gameOverText.setVisible(true);
    restartButton.setVisible(true).setInteractive({ useHandCursor: true });
}

function restartGame() {
    money = STARTING_MONEY;
    bet = MINIMUM_BET;
    isGameOver = false;

    coinText.setText("?");
    resultText.setText("Click the coin");
    resultText.setColor("#ffffff");

    coin.setInteractive({ useHandCursor: true });
    minusButton.setInteractive({ useHandCursor: true }).setAlpha(1);
    plusButton.setInteractive({ useHandCursor: true }).setAlpha(1);
    allButton.setInteractive({ useHandCursor: true }).setAlpha(1);

    gameOverText.setVisible(false);
    restartButton.setVisible(false).disableInteractive();

    updateUI();
}
