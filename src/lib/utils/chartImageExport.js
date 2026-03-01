const MIME_BY_FORMAT = Object.freeze({
    png: 'image/png',
    jpeg: 'image/jpeg'
});

export const EXTENSION_BY_FORMAT = Object.freeze({
    png: 'png',
    jpeg: 'jpg'
});

export const CHART_EXPORT_DEFAULT_SCALE = 2;

export const CHART_EXPORT_HIDE_SELECTORS = Object.freeze([
    '.chart-tooltip',
    '.trend-tooltip',
    '.trajectory-tooltip',
    '.chart-crosshair',
    '.chart-hover-dot'
]);

const DEFAULT_BASENAME = 'chart';
const JPEG_QUALITY = 0.92;

function normalizeFormat(format = 'png') {
    const normalized = String(format || '').toLowerCase();
    return normalized === 'jpg' || normalized === 'jpeg' ? 'jpeg' : 'png';
}

function sanitizeFilenameBase(value) {
    const raw = String(value || DEFAULT_BASENAME).trim().toLowerCase();
    const collapsed = raw.replace(/\s+/g, '-');
    const safe = collapsed.replace(/[^a-z0-9._-]/g, '');
    return safe || DEFAULT_BASENAME;
}

export function normalizeImageFilename({ filenameBase = DEFAULT_BASENAME, format = 'png' } = {}) {
    const normalizedFormat = normalizeFormat(format);
    return `${sanitizeFilenameBase(filenameBase)}.${EXTENSION_BY_FORMAT[normalizedFormat]}`;
}

function inlineComputedStyles(sourceNode, targetNode) {
    const computed = window.getComputedStyle(sourceNode);
    const styleText = Array.from(computed)
        .map((property) => `${property}:${computed.getPropertyValue(property)};`)
        .join('');

    if (styleText) {
        targetNode.setAttribute('style', styleText);
    }
}

function cloneSvgWithInlineStyles(svgEl, width, height) {
    const clone = svgEl.cloneNode(true);
    const sourceNodes = [svgEl, ...svgEl.querySelectorAll('*')];
    const targetNodes = [clone, ...clone.querySelectorAll('*')];

    for (let index = 0; index < sourceNodes.length; index += 1) {
        inlineComputedStyles(sourceNodes[index], targetNodes[index]);
    }

    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!clone.getAttribute('xmlns:xlink')) {
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    clone.setAttribute('width', `${width}`);
    clone.setAttribute('height', `${height}`);

    if (!clone.getAttribute('viewBox')) {
        clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    return clone;
}

function isTransparentColor(colorValue) {
    if (!colorValue) return true;

    const normalized = colorValue.replace(/\s+/g, '').toLowerCase();
    if (normalized === 'transparent') return true;

    const rgba = normalized.match(/^rgba\((\d+),(\d+),(\d+),([0-9.]+)\)$/);
    if (rgba) {
        return Number.parseFloat(rgba[4]) === 0;
    }

    const hsla = normalized.match(/^hsla\((\d+),(\d+)%?,(\d+)%?,([0-9.]+)\)$/);
    if (hsla) {
        return Number.parseFloat(hsla[4]) === 0;
    }

    return false;
}

function resolveBackgroundColor(element) {
    let cursor = element instanceof Element ? element : null;

    while (cursor) {
        const color = window.getComputedStyle(cursor).backgroundColor;
        if (!isTransparentColor(color)) {
            return color;
        }
        cursor = cursor.parentElement;
    }

    const bodyColor = window.getComputedStyle(document.body).backgroundColor;
    if (!isTransparentColor(bodyColor)) {
        return bodyColor;
    }

    const rootColor = window.getComputedStyle(document.documentElement).backgroundColor;
    if (!isTransparentColor(rootColor)) {
        return rootColor;
    }

    return '#ffffff';
}

function hideSelectorsForCapture(rootEl, selectors) {
    if (!(rootEl instanceof Element)) {
        return () => {};
    }

    const hidden = [];
    const seen = new Set();

    for (const selector of selectors) {
        const nodes = rootEl.querySelectorAll(selector);

        for (const node of nodes) {
            if (seen.has(node)) continue;
            seen.add(node);

            hidden.push({
                node,
                previousStyle: node.getAttribute('style')
            });

            node.style.setProperty('display', 'none', 'important');
        }
    }

    return () => {
        for (const item of hidden) {
            if (item.previousStyle === null) {
                item.node.removeAttribute('style');
                continue;
            }
            item.node.setAttribute('style', item.previousStyle);
        }
    };
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Chart export failed: unable to load image data.'));
        image.src = url;
    });
}

function blobFromCanvas(canvas, format) {
    const mimeType = MIME_BY_FORMAT[format];

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error('Chart export failed: unable to create image blob.'));
            },
            mimeType,
            format === 'jpeg' ? JPEG_QUALITY : undefined
        );
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function exportChartImage({
    svgEl,
    captureRootEl = null,
    format = 'png',
    filenameBase = DEFAULT_BASENAME,
    scale = CHART_EXPORT_DEFAULT_SCALE
} = {}) {
    if (!(svgEl instanceof SVGSVGElement)) {
        throw new Error('Chart export failed: missing chart SVG element.');
    }

    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        throw new Error('Chart export failed: chart has no measurable size.');
    }

    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    const normalizedFormat = normalizeFormat(format);
    const resolvedScale = Number.isFinite(scale) && scale > 0 ? scale : CHART_EXPORT_DEFAULT_SCALE;
    const captureScope = captureRootEl || svgEl.parentElement || svgEl;
    const restoreHiddenNodes = hideSelectorsForCapture(captureScope, CHART_EXPORT_HIDE_SELECTORS);

    let svgUrl = null;

    try {
        const clonedSvg = cloneSvgWithInlineStyles(svgEl, width, height);
        const serialized = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        svgUrl = URL.createObjectURL(svgBlob);

        const image = await loadImage(svgUrl);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * resolvedScale));
        canvas.height = Math.max(1, Math.round(height * resolvedScale));

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Chart export failed: unable to initialize canvas context.');
        }

        context.fillStyle = resolveBackgroundColor(captureScope);
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await blobFromCanvas(canvas, normalizedFormat);
        const filename = normalizeImageFilename({
            filenameBase,
            format: normalizedFormat
        });

        downloadBlob(blob, filename);
    } finally {
        restoreHiddenNodes();

        if (svgUrl) {
            URL.revokeObjectURL(svgUrl);
        }
    }
}
