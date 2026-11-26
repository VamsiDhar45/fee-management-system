export function numberToIndianWords(num: number): string {
  if (num === 0) return 'Rupees Zero Only';
  if (num < 0) return `Minus ${numberToIndianWords(Math.abs(num))}`;

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = '';
    if (hundred > 0) {
      result += ones[hundred] + ' Hundred';
      if (rest > 0) result += ' ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  // Integer and decimal parts
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let remaining = integerPart;
  const parts: string[] = [];

  // Crores: 1,00,00,000
  const crores = Math.floor(remaining / 10000000);
  if (crores > 0) {
    parts.push(convertThreeDigits(crores) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs: 1,00,000
  const lakhs = Math.floor(remaining / 100000);
  if (lakhs > 0) {
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands: 1,000
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    parts.push(convertTwoDigits(thousands) + ' Thousand');
    remaining %= 1000;
  }

  // Hundreds and units
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  let words = 'Rupees ' + parts.join(' ');
  if (decimalPart > 0) {
    words += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }
  words += ' Only';

  return words;
}

