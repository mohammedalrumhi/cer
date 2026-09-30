const { renderLegacyCertificatesPdf } = require('./legacyPdfRenderer');
const { renderSceneCertificatesPdf } = require('./scenePdfRenderer');

/**
 * PDF_ENGINE selects the renderer:
 *   scene  — shared HarfBuzz scene, identical to the editor (default)
 *   legacy — v1 PDFKit text layout, kept for comparison and rollback
 */
function getPdfEngine() {
  return String(process.env.PDF_ENGINE || 'scene').toLowerCase() === 'legacy' ? 'legacy' : 'scene';
}

function renderCertificatesPdf(options) {
  return getPdfEngine() === 'legacy'
    ? renderLegacyCertificatesPdf(options)
    : renderSceneCertificatesPdf(options);
}

async function buildCertificatePdf({ template, student, branding }) {
  return renderCertificatesPdf({ template, students: [student], branding });
}

async function buildCertificatesPdf({ template, students, branding }) {
  return renderCertificatesPdf({ template, students, branding });
}

module.exports = {
  buildCertificatePdf,
  buildCertificatesPdf,
  getPdfEngine,
};
