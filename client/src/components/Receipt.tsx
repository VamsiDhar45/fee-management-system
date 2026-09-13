import React from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

import { ReceiptClassic } from './ReceiptClassic';

interface ReceiptProps {
  receipt: any;
  studentDetails?: any;
  onClose: () => void;
  showSuccessIcon?: boolean;
}

export const Receipt: React.FC<ReceiptProps> = ({ receipt, studentDetails, onClose, showSuccessIcon = false }) => {
  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto text-center py-16 px-4">
      {showSuccessIcon && (
        <div className="mb-8">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground">Receipt No: <span className="font-mono">{receipt.receipt_number}</span></p>
        </div>
      )}
      
      {/* Printable Receipt Area */}
      <div className="receipt-area mb-8 inline-block text-left w-full shadow-md">
        <ReceiptClassic receipt={receipt} studentDetails={studentDetails} />
      </div>

      <div className="flex flex-wrap gap-4 justify-center no-print">
        <Button variant="outline" onClick={onClose}>
          {showSuccessIcon ? 'Record Another Payment' : 'Back'}
        </Button>
        <Button onClick={printReceipt} className="gap-2 shadow-sm">
          <Download size={18} /> Download / Print Receipt
        </Button>
      </div>
      
      {/* CSS for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          
          .receipt-area-container, .receipt-area-container * { visibility: visible; }
          .receipt-area, .receipt-area * { visibility: visible; }
          
          /* Pull the receipt to the top-left to avoid whitespace from parent paddings */
          .receipt-area-container, .receipt-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important; 
            border: none !important; 
          }
          
          /* If there are multiple receipts, they are grouped in .receipt-area-container */
          .receipt-area-container .receipt-area {
            position: relative !important;
            page-break-inside: avoid;
            margin-bottom: 2rem !important;
          }
          
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
};
