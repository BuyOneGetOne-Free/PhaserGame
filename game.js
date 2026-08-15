const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#87CEEB",

    scene: {
        create: create
    }
};

const game = new Phaser.Game(config);

function create() {
    this.add.text(300, 280, "Hello Phaser!", {
        fontSize: "32px",
        color: "#000000"
    });
}