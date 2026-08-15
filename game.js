const STARTING_MONEY = 50;
const BASE_MINIMUM_BET = 10;
const MAX_HEAD_CHANCE = 0.8;

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 800;

const COLORS = {
    background: 0x090d14,
    panel: 0x121925,
    panelLight: 0x182233,
    panelBorder: 0x2c3748,
    gold: 0xe4b84f,
    goldBright: 0xffd978,
    white: 0xf5f7fa,
    muted: 0x9ba7b8,
    blue: 0x58a6ff,
    green: 0x45d483,
    red: 0xff6673
};

const GAME_PHASE = {
    READY: "READY",
    FLIPPING: "FLIPPING",
    TALENT_SELECT: "TALENT_SELECT",
    SHOP: "SHOP",
    GAME_OVER: "GAME_OVER"
};

const COINS = {
    normal: {
        name: "NORMAL",
        minimumBetMultiplier: 1,
        maximumBetMultiplier: 1,
        headBonus: 0,
        xpMultiplier: 1
    },
    red: {
        name: "RED",
        minimumBetMultiplier: 1.5,
        maximumBetMultiplier: 1,
        headBonus: 0.05,
        xpMultiplier: 1
    },
    blue: {
        name: "BLUE",
        minimumBetMultiplier: 1,
        maximumBetMultiplier: 0.5,
        headBonus: 0,
        xpMultiplier: 1.5
    }
};

const TALENTS = {
    lucky: { name: "好運", description: "HEAD 機率 +5%", maxLevel: 3 },
    brave: { name: "勇者", description: "All In 的 HEAD 金幣 +10%", maxLevel: 3 },
    friends: { name: "呼朋引伴", description: "每次多丟 1 枚硬幣", maxLevel: 3 },
    scholar: { name: "學者", description: "HEAD 經驗值 +15%", maxLevel: 3 },
    wealthy: { name: "富者", description: "所有 HEAD 金幣 +5%", maxLevel: 3 },
    ironwall: { name: "鐵壁", description: "每次升級補充護盾", maxLevel: 3 }
};

const SHOP_ITEMS = {
    shieldOne: { name: "單次護盾", description: "抵銷 1 枚 TAIL", priceMultiplier: 0.75 },
    shieldThree: { name: "三次護盾", description: "抵銷 3 枚 TAIL", priceMultiplier: 1.5 },
    freeAllIn: { name: "免費 ALL IN", description: "下次最大下注失敗不扣錢", priceMultiplier: 2 },
    redCoin: { name: "紅硬幣", description: "最低下注 ×1.5，HEAD +5%", priceMultiplier: 4 },
    blueCoin: { name: "藍硬幣", description: "最大下注 50%，XP ×1.5", priceMultiplier: 4 }
};

const config = {
    type: Phaser.AUTO,
    backgroundColor: COLORS.background,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT
    },
    scene: {
        create: create
    }
};

new Phaser.Game(config);

let scene;
let state;
let ui;
let coinObjects = [];

function create() {
    scene = this;
    state = createInitialState();
    ui = createUI(this);

    this.scale.on("resize", layoutUI);
    layoutUI({ width: this.scale.width, height: this.scale.height });
    rebuildCoins();
    refreshShop();
    updateUI();
}

function createInitialState() {
    return {
        money: STARTING_MONEY,
        bet: BASE_MINIMUM_BET,
        level: 1,
        xp: 0,
        phase: GAME_PHASE.READY,
        pendingLevelUps: 0,
        talents: {
            lucky: 0,
            brave: 0,
            friends: 0,
            scholar: 0,
            wealthy: 0,
            ironwall: 0
        },
        shieldCharges: 0,
        freeAllInTokens: 0,
        freeAllInArmed: false,
        ownedCoins: ["normal"],
        activeCoin: "normal",
        shopItems: [],
        rerollCount: 0,
        lastResult: "Click the coin"
    };
}

function createUI(currentScene) {
    const createdUI = {};

    createdUI.background = currentScene.add.graphics();
    createdUI.panels = currentScene.add.graphics();
    createdUI.xpBar = currentScene.add.graphics();

    createdUI.title = makeText(currentScene, "COIN FLIP", 40, "#ffd978", "bold").setLetterSpacing(5);
    createdUI.moneyLabel = makeText(currentScene, "BANKROLL", 13, "#9ba7b8", "bold").setLetterSpacing(2);
    createdUI.money = makeText(currentScene, "", 32, "#ffd978", "bold");
    createdUI.levelLabel = makeText(currentScene, "LEVEL", 13, "#9ba7b8", "bold").setLetterSpacing(2);
    createdUI.level = makeText(currentScene, "", 25, "#58a6ff", "bold");
    createdUI.xp = makeText(currentScene, "", 15, "#c8d4e3", "bold");

    createdUI.result = makeText(currentScene, "CLICK THE COIN", 25, "#f5f7fa", "bold").setLetterSpacing(2);
    createdUI.resultMoney = makeText(currentScene, "", 25, "#f5f7fa", "bold");
    createdUI.resultXp = makeText(currentScene, "", 17, "#58a6ff", "bold");

    createdUI.betLabel = makeText(currentScene, "BET", 13, "#9ba7b8", "bold").setLetterSpacing(2);
    createdUI.bet = makeText(currentScene, "", 38, "#ffd978", "bold");
    createdUI.minimumBet = makeText(currentScene, "", 15, "#9ba7b8");
    createdUI.maximumBet = makeText(currentScene, "", 15, "#9ba7b8");
    createdUI.headLabel = makeText(currentScene, "HEAD CHANCE", 13, "#9ba7b8", "bold").setOrigin(0, 0.5);
    createdUI.headValue = makeText(currentScene, "", 20, "#45d483", "bold").setOrigin(1, 0.5);
    createdUI.shieldLabel = makeText(currentScene, "SHIELD", 13, "#9ba7b8", "bold").setOrigin(0, 0.5);
    createdUI.shieldValue = makeText(currentScene, "", 20, "#58a6ff", "bold").setOrigin(1, 0.5);

    createdUI.minusButton = createButton(currentScene, "−10", decreaseBet, "secondary", 130, 48);
    createdUI.plusButton = createButton(currentScene, "+10", increaseBet, "secondary", 130, 48);
    createdUI.allButton = createButton(currentScene, "ALL", betAll, "primary", 150, 48);
    createdUI.shopButton = createButton(currentScene, "SHOP\nBROWSE", openShop, "secondary", 230, 58);
    createdUI.coinButton = createButton(currentScene, "COIN\nNORMAL", cycleCoin, "secondary", 230, 58);
    createdUI.tokenButton = createButton(currentScene, "SKILL\nFREE ALL-IN · 0", toggleFreeAllIn, "secondary", 230, 58);

    createdUI.gameOverOverlay = currentScene.add.graphics().setDepth(100).setVisible(false);
    createdUI.gameOver = makeText(currentScene, "GAME OVER", 42, "#ff6673", "bold").setDepth(102).setVisible(false);
    createdUI.restartButton = createButton(currentScene, "RESTART", restartGame);
    createdUI.restartButton.setDepth(102).setVisible(false).disableInteractive();

    createdUI.overlay = currentScene.add.rectangle(0, 0, 10, 10, 0x05070b, 0.9)
        .setOrigin(0)
        .setDepth(100)
        .setVisible(false)
        .setInteractive();
    createdUI.modalPanel = currentScene.add.graphics().setDepth(101).setVisible(false);
    createdUI.modalTitle = makeText(currentScene, "", 34, "#ffd978", "bold").setDepth(102).setVisible(false);
    createdUI.modalSubtitle = makeText(currentScene, "", 18, "#c8d4e3").setDepth(102).setVisible(false);
    createdUI.modalButtons = [
        createButton(currentScene, "", function () { chooseModalOption(0); }, "card", 250, 86).setDepth(102).setVisible(false),
        createButton(currentScene, "", function () { chooseModalOption(1); }, "card", 250, 86).setDepth(102).setVisible(false),
        createButton(currentScene, "", function () { chooseModalOption(2); }, "card", 250, 86).setDepth(102).setVisible(false)
    ];
    createdUI.modalInfo = [
        makeText(currentScene, "", 16, "#c8d4e3").setDepth(102).setVisible(false),
        makeText(currentScene, "", 16, "#c8d4e3").setDepth(102).setVisible(false),
        makeText(currentScene, "", 16, "#c8d4e3").setDepth(102).setVisible(false)
    ];
    createdUI.rerollButton = createButton(currentScene, "REROLL", rerollShop).setDepth(101).setVisible(false);
    createdUI.closeShopButton = createButton(currentScene, "CLOSE", closeShop).setDepth(101).setVisible(false);
    createdUI.modalOptions = [];

    return createdUI;
}

function makeText(currentScene, value, size, color, style) {
    return currentScene.add.text(0, 0, value, {
        fontFamily: "Trebuchet MS, Arial, sans-serif",
        fontSize: size + "px",
        color: color,
        fontStyle: style || "normal",
        align: "center",
        wordWrap: { width: 320 }
    }).setOrigin(0.5);
}

function createButton(currentScene, label, callback, type, width, height) {
    const button = currentScene.add.container(0, 0);
    const shadow = currentScene.add.graphics();
    const background = currentScene.add.graphics();
    const text = makeText(currentScene, label, type === "card" ? 18 : 17, "#f5f7fa", "bold");
    button.add([shadow, background, text]);
    button.buttonType = type || "secondary";
    button.buttonWidth = width || 130;
    button.buttonHeight = height || 46;
    button.buttonShadow = shadow;
    button.buttonBackground = background;
    button.buttonLabel = text;
    button.setSize(button.buttonWidth, button.buttonHeight).setInteractive({ useHandCursor: true });
    drawButton(button, false);

    button.setText = function (newLabel) {
        text.setText(newLabel);
        return button;
    };
    button.setFixedSize = function (newWidth, newHeight) {
        button.buttonWidth = newWidth;
        button.buttonHeight = newHeight;
        button.setSize(newWidth, newHeight);
        drawButton(button, false);
        return button;
    };

    button.on("pointerdown", function () {
        currentScene.tweens.add({ targets: button, scaleX: 0.97, scaleY: 0.97, duration: 55 });
        callback();
    });
    button.on("pointerup", function () {
        currentScene.tweens.add({ targets: button, scaleX: 1.04, scaleY: 1.04, duration: 70 });
    });
    button.on("pointerover", function () {
        if (button.input && button.input.enabled) {
            drawButton(button, true);
            currentScene.tweens.add({ targets: button, scaleX: 1.04, scaleY: 1.04, duration: 90 });
        }
    });
    button.on("pointerout", function () {
        drawButton(button, false);
        currentScene.tweens.add({ targets: button, scaleX: 1, scaleY: 1, duration: 90 });
    });

    return button;
}

function drawButton(button, hover) {
    const primary = button.buttonType === "primary";
    const card = button.buttonType === "card";
    const width = button.buttonWidth;
    const height = button.buttonHeight;
    const fill = primary ? (hover ? 0xf0c85f : COLORS.gold) : (hover ? 0x243248 : COLORS.panelLight);
    const border = primary ? COLORS.goldBright : (card ? 0x46556c : COLORS.panelBorder);

    button.buttonShadow.clear();
    button.buttonShadow.fillStyle(0x000000, 0.35);
    button.buttonShadow.fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 10);
    button.buttonBackground.clear();
    button.buttonBackground.fillStyle(fill, 1);
    button.buttonBackground.lineStyle(1.5, border, hover ? 1 : 0.8);
    button.buttonBackground.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    button.buttonBackground.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    button.buttonLabel.setColor(primary ? "#17130a" : "#f5f7fa");
}

function layoutUI(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    const centerX = width / 2;
    const coinY = 310;

    drawStaticUI(width, height);

    ui.title.setPosition(centerX, 36);
    ui.moneyLabel.setPosition(355, 98);
    ui.money.setPosition(355, 127);
    ui.levelLabel.setPosition(610, 98);
    ui.level.setPosition(610, 127);
    ui.xp.setPosition(890, 103);

    ui.result.setPosition(centerX, 418);
    ui.resultMoney.setPosition(centerX, 447);
    ui.resultXp.setPosition(centerX, 472);

    ui.betLabel.setPosition(275, 511);
    ui.bet.setPosition(275, 548);
    ui.minimumBet.setPosition(230, 588);
    ui.maximumBet.setPosition(320, 588);
    ui.minusButton.setPosition(500, 551);
    ui.plusButton.setPosition(650, 551);
    ui.allButton.setPosition(815, 551);
    ui.headLabel.setPosition(952, 530);
    ui.headValue.setPosition(1080, 530);
    ui.shieldLabel.setPosition(952, 574);
    ui.shieldValue.setPosition(1080, 574);

    ui.shopButton.setPosition(370, 714);
    ui.coinButton.setPosition(640, 714);
    ui.tokenButton.setPosition(910, 714);

    ui.gameOver.setPosition(centerX, 355);
    ui.restartButton.setPosition(centerX, 435).setFixedSize(190, 52);

    ui.overlay.setDisplaySize(width, height);
    ui.modalTitle.setPosition(centerX, 185);
    ui.modalSubtitle.setPosition(centerX, 235);

    ui.modalButtons.forEach(function (button, index) {
        const x = centerX + (index - 1) * 285;
        const y = 400;
        button.setPosition(x, y).setFixedSize(250, 86);
        ui.modalInfo[index].setPosition(x, y + 72);
    });
    ui.rerollButton.setPosition(centerX - 100, 630).setFixedSize(170, 48);
    ui.closeShopButton.setPosition(centerX + 100, 630).setFixedSize(170, 48);

    positionCoins(centerX, coinY);
    drawXpBar();
}

function drawStaticUI(width, height) {
    ui.background.clear();
    ui.background.fillGradientStyle(0x0d1320, 0x0d1320, 0x070a10, 0x070a10, 1);
    ui.background.fillRect(0, 0, width, height);
    ui.background.lineStyle(1, 0x263248, 0.22);
    for (let x = 0; x <= width; x += 80) {
        ui.background.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 80) {
        ui.background.lineBetween(0, y, width, y);
    }

    ui.panels.clear();
    drawPanel(ui.panels, 190, 72, 900, 94, 16);
    drawPanel(ui.panels, 130, 488, 1020, 130, 16);
    drawPanel(ui.panels, 235, 674, 810, 82, 16);

    ui.modalPanel.clear();
    ui.modalPanel.fillStyle(COLORS.panel, 1);
    ui.modalPanel.lineStyle(2, COLORS.gold, 0.7);
    ui.modalPanel.fillRoundedRect(130, 120, 1020, 570, 22);
    ui.modalPanel.strokeRoundedRect(130, 120, 1020, 570, 22);

    ui.gameOverOverlay.clear();
    ui.gameOverOverlay.fillStyle(0x05070b, 0.9);
    ui.gameOverOverlay.fillRect(0, 0, width, height);
    ui.gameOverOverlay.fillStyle(0x000000, 0.42);
    ui.gameOverOverlay.fillRoundedRect(395, 238, 500, 300, 22);
    ui.gameOverOverlay.fillStyle(COLORS.panel, 1);
    ui.gameOverOverlay.lineStyle(2, COLORS.gold, 0.75);
    ui.gameOverOverlay.fillRoundedRect(390, 230, 500, 300, 22);
    ui.gameOverOverlay.strokeRoundedRect(390, 230, 500, 300, 22);
}

function drawPanel(graphics, x, y, width, height, radius) {
    graphics.fillStyle(0x000000, 0.28);
    graphics.fillRoundedRect(x + 5, y + 7, width, height, radius);
    graphics.fillStyle(COLORS.panel, 0.97);
    graphics.lineStyle(1.5, COLORS.panelBorder, 0.9);
    graphics.fillRoundedRect(x, y, width, height, radius);
    graphics.strokeRoundedRect(x, y, width, height, radius);
}

function drawXpBar() {
    if (!ui || !ui.xpBar || !state) {
        return;
    }
    const progress = Phaser.Math.Clamp(state.xp / getXpRequired(state.level), 0, 1);
    ui.xpBar.clear();
    ui.xpBar.fillStyle(0x070b12, 1);
    ui.xpBar.fillRoundedRect(735, 121, 310, 16, 8);
    if (progress > 0) {
        ui.xpBar.fillStyle(COLORS.blue, 1);
        ui.xpBar.fillRoundedRect(738, 124, 304 * progress, 10, 5);
    }
    ui.xpBar.lineStyle(1, 0x6bb5ff, 0.45);
    ui.xpBar.strokeRoundedRect(735, 121, 310, 16, 8);
}

function centerY(height) {
    return Math.max(250, height * 0.5);
}

function rebuildCoins() {
    coinObjects.forEach(function (coinObject) {
        coinObject.destroy(true);
    });
    coinObjects = [];

    const count = 1 + state.talents.friends;
    for (let index = 0; index < count; index += 1) {
        const container = scene.add.container(0, 0);
        const shadow = scene.add.ellipse(0, 74, 110, 24, 0x000000, 0.42);
        const outerGlow = scene.add.circle(0, 0, 70, getCoinColor(), 0.14).setStrokeStyle(2, getCoinColor(), 0.38);
        const outerCoin = scene.add.circle(0, 0, 62, getCoinColor(), 1).setStrokeStyle(5, 0x9b7222, 1);
        const innerCoin = scene.add.circle(0, 0, 50, getCoinColor(), 0.92).setStrokeStyle(2, 0xffe49a, 0.62);
        const label = makeText(scene, "?", 48, "#17130a", "bold");
        container.add([shadow, outerGlow, outerCoin, innerCoin, label]);
        container.setSize(150, 170).setInteractive({ useHandCursor: true });
        container.on("pointerover", function () {
            if (state.phase === GAME_PHASE.READY) {
                scene.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 110 });
                outerGlow.setAlpha(0.3);
            }
        });
        container.on("pointerout", function () {
            if (state.phase === GAME_PHASE.READY) {
                scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 110 });
                outerGlow.setAlpha(1);
            }
        });
        container.on("pointerdown", function () {
            if (state.phase === GAME_PHASE.READY) {
                container.setScale(0.97);
                scene.time.delayedCall(65, function () {
                    if (state.phase === GAME_PHASE.READY) {
                        container.setScale(1.05);
                    }
                });
            }
            flipCoin();
        });
        container.coinLabel = label;
        coinObjects.push(container);
    }

    layoutUI({ width: scene.scale.width, height: scene.scale.height });
}

function positionCoins(centerX, coinY) {
    const spacing = Math.min(145, scene.scale.width / Math.max(coinObjects.length + 1, 3));
    coinObjects.forEach(function (coinObject, index) {
        coinObject.setPosition(centerX + (index - (coinObjects.length - 1) / 2) * spacing, coinY);
    });
}

function getCoinColor() {
    if (state.activeCoin === "red") {
        return 0xe85b5b;
    }
    if (state.activeCoin === "blue") {
        return 0x5b9ee8;
    }
    return 0xffd700;
}

function decreaseBet() {
    if (state.phase !== GAME_PHASE.READY) {
        return;
    }
    state.bet = Math.max(getMinimumBet(), state.bet - 10);
    clampBet();
    updateUI();
}

function increaseBet() {
    if (state.phase !== GAME_PHASE.READY) {
        return;
    }
    state.bet = Math.min(getMaximumBet(), state.bet + 10);
    clampBet();
    updateUI();
}

function betAll() {
    if (state.phase !== GAME_PHASE.READY) {
        return;
    }
    state.bet = getMaximumBet();
    updateUI();
}

function toggleFreeAllIn() {
    if (state.phase !== GAME_PHASE.READY || state.freeAllInTokens <= 0) {
        return;
    }
    state.freeAllInArmed = !state.freeAllInArmed;
    if (state.freeAllInArmed) {
        state.bet = getMaximumBet();
    }
    updateUI();
}

function cycleCoin() {
    if (state.phase !== GAME_PHASE.READY) {
        return;
    }

    const currentIndex = state.ownedCoins.indexOf(state.activeCoin);
    for (let offset = 1; offset <= state.ownedCoins.length; offset += 1) {
        const candidate = state.ownedCoins[(currentIndex + offset) % state.ownedCoins.length];
        if (canUseCoin(candidate)) {
            state.activeCoin = candidate;
            state.freeAllInArmed = false;
            clampBet();
            rebuildCoins();
            updateUI();
            return;
        }
    }

    setResult("目前資金不足以使用其他硬幣", "#ffcc66");
}

function canUseCoin(coinId) {
    return getMinimumBet(coinId) <= getMaximumBet(coinId) || state.money < getMinimumBet(coinId);
}

function flipCoin() {
    if (state.phase !== GAME_PHASE.READY || state.money <= 0) {
        return;
    }

    state.phase = GAME_PHASE.FLIPPING;
    setMainControlsEnabled(false);
    unlockCoinAudio();

    const snapshot = {
        bet: state.bet,
        coinId: state.activeCoin,
        isAllIn: state.bet === getMaximumBet(),
        freeAllIn: state.freeAllInArmed,
        results: []
    };
    const headChance = getHeadChance(snapshot.coinId);
    coinObjects.forEach(function () {
        snapshot.results.push(Math.random() < headChance);
    });

    animateCoins(snapshot, function () {
        resolveFlip(snapshot);
    });
}

function animateCoins(snapshot, onComplete) {
    let completed = 0;
    const originalY = coinObjects.length > 0 ? coinObjects[0].y : scene.scale.height * 0.36;

    coinObjects.forEach(function (coinObject, index) {
        coinObject.coinLabel.setText("");

        scene.tweens.add({
            targets: coinObject,
            scaleY: 0.08,
            duration: 50,
            yoyo: true,
            repeat: 7 + index,
            ease: "Sine.easeInOut"
        });

        scene.tweens.chain({
            targets: coinObject,
            tweens: [
                { y: originalY - 145, duration: 320, ease: "Quad.easeOut" },
                { y: originalY, duration: 330, ease: "Quad.easeIn", onComplete: function () { playCoinImpact(0.16); } },
                { y: originalY - 58, duration: 130, ease: "Quad.easeOut" },
                { y: originalY, duration: 150, ease: "Quad.easeIn", onComplete: function () { playCoinImpact(0.1); } },
                { y: originalY - 24, duration: 85, ease: "Quad.easeOut" },
                { y: originalY, duration: 95, ease: "Quad.easeIn", onComplete: function () { playCoinImpact(0.06); } },
                { y: originalY - 8, duration: 55, ease: "Quad.easeOut" },
                {
                    y: originalY,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 65,
                    ease: "Quad.easeIn",
                    onComplete: function () {
                        coinObject.coinLabel.setText(snapshot.results[index] ? "H" : "T");
                        completed += 1;
                        if (completed === coinObjects.length) {
                            onComplete();
                        }
                    }
                }
            ]
        });
    });
}

function playCoinImpact(volume) {
    const context = unlockCoinAudio();
    if (!context) {
        return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(820, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(260, context.currentTime + 0.07);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
}

function unlockCoinAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!scene.coinAudioContext) {
        scene.coinAudioContext = new AudioContextClass();
    }

    const context = scene.coinAudioContext;
    if (context.state === "suspended") {
        context.resume();
    }
    return context;
}

function resolveFlip(snapshot) {
    const share = snapshot.bet / snapshot.results.length;
    let headShare = 0;
    let tailLoss = 0;
    let shieldsUsed = 0;

    snapshot.results.forEach(function (isHead) {
        if (isHead) {
            headShare += share;
        } else if (snapshot.freeAllIn) {
            // The free All In token absorbs every TAIL in this flip.
        } else if (state.shieldCharges > 0) {
            state.shieldCharges -= 1;
            shieldsUsed += 1;
        } else {
            tailLoss += share;
        }
    });

    let headWinnings = headShare * (1 + 0.05 * state.talents.wealthy);
    if (snapshot.isAllIn) {
        headWinnings *= 1 + 0.1 * state.talents.brave;
    }
    const moneyChange = headWinnings - tailLoss;

    const xpMultiplier = (snapshot.isAllIn ? 1.1 : 1)
        * COINS[snapshot.coinId].xpMultiplier
        * (1 + 0.15 * state.talents.scholar);
    const xpGained = Math.round(headShare * xpMultiplier);
    const roundedMoneyChange = Math.round(moneyChange);

    state.money = Math.max(0, state.money + roundedMoneyChange);
    state.xp += xpGained;
    if (snapshot.freeAllIn) {
        state.freeAllInTokens -= 1;
        state.freeAllInArmed = false;
    }

    const resultLetters = snapshot.results.map(function (isHead) { return isHead ? "H" : "T"; });
    let resultTitle = resultLetters.join(" · ");
    if (resultLetters.length === 1) {
        resultTitle = resultLetters[0] === "H" ? "HEAD" : "TAIL";
    }
    setResultSummary(resultTitle, roundedMoneyChange, xpGained, shieldsUsed);

    calculateLevelUps();
    clampBet();
    updateUI();

    if (state.pendingLevelUps > 0) {
        showNextTalentSelection();
    } else if (state.money <= 0) {
        gameOver();
    } else {
        state.phase = GAME_PHASE.READY;
        setMainControlsEnabled(true);
        updateUI();
    }
}

function calculateLevelUps() {
    while (state.xp >= getXpRequired(state.level)) {
        state.xp -= getXpRequired(state.level);
        state.level += 1;
        state.pendingLevelUps += 1;
    }
}

function showNextTalentSelection() {
    state.phase = GAME_PHASE.TALENT_SELECT;
    const eligible = getEligibleTalents();
    shuffle(eligible);
    ui.modalOptions = eligible.slice(0, 3);

    showModal("LEVEL " + state.level + " — 選擇天賦", "必須選擇一項才能繼續");

    if (ui.modalOptions.length === 0) {
        const bonus = getMinimumBet() * 5;
        state.money += bonus;
        if (state.talents.ironwall > 0) {
            state.shieldCharges = Math.min(9, state.shieldCharges + state.talents.ironwall);
        }
        state.pendingLevelUps -= 1;
        refreshShop();
        hideModal();
        setResult("所有天賦已滿級，獲得 $" + bonus, "#ffd700");
        continueAfterTalent();
        return;
    }

    ui.modalButtons.forEach(function (button, index) {
        const talentId = ui.modalOptions[index];
        if (!talentId) {
            button.setVisible(false).disableInteractive();
            ui.modalInfo[index].setVisible(false);
            return;
        }
        const nextLevel = state.talents[talentId] + 1;
        button.setText(TALENTS[talentId].name + " " + toRoman(nextLevel));
        button.setVisible(true).setInteractive({ useHandCursor: true });
        ui.modalInfo[index].setText(TALENTS[talentId].description).setVisible(true);
    });
}

function chooseModalOption(index) {
    if (state.phase === GAME_PHASE.TALENT_SELECT) {
        chooseTalent(index);
    } else if (state.phase === GAME_PHASE.SHOP) {
        buyShopItem(index);
    }
}

function chooseTalent(index) {
    const talentId = ui.modalOptions[index];
    if (!talentId) {
        return;
    }

    state.talents[talentId] += 1;
    if (state.talents.ironwall > 0) {
        state.shieldCharges = Math.min(9, state.shieldCharges + state.talents.ironwall);
    }
    state.pendingLevelUps -= 1;
    refreshShop();
    hideModal();

    if (talentId === "friends") {
        rebuildCoins();
    }
    clampBet();
    updateUI();
    continueAfterTalent();
}

function continueAfterTalent() {
    if (state.pendingLevelUps > 0) {
        scene.time.delayedCall(180, showNextTalentSelection);
    } else if (state.money <= 0) {
        gameOver();
    } else {
        state.phase = GAME_PHASE.READY;
        setMainControlsEnabled(true);
        updateUI();
    }
}

function getEligibleTalents() {
    return Object.keys(TALENTS).filter(function (talentId) {
        return state.talents[talentId] < TALENTS[talentId].maxLevel;
    });
}

function openShop() {
    if (state.phase !== GAME_PHASE.READY) {
        return;
    }
    state.phase = GAME_PHASE.SHOP;
    setMainControlsEnabled(false);
    showShop();
}

function showShop() {
    const rerollPrice = getRerollPrice();
    showModal("SHOP", "Money: $" + state.money + "   Reroll: $" + rerollPrice);
    ui.modalOptions = state.shopItems.slice();

    ui.modalButtons.forEach(function (button, index) {
        const item = state.shopItems[index];
        if (!item) {
            button.setText("SOLD").setVisible(true).disableInteractive().setAlpha(0.45);
            ui.modalInfo[index].setText("").setVisible(true);
            return;
        }
        button.setText(item.name + "\n$" + item.price)
            .setVisible(true)
            .setAlpha(1)
            .setInteractive({ useHandCursor: true });
        ui.modalInfo[index].setText(item.description).setVisible(true);
    });

    ui.rerollButton.setText("REROLL $" + rerollPrice)
        .setVisible(true)
        .setInteractive({ useHandCursor: true });
    ui.closeShopButton.setVisible(true).setInteractive({ useHandCursor: true });
}

function closeShop() {
    if (state.phase !== GAME_PHASE.SHOP) {
        return;
    }
    hideModal();
    if (state.money <= 0) {
        gameOver();
    } else {
        state.phase = GAME_PHASE.READY;
        setMainControlsEnabled(true);
        updateUI();
    }
}

function refreshShop() {
    state.rerollCount = 0;
    state.shopItems = generateShopItems(3);
}

function rerollShop() {
    if (state.phase !== GAME_PHASE.SHOP) {
        return;
    }
    const price = getRerollPrice();
    if (state.money < price) {
        ui.modalSubtitle.setText("金錢不足，Reroll 需要 $" + price);
        return;
    }

    const remainingCount = state.shopItems.filter(Boolean).length;
    state.money -= price;
    state.rerollCount += 1;
    const generated = generateShopItems(remainingCount);
    state.shopItems = generated.concat(new Array(3 - remainingCount).fill(null));
    clampBet();
    updateUI();
    showShop();
}

function generateShopItems(count) {
    const availableIds = Object.keys(SHOP_ITEMS).filter(function (itemId) {
        if (itemId === "redCoin") {
            return !state.ownedCoins.includes("red");
        }
        if (itemId === "blueCoin") {
            return !state.ownedCoins.includes("blue");
        }
        return true;
    });
    shuffle(availableIds);

    return availableIds.slice(0, count).map(function (itemId) {
        const definition = SHOP_ITEMS[itemId];
        return {
            id: itemId,
            name: definition.name,
            description: definition.description,
            price: ceilToFive(getShopPriceBase() * definition.priceMultiplier)
        };
    });
}

function buyShopItem(index) {
    const item = state.shopItems[index];
    if (!item || state.money < item.price) {
        ui.modalSubtitle.setText(item ? "金錢不足，需要 $" + item.price : "商品已售出");
        return;
    }

    state.money -= item.price;
    if (item.id === "shieldOne") {
        state.shieldCharges = Math.min(9, state.shieldCharges + 1);
    } else if (item.id === "shieldThree") {
        state.shieldCharges = Math.min(9, state.shieldCharges + 3);
    } else if (item.id === "freeAllIn") {
        state.freeAllInTokens += 1;
    } else if (item.id === "redCoin") {
        state.ownedCoins.push("red");
    } else if (item.id === "blueCoin") {
        state.ownedCoins.push("blue");
    }

    state.shopItems[index] = null;
    clampBet();
    updateUI();
    showShop();
}

function showModal(title, subtitle) {
    ui.overlay.setVisible(true);
    ui.modalPanel.setVisible(true);
    ui.modalTitle.setText(title).setVisible(true);
    ui.modalSubtitle.setText(subtitle).setVisible(true);
}

function hideModal() {
    ui.overlay.setVisible(false);
    ui.modalPanel.setVisible(false);
    ui.modalTitle.setVisible(false);
    ui.modalSubtitle.setVisible(false);
    ui.modalButtons.forEach(function (button) {
        button.setVisible(false).disableInteractive().setAlpha(1);
    });
    ui.modalInfo.forEach(function (info) { info.setVisible(false); });
    ui.rerollButton.setVisible(false).disableInteractive();
    ui.closeShopButton.setVisible(false).disableInteractive();
    ui.modalOptions = [];
}

function gameOver() {
    state.phase = GAME_PHASE.GAME_OVER;
    setMainControlsEnabled(false);
    ui.gameOverOverlay.setVisible(true);
    ui.gameOver.setVisible(true);
    ui.restartButton.setVisible(true).setInteractive({ useHandCursor: true });
}

function restartGame() {
    state = createInitialState();
    hideModal();
    ui.gameOverOverlay.setVisible(false);
    ui.gameOver.setVisible(false);
    ui.restartButton.setVisible(false).disableInteractive();
    rebuildCoins();
    refreshShop();
    setMainControlsEnabled(true);
    setResult("Click the coin", "#ffffff");
    updateUI();
}

function setMainControlsEnabled(enabled) {
    const buttons = [ui.minusButton, ui.plusButton, ui.allButton, ui.shopButton, ui.coinButton, ui.tokenButton];
    coinObjects.forEach(function (coinObject) {
        if (enabled) {
            coinObject.setInteractive({ useHandCursor: true }).setAlpha(1);
        } else {
            coinObject.disableInteractive().setAlpha(0.75);
        }
    });
    buttons.forEach(function (button) {
        if (enabled) {
            button.setInteractive({ useHandCursor: true }).setAlpha(1);
        } else {
            button.disableInteractive().setAlpha(0.55);
        }
    });
}

function updateUI() {
    const xpRequired = getXpRequired(state.level);
    ui.money.setText("$" + state.money);
    ui.level.setText(String(state.level));
    ui.xp.setText(state.xp + " / " + xpRequired + " XP");
    ui.bet.setText("$" + state.bet);
    ui.minimumBet.setText("MIN  $" + getMinimumBet());
    ui.maximumBet.setText("MAX  $" + getMaximumBet());
    ui.headValue.setText(Math.round(getHeadChance() * 100) + "%");
    ui.shieldValue.setText(String(state.shieldCharges));
    ui.coinButton.setText("COIN\n" + COINS[state.activeCoin].name);
    ui.allButton.setText(state.activeCoin === "blue" ? "MAX" : "ALL");
    ui.tokenButton.setText("SKILL\n" + (state.freeAllInArmed ? "ARMED · " : "FREE ALL-IN · ") + state.freeAllInTokens);
    ui.result.setText(state.lastResult);
    drawXpBar();

    if (state.phase === GAME_PHASE.READY) {
        setButtonAvailability(ui.minusButton, state.bet > getMinimumBet() && state.money >= getMinimumBet());
        setButtonAvailability(ui.plusButton, state.bet < getMaximumBet());
        setButtonAvailability(ui.allButton, state.bet < getMaximumBet());
        setButtonAvailability(ui.tokenButton, state.freeAllInTokens > 0);
    }
}

function setButtonAvailability(button, available) {
    if (available) {
        button.setInteractive({ useHandCursor: true }).setAlpha(1);
    } else {
        button.disableInteractive().setAlpha(0.38).setScale(1);
        drawButton(button, false);
    }
}

function setResult(message, color) {
    state.lastResult = message;
    if (ui && ui.result) {
        ui.result.setText(message).setColor(color);
        ui.resultMoney.setText("");
        ui.resultXp.setText("");
    }
}

function setResultSummary(title, moneyChange, xpGained, shieldsUsed) {
    const positive = moneyChange >= 0;
    state.lastResult = title;
    ui.result.setText(title).setColor(positive ? "#45d483" : "#ff6673");
    ui.resultMoney.setText(formatSignedMoney(moneyChange)).setColor(positive ? "#45d483" : "#ff6673");

    const details = [];
    if (xpGained > 0) {
        details.push("+" + xpGained + " XP");
    }
    if (shieldsUsed > 0) {
        details.push("SHIELD ×" + shieldsUsed);
    }
    ui.resultXp.setText(details.join("   "));
}

function clampBet() {
    const minimum = getMinimumBet();
    const maximum = getMaximumBet();
    if (state.money < minimum) {
        state.bet = maximum;
    } else {
        state.bet = Phaser.Math.Clamp(state.bet, minimum, maximum);
    }
    if (state.freeAllInArmed) {
        state.bet = maximum;
    }
}

function getXpRequired(level) {
    const previousLevels = level - 1;
    return 100 + 50 * previousLevels + 25 * previousLevels * previousLevels;
}

function getBaseMinimumBet() {
    return BASE_MINIMUM_BET + 5 * (state.level - 1);
}

function getMinimumBet(coinId) {
    const selectedCoin = COINS[coinId || state.activeCoin];
    return ceilToFive(getBaseMinimumBet() * selectedCoin.minimumBetMultiplier);
}

function getMaximumBet(coinId) {
    const selectedCoin = COINS[coinId || state.activeCoin];
    return Math.max(1, Math.floor(state.money * selectedCoin.maximumBetMultiplier));
}

function getHeadChance(coinId) {
    const selectedCoin = COINS[coinId || state.activeCoin];
    return Phaser.Math.Clamp(0.5 + 0.05 * state.talents.lucky + selectedCoin.headBonus, 0.05, MAX_HEAD_CHANCE);
}

function getShopPriceBase() {
    return 20 + 10 * (state.level - 1);
}

function getRerollPrice() {
    return ceilToFive(getShopPriceBase() * (0.5 + 0.25 * state.rerollCount));
}

function ceilToFive(value) {
    return Math.ceil(value / 5) * 5;
}

function formatSignedMoney(value) {
    if (value > 0) {
        return "+$" + value;
    }
    if (value < 0) {
        return "-$" + Math.abs(value);
    }
    return "$0";
}

function toRoman(level) {
    return ["", "I", "II", "III"][level] || String(level);
}

function shuffle(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const temporary = values[index];
        values[index] = values[randomIndex];
        values[randomIndex] = temporary;
    }
    return values;
}
