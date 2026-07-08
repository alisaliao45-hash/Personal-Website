document.addEventListener('DOMContentLoaded', () => {
    const handGibbon = document.querySelector('.hand-gibbon');
    const hero = document.querySelector('.hero');
    const dragLayer = document.querySelector('.ink-drag-layer');
    const canvas = document.querySelector('.ink-canvas');
    const gibbonImg = document.querySelector('.gibbon');
    if (!handGibbon || !hero || !dragLayer || !canvas || !gibbonImg) return;

    const ctx = canvas.getContext('2d');

    // How far .ink-drag-layer extends above the hero's own top edge (must
    // match the CSS `top: -600px`). Gives room to drag the hand above the
    // hero - including over the navbar - before it hits the layer's own
    // clipping edge. The layer's bottom always lines up with the hero's
    // bottom, so that edge stays a hard cutoff.
    const LAYER_TOP_OFFSET = 600;

    // Where the hand starts by default, as a fraction of the hero's own
    // box (this used to live in CSS as `top: 28%; left: 18%;` on the hand
    // itself, back when it was positioned directly within the hero).
    const INITIAL_LEFT_FRACTION = 0.18;
    const INITIAL_TOP_FRACTION = 0.28;

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

    // Hand position, stored as a fraction of the gibbon image's own box,
    // so the hand stays anchored to the same spot on the gibbon regardless
    // of how the hero/gibbon get resized when the viewport changes.
    let handFracX = null;
    let handFracY = null;

    function captureHandFraction() {
        const gibbonRect = gibbonImg.getBoundingClientRect();
        const handRect = handGibbon.getBoundingClientRect();
        if (!gibbonRect.width || !gibbonRect.height) return;
        handFracX = (handRect.left - gibbonRect.left) / gibbonRect.width;
        handFracY = (handRect.top - gibbonRect.top) / gibbonRect.height;
    }

    function applyHandFraction() {
        if (handFracX === null || handFracY === null) return;
        const layerRect = dragLayer.getBoundingClientRect();
        const gibbonRect = gibbonImg.getBoundingClientRect();
        const newLeft = (gibbonRect.left - layerRect.left) + handFracX * gibbonRect.width;
        const newTop = (gibbonRect.top - layerRect.top) + handFracY * gibbonRect.height;
        handGibbon.style.left = newLeft + 'px';
        handGibbon.style.top = newTop + 'px';
    }

    // Keeps .ink-drag-layer's bottom edge pinned exactly to the hero's
    // bottom edge, however tall the hero happens to render.
    function sizeDragLayer() {
        const heroRect = hero.getBoundingClientRect();
        dragLayer.style.height = (heroRect.height + LAYER_TOP_OFFSET) + 'px';
    }

    function resizeCanvas() {
        // Preserve existing drawing across resize
        const prev = canvas.toDataURL();
        canvas.width = dragLayer.clientWidth;
        canvas.height = dragLayer.clientHeight;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = prev;
    }

    function handleResize() {
        sizeDragLayer();
        resizeCanvas();
        applyHandFraction();
    }

    sizeDragLayer();
    resizeCanvas();
    window.addEventListener('resize', handleResize);

    // Place the hand at its default spot (relative to the hero), then
    // remember where that puts it relative to the gibbon.
    function initHandPosition() {
        const heroRect = hero.getBoundingClientRect();
        const layerRect = dragLayer.getBoundingClientRect();
        const desiredLeft = heroRect.left + heroRect.width * INITIAL_LEFT_FRACTION;
        const desiredTop = heroRect.top + heroRect.height * INITIAL_TOP_FRACTION;
        handGibbon.style.left = (desiredLeft - layerRect.left) + 'px';
        handGibbon.style.top = (desiredTop - layerRect.top) + 'px';
        captureHandFraction();
    }

    if (gibbonImg.complete) {
        initHandPosition();
    } else {
        gibbonImg.addEventListener('load', initHandPosition);
    }

    function getPenPosition() {
        const layerRect = dragLayer.getBoundingClientRect();
        const imgRect = handGibbon.getBoundingClientRect();
        const penX = (imgRect.left - layerRect.left) + imgRect.width * PEN_TIP_X_FRACTION;
        const penY = (imgRect.top - layerRect.top) + imgRect.height * PEN_TIP_Y_FRACTION;
        return { penX, penY };
    }

    function drawInkSegment(x1, y1, x2, y2) {
        ctx.strokeStyle = 'rgba(177, 181, 223, 0.85)';
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
        const layerRect = dragLayer.getBoundingClientRect();
        // Fully unrestricted in every direction: .ink-drag-layer's own
        // `overflow: hidden` crops the hand (and its ink) once it's dragged
        // past the layer's edges, so it never visibly draws over content
        // outside that layer (e.g. the featured-work section below).
        const newLeft = clientX - layerRect.left - offsetX;
        const newTop = clientY - layerRect.top - offsetY;

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
        captureHandFraction();
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
