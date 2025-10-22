import * as pdfjsLib from 'pdfjs-dist';
import type { ParsedData } from '@/components/ParsedResults';

// Configure PDF.js worker (bundled to avoid CORS/version issues)
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Patterns for different credit card issuers and data extraction
const monthName = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const patterns = {
  issuers: [
    { name: 'American Express', regex: /american\s*express|amex/i },
    { name: 'Visa', regex: /visa/i },
    { name: 'Mastercard', regex: /mastercard|master\s*card/i },
    { name: 'Discover', regex: /discover/i },
    { name: 'Chase', regex: /chase/i },
  ],
  // Match card numbers in various formats with flexible whitespace and masking:
  // "Account Number   XXXX-XXXX-XXXX-1234" or "Account: **** 1234" or "Card ending in 1234"
  cardNumber: /(?:card|account)(?:\s*(?:no\.?|number|#))?\s*[:\s]*(?:ending\s*in\s*|last\s*4\s*digits?\s*)?(?:[X*x]{4}[\s-]*){0,3}[X*x]{0,4}[\s-]*(\d{4})(?!\d)/i,
  // Date ranges like 01/01/2025 - 01/31/2025
  billingCycle: /(?:billing\s*period|statement\s*period|cycle)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|\-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  // Date ranges like Jun 01, 2025 - Jun 30, 2025
  billingCycleAlt1: new RegExp(`(?:billing\\s*period|statement\\s*period|cycle)[:\\s]*(${monthName}\\s+\\d{1,2},\\s*\\d{4})\\s*(?:to|-)\\s*(${monthName}\\s+\\d{1,2},\\s*\\d{4})`, 'i'),
  // Date ranges like 01 Sep 2025 - 30 Sep 2025
  billingCycleAlt2: new RegExp(`(?:billing\\s*period|statement\\s*period|cycle)[:\\s]*(\\d{1,2}\\s+${monthName}\\s+\\d{4})\\s*(?:to|-)\\s*(\\d{1,2}\\s+${monthName}\\s+\\d{4})`, 'i'),
  
  // Payment due dates in multiple formats
  paymentDue: /(?:payment\s*due|due\s*date|payment\s*due\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  paymentDueAlt1: new RegExp(`(?:payment\\s*due|due\\s*date|payment\\s*due\\s*date)[:\\s]*(${monthName}\\s+\\d{1,2},\\s*\\d{4})`, 'i'),
  paymentDueAlt2: new RegExp(`(?:payment\\s*due|due\\s*date|payment\\s*due\\s*date)[:\\s]*(\\d{1,2}\\s+${monthName}\\s+\\d{4})`, 'i'),
  
  // Balances with optional currency labels (e.g., INR, USD)
  totalBalance: /(?:total\s*balance|new\s*balance|balance\s*due|amount\s*due)[:\s]*\$?([0-9,]+\.?\d{0,2})/i,
  totalBalanceCurrency: /(?:total\s*balance|new\s*balance|balance\s*due|amount\s*due)[:\s]*(?:([A-Z]{2,5}|INR|USD|AED|Rs\.?|CAD|EUR)\s*)?\$?([0-9,]+\.?\d{0,2})/i,
  
  // Transactions in MM/DD or Month DD formats
  transactions: /(\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+\$?([0-9,]+\.\d{2})/g,
  transactionsAlt: new RegExp(`(${monthName}\\s+\\d{1,2}(?:,\\s*\\d{4})?)\\s+(.+?)\\s+\\$?([0-9,]+\\.\\d{2})`, 'gi'),
};

export async function parsePDF(file: File): Promise<ParsedData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    console.log('Extracted text:', fullText.substring(0, 500));

    // Parse data
    const parsedData: ParsedData = {};

    // Detect issuer
    for (const issuer of patterns.issuers) {
      if (issuer.regex.test(fullText)) {
        parsedData.issuer = issuer.name;
        break;
      }
    }
    // Fallback: try to extract issuer name from common labels or header
    if (!parsedData.issuer) {
      const issuerLabelMatch = fullText.match(/(?:Card Issuer|Issuer)[:\s-]+([A-Za-z][A-Za-z0-9 &.-]+)/i);
      const bankHeaderMatch = fullText.match(/([A-Z][A-Za-z &.-]+Bank)/);
      if (issuerLabelMatch) {
        parsedData.issuer = issuerLabelMatch[1].trim();
      } else if (bankHeaderMatch) {
        parsedData.issuer = bankHeaderMatch[1].trim();
      }
    }

    // Extract card last 4 digits with multiple attempts
    let cardMatch = fullText.match(patterns.cardNumber);
    
    // Fallback: try to find any 4-digit number after common card/account labels
    if (!cardMatch) {
      const fallbackPattern = /(?:card|account|ending\s*in|last\s*4)[^\d]{0,50}?(\d{4})(?!\d)/i;
      cardMatch = fullText.match(fallbackPattern);
    }
    
    if (cardMatch) {
      parsedData.cardLast4 = cardMatch[1];
      console.log('Card last 4 digits detected:', cardMatch[1]);
    }

    // Extract billing cycle
    const billingMatch = fullText.match(patterns.billingCycle);
    if (billingMatch) {
      parsedData.billingCycle = `${billingMatch[1]} - ${billingMatch[2]}`;
    } else {
      const alt1 = fullText.match(patterns.billingCycleAlt1);
      const alt2 = fullText.match(patterns.billingCycleAlt2);
      if (alt1) {
        parsedData.billingCycle = `${alt1[1]} - ${alt1[2]}`;
      } else if (alt2) {
        parsedData.billingCycle = `${alt2[1]} - ${alt2[2]}`;
      }
    }

    // Extract payment due date
    const dueMatch = fullText.match(patterns.paymentDue) || fullText.match(patterns.paymentDueAlt1) || fullText.match(patterns.paymentDueAlt2);
    if (dueMatch) {
      parsedData.paymentDueDate = dueMatch[1];
    }

    // Extract total balance
    const balanceMatch = fullText.match(patterns.totalBalanceCurrency) || fullText.match(patterns.totalBalance);
    if (balanceMatch) {
      if (balanceMatch.length === 3) {
        const currency = balanceMatch[1]?.toString().toUpperCase().replace(/\.$/, '');
        const amount = balanceMatch[2];
        parsedData.totalBalance = `${currency ? currency + ' ' : '$'}${amount}`;
      } else {
        parsedData.totalBalance = `$${balanceMatch[1]}`;
      }
    }

    // Extract transactions
    const transactions: Array<{ date: string; description: string; amount: string }> = [];
    const transactionMatches = fullText.matchAll(patterns.transactions);
    
    for (const match of transactionMatches) {
      transactions.push({
        date: match[1],
        description: match[2].trim(),
        amount: `$${match[3]}`,
      });
    }

    // Also support Month-name formats
    const transactionMatchesAlt = fullText.matchAll(patterns.transactionsAlt);
    for (const match of transactionMatchesAlt) {
      transactions.push({
        date: match[1],
        description: match[2].trim(),
        amount: `$${match[3]}`,
      });
    }

    if (transactions.length > 0) {
      parsedData.transactions = transactions;
    }

    return parsedData;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF. Please ensure the file is a valid credit card statement.');
  }
}
