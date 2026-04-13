const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

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
		x: 24,
		y: 24,
		width: width - 48,
		height: height - 48,
		borderWidth: 2,
		borderColor: accentColor,
	});

	page.drawRectangle({
		x: 44,
		y: 44,
		width: width - 88,
		height: height - 88,
		borderWidth: 1,
		borderColor: hexToRgb('#d6b66f'),
	});
}

async function buildCertificatesPdf({ template, students, branding }) {
	const pdfDoc = await PDFDocument.create();
	const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

				const maxWidth = element.width || 900;
				const baseSize = element.fontSize || 26;
				const finalSize = smartFontSize(sourceText, baseSize, maxWidth);

				const isBold = (element.fontWeight || '').toString().includes('7');
				const chosenFont = isBold ? boldFont : regularFont;
				const textWidth = chosenFont.widthOfTextAtSize(sourceText, finalSize);

				let x = (element.x || 120) - textWidth / 2;
				if (element.align === 'left') {
					x = element.x || 120;
				}
				if (element.align === 'right') {
					x = (element.x || 120) - textWidth;
				}

				page.drawText(sourceText, {
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
