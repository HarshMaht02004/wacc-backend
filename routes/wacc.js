const express = require('express');
const router = express.Router();

/**
 Expected POST JSON body:
 {
   "equityValue": number,      // E (market value of equity)
   "debtValue": number,        // D (market value of debt)
   // Either provide cost of equity directly:
   "re": number,               // e.g. 0.12 for 12%  (optional)
   // Or provide CAPM inputs to compute Re:
   "rf": number,               // risk-free rate, decimal (e.g. 0.04)
   "beta": number,
   "marketRiskPremium": number, // (Rm - Rf) as decimal (e.g. 0.06)
   "rd": number,               // cost of debt as decimal (e.g. 0.05)
   "taxRate": number           // corporate tax rate as decimal (e.g. 0.25)
 }

 Response:
 {
   "wacc": number,
   "re": number,
   "notes": "..."
 }
*/

function isNumber(n) {
  return typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);
}

router.get('/', (req, res) => {
  res.send('Hello from Express!');
});

router.post('/payload', (req, res) => {
  try {
    const body = req.body;
   // Convert input values (in ₹ crore) to rupees
const E = Number(body.equityValue) * 1e7; // 1 crore = 10 million = 1e7
const D = Number(body.debtValue) * 1e7;

    if (!isNumber(E) || E < 0 || !isNumber(D) || D < 0) {
      return res.status(400).json({error: "equityValue and debtValue must be numbers >= 0"});
    }
    const V = E + D;
    if (V === 0) {
      return res.status(400).json({error: "Sum of equityValue and debtValue must be > 0"});
    }

    let re = null;
    let notes = [];

    if (isNumber(body.re)) {
      re = Number(body.re);
      notes.push("Used provided cost of equity (re).");
    } else if (isNumber(body.rf) && isNumber(body.beta) && isNumber(body.marketRiskPremium)) {
      re = Number(body.rf) + Number(body.beta) * Number(body.marketRiskPremium);
      notes.push("Computed cost of equity (re) from CAPM.");
    } else {
      return res.status(400).json({error: "Please provide either 're' or all of 'rf', 'beta', 'marketRiskPremium'."});
    }

    if (!isNumber(body.rd)) return res.status(400).json({error: "rd (cost of debt) must be provided as a decimal."});
    if (!isNumber(body.taxRate)) return res.status(400).json({error: "taxRate must be provided as a decimal (e.g. 0.25)."});
    const rd = Number(body.rd);
    const tc = Number(body.taxRate);

    // WACC formula
    const weightE = E / V;
    const weightD = D / V;
    const wacc = weightE * re + weightD * rd * (1 - tc);

    return res.json({
      wacc: Number(wacc.toFixed(6)),
      re: Number(re.toFixed(6)),
      weightE: Number(weightE.toFixed(6)),
      weightD: Number(weightD.toFixed(6)),
      rd: rd,
      taxRate: tc,
      notes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: "Server error"});
  }
});

module.exports = router;
