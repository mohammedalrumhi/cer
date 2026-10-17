const express = require('express');

/** Public certificate verification: /api/verify/:serial (no login, minimal data). */
function createVerifyRouter({ storage }) {
  const router = express.Router();
  router.get('/:serial', async (req, res) => {
    const record = await storage.getRecord('certificates', String(req.params.serial).trim());
    if (!record) return res.status(404).json({ valid: false });
    const { serial, studentName, programName, templateName, schoolName, issuedAt } = record;
    return res.json({ valid: true, serial, studentName, programName, templateName, schoolName, issuedAt });
  });
  return router;
}

module.exports = { createVerifyRouter };
