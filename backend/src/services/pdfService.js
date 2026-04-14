const fs = require('fs');
const path = require('path');
const arabicReshaper = require('arabic-reshaper');
const bidiFactory = require('bidi-js/dist/bidi');
const fontkit = require('@pdf-lib/fontkit');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const bidi = bidiFactory();

function hexToRgb(hex) {
	const safeHex = (hex || '#000000').replace('#', '');
	const normalized = safeHex.length === 3
		? safeHex.split('').map((c) => `${c}${c}`).join('')
		: safeHex;

	const intVal = Number.parseInt(normalized, 16);
	const r = ((intVal >> 16) & 255) / 255;
	const g = ((intVal >> 8) & 255) / 255;
	const b = (intVal & 255) / 255;

	return rgb(Number.isFinite(r) ? r : 0, Number.isFinite(g) ? g : 0, Number.isFinite(b) ? b : 0);
}

function findArabicFontPath() {
	const candidates = [
		'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
		'/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
		'/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
	];

	return candidates.find((candidate) => fs.existsSync(candidate));
}

function shapeArabicText(sourceText) {
	if (!sourceText || typeof sourceText !== 'string') return '';
	if (!/[\u0600-\u06FF]/.test(sourceText)) {
		return sourceText;
	}

	const reshaped = arabicReshaper.convertArabic(sourceText);
	const embedding = bidi.getEmbeddingLevels(reshaped, 'rtl');
	return bidi.getReorderedString(reshaped, embedding);
}

function resolveFieldValue(field, studentName, branding) {
	if (field === 'studentName') return studentName;
	if (field === 'date') return new Date().toLocaleDateString('ar-SA');
	if (field === 'schoolName') return branding.schoolName || 'دار الإتقان العالي';
	return '';
}

function estimateTextWidth(text = '', fontSize = 24) {
	return Math.max(1, text.length) * fontSize * 0.52;
}

function smartFontSize(text, baseFontSize, maxWidth) {
	const estimated = estimateTextWidth(text, baseFontSize);
	if (!maxWidth || estimated <= maxWidth) {
		return baseFontSize;
	}

	const ratio = maxWidth / estimated;
	return Math.max(20, Math.floor(baseFontSize * ratio));
}

async function embedImageIfExists(pdfDoc, imagePath) {
	if (!imagePath) return null;

	const resolved = path.resolve(__dirname, '../../', imagePath.replace(/^\//, ''));
	if (!fs.existsSync(resolved)) return null;

	const data = fs.readFileSync(resolved);
	const ext = path.extname(resolved).toLowerCase();

	if (ext === '.png') {
		return pdfDoc.embedPng(data);
	}

	if (ext === '.jpg' || ext === '.jpeg') {
		return pdfDoc.embedJpg(data);
	}

	return null;
}

function drawBackground(page, template) {
	const width = template.width || 1123;
	const height = template.height || 794;
	const bgColor = hexToRgb(template.background?.color || '#f8f4ea');
	const accentColor = hexToRgb(template.background?.accentColor || '#0f4a3c');

	page.drawRectangle({
		x: 0,
		y: 0,
		width,
		height,
		color: bgColor,
	});

	page.drawRectangle({
		x: 0,
		y: height - 96,
		width,
		height: 96,
		color: accentColor,
	});

	page.drawRectangle({
		x: 24,
		y: 24,
		width: width - 48,
		height: height - 48,
		borderWidth: 2,
		borderColor: accentColor,
	});

	page.drawRectangle({
		x: 40,
		y: height - 116,
		width: width - 80,
		height: 12,
		color: hexToRgb('#ffffff'),
	});

	page.drawRectangle({
		x: 44,
		y: 84,
		width: 120,
		height: 8,
		color: accentColor,
	});

	page.drawRectangle({
		x: width - 164,
		y: 84,
		width: 120,
		height: 8,
		color: accentColor,
	});
}

async function buildCertificatesPdf({ template, students, branding }) {
	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);
	const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	const arabicFontPath = findArabicFontPath();
	const arabicFont = arabicFontPath ? await pdfDoc.embedFont(fs.readFileSync(arabicFontPath)) : null;

	const logoImage = await embedImageIfExists(pdfDoc, branding.logoPath);
	const signatureImage = await embedImageIfExists(pdfDoc, branding.signaturePath);

	for (const student of students) {
		const page = pdfDoc.addPage([template.width || 1123, template.height || 794]);
		drawBackground(page, template);

		for (const element of template.elements || []) {
			if (element.type === 'text' || element.type === 'dynamicText') {
				const sourceText = element.type === 'dynamicText'
					? resolveFieldValue(element.field, student, branding)
					: element.text || '';

				const shapedText = shapeArabicText(sourceText);
				const maxWidth = element.width || 900;
				const baseSize = element.fontSize || 26;
				const finalSize = smartFontSize(shapedText, baseSize, maxWidth);

				const chosenFont = arabicFont || ((element.fontWeight || '').toString().includes('7') ? boldFont : regularFont);
				const textWidth = chosenFont.widthOfTextAtSize(shapedText, finalSize);

				let x = (element.x || 120) - textWidth / 2;
				if (element.align === 'left') {
					x = element.x || 120;
				}
				if (element.align === 'right') {
					x = (element.x || 120) - textWidth;
				}

				page.drawText(shapedText, {
					x,
					y: (template.height || 794) - (element.y || 120),
					size: finalSize,
					font: chosenFont,
					color: hexToRgb(element.fill || '#0f172a'),
				});
			}

			if (element.type === 'dynamicImage') {
				const image = element.field === 'logo' ? logoImage : signatureImage;
				if (!image) continue;

				page.drawImage(image, {
					x: element.x || 80,
					y: (template.height || 794) - (element.y || 120) - (element.height || 60),
					width: element.width || 120,
					height: element.height || 60,
				});
			}
		}
	}

	return pdfDoc.save();
}

module.exports = {
	buildCertificatesPdf,
};
