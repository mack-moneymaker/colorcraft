// ============ COLOR UTILITIES ============
const hslToRgb = (h, s, l) => {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

const hexToRgb = hex => {
    const m = hex.replace('#', '').match(/.{2}/g);
    return m.map(v => parseInt(v, 16));
};

const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const luminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const contrastRatio = (rgb1, rgb2) => {
    const l1 = luminance(...rgb1) + 0.05;
    const l2 = luminance(...rgb2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
};

const textColor = hex => {
    const [r, g, b] = hexToRgb(hex);
    return luminance(r, g, b) > 0.179 ? '#000' : '#fff';
};

// ============ PALETTE GENERATION ============
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateHarmony(mode) {
    const baseH = rand(0, 360);
    const baseS = rand(55, 90);
    const baseLs = [rand(25, 40), rand(40, 55), rand(50, 65), rand(60, 75), rand(75, 88)];
    baseLs.sort(() => Math.random() - 0.5);

    let hues;
    switch (mode) {
        case 'complementary':
            hues = [baseH, baseH, (baseH + 180) % 360, (baseH + 180) % 360, (baseH + rand(-15, 15) + 360) % 360];
            break;
        case 'analogous':
            hues = [-30, -15, 0, 15, 30].map(d => (baseH + d + 360) % 360);
            break;
        case 'triadic':
            hues = [baseH, baseH, (baseH + 120) % 360, (baseH + 120) % 360, (baseH + 240) % 360];
            break;
        case 'split-complementary':
            hues = [baseH, baseH, (baseH + 150) % 360, (baseH + 210) % 360, (baseH + 180) % 360];
            break;
        case 'monochromatic':
            hues = [baseH, baseH, baseH, baseH, baseH];
            break;
        default: // random
            hues = Array.from({ length: 5 }, () => rand(0, 360));
    }

    return hues.map((h, i) => {
        const s = mode === 'monochromatic' ? rand(30, 95) : baseS + rand(-15, 15);
        const rgb = hslToRgb(h, Math.min(100, Math.max(20, s)), baseLs[i]);
        return rgbToHex(...rgb);
    });
}

// ============ STATE ============
let palette = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
let locked = [false, false, false, false, false];

// ============ DOM ============
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const container = $('#palette-container');

function renderPalette() {
    container.innerHTML = '';
    palette.forEach((hex, i) => {
        const bar = document.createElement('div');
        bar.className = 'color-bar' + (locked[i] ? ' locked' : '');
        bar.style.background = hex;
        bar.innerHTML = `
            <div class="color-info">
                <span class="color-hex">${hex.toUpperCase()}</span>
                <div class="color-actions">
                    <button class="btn-lock ${locked[i] ? 'lock-active' : ''}" data-i="${i}" title="${locked[i] ? 'Unlock' : 'Lock'}">${locked[i] ? '🔒' : '🔓'}</button>
                    <button class="btn-save-single" data-i="${i}" title="Save palette">❤️</button>
                </div>
                <div class="color-formats">
                    <button data-copy="hex" data-i="${i}">HEX</button>
                    <button data-copy="rgb" data-i="${i}">RGB</button>
                    <button data-copy="hsl" data-i="${i}">HSL</button>
                </div>
            </div>`;
        container.appendChild(bar);
    });
}

function generate() {
    const mode = $('#harmony-mode').value;
    const newColors = generateHarmony(mode);
    palette = palette.map((c, i) => locked[i] ? c : newColors[i]);
    renderPalette();
}

// ============ TOAST ============
let toastTimer;
function toast(msg) {
    let el = $('.toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ============ COPY ============
function copyColor(index, format) {
    const hex = palette[index];
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    let text;
    switch (format) {
        case 'rgb': text = `rgb(${r}, ${g}, ${b})`; break;
        case 'hsl': text = `hsl(${h}, ${s}%, ${l}%)`; break;
        default: text = hex.toUpperCase();
    }
    navigator.clipboard.writeText(text).then(() => toast(`Copied ${text}`));
}

// ============ MODALS ============
function openModal(id) {
    $('#modal-backdrop').classList.add('active');
    $(`#${id}`).classList.add('active');
}
function closeModals() {
    $('#modal-backdrop').classList.remove('active');
    $$('.modal').forEach(m => m.classList.remove('active'));
}

$('#modal-backdrop').addEventListener('click', closeModals);
document.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) closeModals();
});

// ============ EXPORT ============
let exportFormat = 'css';

function getExportCode(fmt) {
    const names = ['primary', 'secondary', 'accent', 'highlight', 'muted'];
    switch (fmt) {
        case 'css':
            return `:root {\n${palette.map((c, i) => `  --color-${names[i]}: ${c};`).join('\n')}\n}`;
        case 'tailwind':
            return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${palette.map((c, i) => `        '${names[i]}': '${c}',`).join('\n')}\n      }\n    }\n  }\n}`;
        case 'scss':
            return palette.map((c, i) => `$color-${names[i]}: ${c};`).join('\n');
        case 'png':
            return null;
    }
}

function renderExport() {
    const code = getExportCode(exportFormat);
    const codeEl = $('#export-code');
    const canvasEl = $('#export-canvas');
    const copyBtn = $('#btn-copy-export');

    if (exportFormat === 'png') {
        codeEl.style.display = 'none';
        canvasEl.style.display = 'block';
        const w = 500, h = 100;
        canvasEl.width = w; canvasEl.height = h;
        canvasEl.style.width = '100%'; canvasEl.style.borderRadius = '8px';
        const ctx = canvasEl.getContext('2d');
        palette.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(i * (w / 5), 0, w / 5, h);
        });
        copyBtn.textContent = '⬇ Download PNG';
        copyBtn.onclick = () => {
            const a = document.createElement('a');
            a.download = 'colorcraft-palette.png';
            a.href = canvasEl.toDataURL();
            a.click();
            toast('PNG downloaded!');
        };
    } else {
        codeEl.style.display = 'block';
        canvasEl.style.display = 'none';
        codeEl.textContent = code;
        copyBtn.textContent = '📋 Copy to Clipboard';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(code).then(() => toast('Copied!'));
        };
    }
}

$('#btn-export').addEventListener('click', () => {
    openModal('modal-export');
    renderExport();
});

document.addEventListener('click', e => {
    if (e.target.matches('.export-tab')) {
        $$('.export-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        exportFormat = e.target.dataset.format;
        renderExport();
    }
});

// ============ ACCESSIBILITY ============
$('#btn-accessibility').addEventListener('click', () => {
    const grid = $('#a11y-grid');
    grid.innerHTML = '';
    for (let i = 0; i < palette.length; i++) {
        for (let j = i + 1; j < palette.length; j++) {
            const rgb1 = hexToRgb(palette[i]);
            const rgb2 = hexToRgb(palette[j]);
            const ratio = contrastRatio(rgb1, rgb2);
            const aa = ratio >= 4.5;
            const aaa = ratio >= 7;
            const aaLarge = ratio >= 3;
            const card = document.createElement('div');
            card.className = 'a11y-card';
            card.innerHTML = `
                <div class="a11y-colors">
                    <div class="a11y-swatch" style="background:${palette[i]}"></div>
                    <div class="a11y-swatch" style="background:${palette[j]}"></div>
                </div>
                <div class="a11y-ratio">${ratio.toFixed(2)}:1</div>
                <div class="a11y-badges">
                    <span class="a11y-badge ${aaLarge ? 'a11y-pass' : 'a11y-fail'}">AA Large</span>
                    <span class="a11y-badge ${aa ? 'a11y-pass' : 'a11y-fail'}">AA</span>
                    <span class="a11y-badge ${aaa ? 'a11y-pass' : 'a11y-fail'}">AAA</span>
                </div>`;
            grid.appendChild(card);
        }
    }
    openModal('modal-a11y');
});

// ============ SAVED PALETTES ============
function getSaved() {
    try { return JSON.parse(localStorage.getItem('colorcraft-palettes') || '[]'); } catch { return []; }
}
function setSaved(arr) { localStorage.setItem('colorcraft-palettes', JSON.stringify(arr)); }

function saveCurrent() {
    const saved = getSaved();
    saved.unshift({ colors: [...palette], date: Date.now() });
    if (saved.length > 50) saved.length = 50;
    setSaved(saved);
    toast('Palette saved!');
}

function renderSaved() {
    const saved = getSaved();
    const list = $('#saved-list');
    const empty = $('#saved-empty');
    list.innerHTML = '';
    empty.style.display = saved.length ? 'none' : 'block';
    saved.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'saved-item';
        item.innerHTML = `
            <div class="saved-swatches">${p.colors.map(c => `<div class="saved-swatch" style="background:${c}"></div>`).join('')}</div>
            <span class="saved-name">${new Date(p.date).toLocaleDateString()}</span>
            <button class="saved-delete" data-del="${idx}" title="Delete">&times;</button>`;
        item.addEventListener('click', e => {
            if (e.target.matches('.saved-delete')) return;
            palette = [...p.colors];
            locked = [false, false, false, false, false];
            renderPalette();
            closeModals();
            toast('Palette loaded!');
        });
        list.appendChild(item);
    });
}

$('#btn-saved').addEventListener('click', () => { renderSaved(); openModal('modal-saved'); });

document.addEventListener('click', e => {
    if (e.target.matches('.saved-delete')) {
        const saved = getSaved();
        saved.splice(parseInt(e.target.dataset.del), 1);
        setSaved(saved);
        renderSaved();
    }
});

// ============ IMAGE EXTRACTION ============
$('#btn-extract').addEventListener('click', () => $('#image-input').click());

$('#image-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Simple k-means-ish: collect pixels, cluster into 5
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
            pixels.push([data[i], data[i + 1], data[i + 2]]);
        }

        // K-means with 5 clusters
        let centers = Array.from({ length: 5 }, () => pixels[rand(0, pixels.length - 1)]);
        for (let iter = 0; iter < 10; iter++) {
            const clusters = centers.map(() => []);
            pixels.forEach(p => {
                let minD = Infinity, minI = 0;
                centers.forEach((c, ci) => {
                    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
                    if (d < minD) { minD = d; minI = ci; }
                });
                clusters[minI].push(p);
            });
            centers = clusters.map((cl, ci) => {
                if (!cl.length) return centers[ci];
                const avg = [0, 1, 2].map(ch => Math.round(cl.reduce((s, p) => s + p[ch], 0) / cl.length));
                return avg;
            });
        }

        palette = centers.map(c => rgbToHex(...c));
        locked = [false, false, false, false, false];
        renderPalette();
        toast('Palette extracted from image!');
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
});

// ============ THEME ============
function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('colorcraft-theme', t);
    $('#btn-theme').textContent = t === 'dark' ? '🌙' : '☀️';
}

$('#btn-theme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
});

// Init theme
setTheme(localStorage.getItem('colorcraft-theme') || 'dark');

// ============ EVENT DELEGATION ============
container.addEventListener('click', e => {
    const lockBtn = e.target.closest('.btn-lock');
    if (lockBtn) {
        const i = parseInt(lockBtn.dataset.i);
        locked[i] = !locked[i];
        renderPalette();
        return;
    }
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
        copyColor(parseInt(copyBtn.dataset.i), copyBtn.dataset.copy);
        return;
    }
    const saveBtn = e.target.closest('.btn-save-single');
    if (saveBtn) {
        saveCurrent();
        return;
    }
});

// ============ KEYBOARD ============
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        generate();
    }
});

// ============ INIT ============
generate();
