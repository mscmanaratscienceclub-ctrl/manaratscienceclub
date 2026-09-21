export interface ParsedSmsResult {
  transactionId: string | null;
  amount: number | null;
  senderNumber: string | null;
  isPaymentNotification: boolean;
}

/**
 * Extracts transaction ID, payment amount, and sender phone number from
 * Bangladeshi MFS confirmation SMS (bKash, Nagad, Rocket, Upay).
 */
export function parsePaymentSms(body: string): ParsedSmsResult {
  const normalized = body.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();

  // 1. Transaction ID regex
  // Matches "TrxID 9K20AB3XYZ", "TxnID: 71XYZ234", "TxnId: 123456789"
  const trxMatch = normalized.match(
    /(?:TrxID|TxnID|TxnId|Transaction\s*ID|TRX\s*ID)[:\s]+([A-Za-z0-9]+)/i
  );
  const transactionId = trxMatch ? trxMatch[1].trim().toUpperCase() : null;

  // 2. Amount regex
  // Matches "Tk 500.00", "Tk. 500", "Tk500.00", "BDT 500", "Amount: Tk 500.00"
  const amountMatch = normalized.match(
    /(?:(?:Amount[:\s]+)?(?:Tk|BDT)\.?\s*|(?:\bTk\b|\bBDT\b)\s*)([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)/i
  );
  let amount: number | null = null;
  if (amountMatch) {
    const cleaned = amountMatch[1].replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Sender / Customer Phone Number regex
  // Matches "from 01712345678", "Sender: 01812345678", "from +8801912345678"
  const phoneMatch = normalized.match(
    /(?:from|Sender:?|sender)\s*(?:\+?88)?(01[3-9]\d{8})/i
  );
  const senderNumber = phoneMatch ? phoneMatch[1] : null;

  // Consider it a valid payment notification if it has a Transaction ID
  // or both amount and sender number
  const isPaymentNotification = Boolean(
    transactionId || (amount !== null && senderNumber !== null)
  );

  return {
    transactionId,
    amount,
    senderNumber,
    isPaymentNotification,
  };
}

