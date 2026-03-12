export default class ModelLayout {
    static adjustLayout(avatar) {
        if (!avatar) return false;

        const originW = avatar.width / avatar.scale.x;
        const originH = avatar.height / avatar.scale.y;

        if (originW === 0 || originH === 0) {
            console.log("[Model] Layout pending: Dimensions are zero.");
            return false;
        }

        const baseScale = Math.min((window.innerWidth / originW) * 0.4, (window.innerHeight / originH) * 0.8);
        const finalScale = baseScale * window.userZoom;
        avatar.scale.set(finalScale);
        avatar.anchor.set(0.5, 0.5);

        const posX = (window.innerWidth / 2) + window.offsetX;
        const posY = (window.innerHeight / 2) + window.offsetY;
        avatar.position.set(posX, posY);

        return true;
    }
}
