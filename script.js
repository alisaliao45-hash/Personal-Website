document.addEventListener('DOMContentLoaded', () => {
    const handGibbon = document.querySelector('.hand-gibbon');
    const hero = document.querySelector('.hero');
    const canvas = document.querySelector('.ink-canvas');
    if (!handGibbon || !hero || !canvas) return;

    const ctx = canvas.getContext('2d');

    // How far the canvas extends beyond hero's left/right edges (must match CSS)
    const CANVAS_MARGIN_X = 300;

    // --- Pen tip calibration ---
    // These are fractions of the image's own width/height (0 to 1),
    // pinpointing where the pen nib is *within* hand_gibbon.png.
    // Adjust these two numbers until the trail lines up with the nib.
    const PEN_TIP_X_FRACTION = 0.91; // e.g. near the right edge
    const PEN_TIP_Y_FRACTION = 0.41; // e.g. near the top edge

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let lastPenX = null;
    let lastPenY = null;

    function resizeCanvas() {
        // Preserve existing drawing across resize
        const prev = canvas.toDataURL();
        canvas.width = hero.clientWidth + CANVAS_MARGIN_X * 2;
        canvas.height = hero.clientHeight;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = prev;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Normalize initial position from % to px so drag math is consistent
    const heroRectInit = hero.getBoundingClientRect();
    const startRect = handGibbon.getBoundingClientRect();
    handGibbon.style.left = (startRect.left - heroRectInit.left) + 'px';
    handGibbon.style.top = (startRect.top - heroRectInit.top) + 'px';

    function getPenPosition() {
        const heroRect = hero.getBoundingClientRect();
        const imgRect = handGibbon.getBoundingClientRect();
        // Add CANVAS_MARGIN_X since the canvas origin is shifted left of hero's origin
        const penX = (imgRect.left - heroRect.left) + imgRect.width * PEN_TIP_X_FRACTION + CANVAS_MARGIN_X;
        const penY = (imgRect.top - heroRect.top) + imgRect.height * PEN_TIP_Y_FRACTION;
        return { penX, penY };
    }

    function drawInkSegment(x1, y1, x2, y2) {
        ctx.strokeStyle = 'rgba(94, 95, 124, 0.85)';
        ctx.lineWidth = 2 + Math.random() * 1; // slight thickness variation
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    const startDrag = (clientX, clientY) => {
        isDragging = true;
        const rect = handGibbon.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        handGibbon.style.cursor = 'grabbing';

        const { penX, penY } = getPenPosition();
        lastPenX = penX;
        lastPenY = penY;
    };

    const moveDrag = (clientX, clientY) => {
        if (!isDragging) return;
        const heroRect = hero.getBoundingClientRect();
        const newLeft = clientX - heroRect.left - offsetX; // unrestricted horizontally
        let newTop = clientY - heroRect.top - offsetY;

        // Clamp vertical movement so the hand stays within the hero section
        const maxTop = hero.clientHeight - handGibbon.offsetHeight;
        newTop = Math.max(0, Math.min(newTop, maxTop));

        handGibbon.style.left = newLeft + 'px';
        handGibbon.style.top = newTop + 'px';

        const { penX, penY } = getPenPosition();
        if (lastPenX !== null) {
            drawInkSegment(lastPenX, lastPenY, penX, penY);
        }
        lastPenX = penX;
        lastPenY = penY;
    };

    const endDrag = () => {
        isDragging = false;
        lastPenX = null;
        lastPenY = null;
        handGibbon.style.cursor = 'grab';
    };

    // Mouse events
    handGibbon.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    // Touch events (mobile)
    handGibbon.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    });
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY);
    });
    document.addEventListener('touchend', endDrag);

    // Double-click the hero section to clear the ink trail
    hero.addEventListener('dblclick', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
});
