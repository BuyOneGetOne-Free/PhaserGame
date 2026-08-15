const STARTING_MONEY = 50;
const BASE_MINIMUM_BET = 10;
const MAX_HEAD_CHANCE = 0.8;

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
    backgroundColor: "#202020",
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: "100%",
        height: "100%"
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

    createdUI.title = makeText(currentScene, "COIN FLIP", 44, "#ffffff", "bold");
    createdUI.money = makeText(currentScene, "", 28, "#ffd700");
    createdUI.level = makeText(currentScene, "", 22, "#9ad5ff");
    createdUI.xp = makeText(currentScene, "", 20, "#ffffff");
    createdUI.result = makeText(currentScene, "", 28, "#ffffff", "bold");
    createdUI.bet = makeText(currentScene, "", 24, "#ffffff");
    createdUI.status = makeText(currentScene, "", 17, "#dddddd");

    createdUI.minusButton = createButton(currentScene, "-10", decreaseBet);
    createdUI.plusButton = createButton(currentScene, "+10", increaseBet);
    createdUI.allButton = createButton(currentScene, "ALL", betAll);
    createdUI.shopButton = createButton(currentScene, "SHOP", openShop);
    createdUI.coinButton = createButton(currentScene, "COIN: NORMAL", cycleCoin);
    createdUI.tokenButton = createButton(currentScene, "FREE ALL-IN: 0", toggleFreeAllIn);

    createdUI.gameOver = makeText(currentScene, "GAME OVER", 42, "#ff5555", "bold").setVisible(false);
    createdUI.restartButton = createButton(currentScene, "RESTART", restartGame);
    createdUI.restartButton.setVisible(false).disableInteractive();

    createdUI.overlay = currentScene.add.rectangle(0, 0, 10, 10, 0x000000, 0.82)
        .setOrigin(0)
        .setDepth(100)
        .setVisible(false)
        .setInteractive();
    createdUI.modalTitle = makeText(currentScene, "", 34, "#ffd700", "bold").setDepth(101).setVisible(false);
    createdUI.modalSubtitle = makeText(currentScene, "", 18, "#ffffff").setDepth(101).setVisible(false);
    createdUI.modalButtons = [
        createButton(currentScene, "", function () { chooseModalOption(0); }).setDepth(101).setVisible(false),
        createButton(currentScene, "", function () { chooseModalOption(1); }).setDepth(101).setVisible(false),
        createButton(currentScene, "", function () { chooseModalOption(2); }).setDepth(101).setVisible(false)
    ];
    createdUI.modalInfo = [
        makeText(currentScene, "", 16, "#dddddd").setDepth(101).setVisible(false),
        makeText(currentScene, "", 16, "#dddddd").setDepth(101).setVisible(false),
        makeText(currentScene, "", 16, "#dddddd").setDepth(101).setVisible(false)
    ];
    createdUI.rerollButton = createButton(currentScene, "REROLL", rerollShop).setDepth(101).setVisible(false);
    createdUI.closeShopButton = createButton(currentScene, "CLOSE", closeShop).setDepth(101).setVisible(false);
    createdUI.modalOptions = [];

    return createdUI;
}

function makeText(currentScene, value, size, color, style) {
    return currentScene.add.text(0, 0, value, {
        fontFamily: "Arial, sans-serif",
        fontSize: size + "px",
        color: color,
        fontStyle: style || "normal",
        align: "center",
        wordWrap: { width: 320 }
    }).setOrigin(0.5);
}

function createButton(currentScene, label, callback) {
    const button = currentScene.add.text(0, 0, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#444444",
        align: "center",
        padding: { x: 16, y: 10 },
        fixedWidth: 130
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on("pointerdown", callback);
    button.on("pointerover", function () {
        if (button.input && button.input.enabled) {
            button.setStyle({ backgroundColor: "#666666" });
        }
    });
    button.on("pointerout", function () {
        button.setStyle({ backgroundColor: "#444444" });
    });

    return button;
}

function layoutUI(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    const centerX = width / 2;
    const compact = height < 720 || width < 600;
    const top = compact ? 30 : 42;
    const coinY = compact ? height * 0.36 : height * 0.38;
    const controlsY = compact ? height - 125 : height - 155;

    ui.title.setPosition(centerX, top);
    ui.money.setPosition(centerX, top + 48);
    ui.level.setPosition(centerX, top + 82);
    ui.xp.setPosition(centerX, top + 110);
    ui.result.setPosition(centerX, coinY + 100);
    ui.bet.setPosition(centerX, controlsY - 55);
    ui.status.setPosition(centerX, controlsY - 25);

    const buttonGap = Math.min(150, width * 0.29);
    ui.minusButton.setPosition(centerX - buttonGap, controlsY + 22);
    ui.plusButton.setPosition(centerX, controlsY + 22);
    ui.allButton.setPosition(centerX + buttonGap, controlsY + 22);
    ui.shopButton.setPosition(centerX - buttonGap, controlsY + 78);
    ui.coinButton.setPosition(centerX, controlsY + 78);
    ui.tokenButton.setPosition(centerX + buttonGap, controlsY + 78);

    ui.gameOver.setPosition(centerX, centerY(height));
    ui.restartButton.setPosition(centerX, centerY(height) + 60);

    ui.overlay.setSize(width, height);
    ui.modalTitle.setPosition(centerX, height * 0.18);
    ui.modalSubtitle.setPosition(centerX, height * 0.25);

    const modalHorizontal = width >= 760;
    ui.modalButtons.forEach(function (button, index) {
        const x = modalHorizontal ? centerX + (index - 1) * Math.min(240, width * 0.28) : centerX;
        const y = modalHorizontal ? height * 0.48 : height * (0.38 + index * 0.16);
        button.setPosition(x, y).setFixedSize(modalHorizontal ? 205 : Math.min(320, width - 40), 62);
        ui.modalInfo[index].setPosition(x, y + 55);
    });
    ui.rerollButton.setPosition(centerX - 90, height * 0.82);
    ui.closeShopButton.setPosition(centerX + 90, height * 0.82);

    positionCoins(centerX, coinY);
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
        const circle = scene.add.circle(0, 0, 55, getCoinColor(), 1).setStrokeStyle(5, 0xd19a00);
        const label = makeText(scene, "?", 46, "#202020", "bold");
        container.add([circle, label]);
        container.setSize(120, 120).setInteractive({ useHandCursor: true });
        container.on("pointerdown", flipCoin);
        container.coinLabel = label;
        coinObjects.push(container);
    }

    layoutUI({ width: scene.scale.width, height: scene.scale.height });
}

function positionCoins(centerX, coinY) {
    const spacing = Math.min(120, scene.scale.width / Math.max(coinObjects.length + 1, 3));
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

    const resultLetters = snapshot.results.map(function (isHead) { return isHead ? "H" : "T"; }).join(" ");
    let message = resultLetters + "  " + formatSignedMoney(roundedMoneyChange);
    if (xpGained > 0) {
        message += "  +" + xpGained + " XP";
    }
    if (shieldsUsed > 0) {
        message += "  Shield ×" + shieldsUsed;
    }
    setResult(message, roundedMoneyChange >= 0 ? "#00ff88" : "#ff5555");

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
    ui.modalTitle.setText(title).setVisible(true);
    ui.modalSubtitle.setText(subtitle).setVisible(true);
}

function hideModal() {
    ui.overlay.setVisible(false);
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
    ui.gameOver.setVisible(true);
    ui.restartButton.setVisible(true).setInteractive({ useHandCursor: true });
}

function restartGame() {
    state = createInitialState();
    hideModal();
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
    ui.money.setText("Money: $" + state.money);
    ui.level.setText("Level " + state.level);
    ui.xp.setText("XP: " + state.xp + " / " + xpRequired);
    ui.bet.setText("Bet: $" + state.bet + "   Min: $" + getMinimumBet() + "   Max: $" + getMaximumBet());
    ui.status.setText("HEAD " + Math.round(getHeadChance() * 100) + "%   Shield: " + state.shieldCharges);
    ui.coinButton.setText("COIN: " + COINS[state.activeCoin].name);
    ui.allButton.setText(state.activeCoin === "blue" ? "MAX" : "ALL");
    ui.tokenButton.setText((state.freeAllInArmed ? "ARMED: " : "FREE ALL-IN: ") + state.freeAllInTokens);
    ui.result.setText(state.lastResult);
}

function setResult(message, color) {
    state.lastResult = message;
    if (ui && ui.result) {
        ui.result.setText(message).setColor(color);
    }
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
