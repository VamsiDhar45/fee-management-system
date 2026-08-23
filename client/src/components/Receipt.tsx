import React from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface ReceiptProps {
  receipt: any;
  studentDetails?: any;
  onClose: () => void;
  showSuccessIcon?: boolean;
}

export const Receipt: React.FC<ReceiptProps> = ({ receipt, studentDetails, onClose, showSuccessIcon = false }) => {
  const student = receipt.students || studentDetails;
  const entity = receipt.entities || student?.entities;
  const isGst = entity?.has_gst || false;
  
  const totalAmount = Number(receipt.amount);
  let baseAmount = totalAmount;
  let cgst = 0;
  let sgst = 0;
  
  if (isGst) {
    baseAmount = totalAmount / 1.18;
    cgst = baseAmount * 0.09;
    sgst = baseAmount * 0.09;
  }
  
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
      <Card className="receipt-area text-left mb-8 shadow-md border-t-4 border-t-primary">
        <CardContent className="p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-border pb-6 mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary m-0 uppercase tracking-tight">{entity?.name || 'Gurukul Finance'}</h2>
              <p className="text-muted-foreground m-0 font-medium tracking-wide mt-1">{isGst ? 'TAX INVOICE' : 'FEE RECEIPT'}</p>
              {isGst && (
                <div className="text-sm text-muted-foreground mt-3 space-y-1">
                  <div><span className="font-semibold text-foreground">GSTIN:</span> 37AANFG9692B1ZY</div>
                  <div><span className="font-semibold text-foreground">SAC Code:</span> 999293</div>
                </div>
              )}
            </div>
            <div className="text-left sm:text-right">
              <div className="font-semibold text-sm">Receipt #: <span className="font-mono">{receipt.receipt_number}</span></div>
              <div className="text-muted-foreground text-sm">Date: {new Date(receipt.created_at).toLocaleDateString()}</div>
              <div className="text-muted-foreground text-sm">Mode: {receipt.payment_mode}</div>
            </div>
          </div>
          
          <div className="mb-10">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Received From</h4>
            <div className="text-xl font-bold">{student?.name}</div>
            {student?.admission_number && (
              <div className="text-sm font-medium text-muted-foreground mt-1 mb-1">
                Adm No: {student.admission_number}
              </div>
            )}
            <div className="text-muted-foreground">
              Batch: {student?.batches?.name}
            </div>
          </div>
          
          <table className="w-full mb-12">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-sm font-semibold text-muted-foreground">Description</th>
                <th className="text-right py-3 text-sm font-semibold text-muted-foreground">Amount</th>
              </tr>
            </thead>
            {isGst ? (
              <tbody className="text-sm">
                <tr>
                  <td className="py-3 text-foreground font-medium">Value of Supply of Service (Coaching Fee){receipt.fee_installments?.name ? ` - ${receipt.fee_installments.name}` : ''}</td>
                  <td className="py-3 text-right">₹{baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="py-3 text-foreground font-medium">(+) CGST 9%</td>
                  <td className="py-3 text-right">₹{cgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="py-3 text-foreground font-medium border-b border-border pb-4">(+) SGST 9%</td>
                  <td className="py-3 text-right border-b border-border pb-4">₹{sgst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td className="py-4 text-foreground font-bold text-base">Total</td>
                  <td className="py-4 text-right font-bold text-xl text-primary">₹{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td className="py-4 text-foreground font-medium">Fee Payment{receipt.fee_installments?.name ? ` - ${receipt.fee_installments.name}` : ''}</td>
                  <td className="py-4 text-right font-bold text-xl text-primary">₹{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            )}
          </table>
          
          <div className="flex justify-between items-end mt-16 pt-8 border-t border-border border-dashed">
            <div className="text-muted-foreground text-xs italic w-2/3">
              This is a computer-generated document. No signature is required.
              <br />All disputes are subject to jurisdiction of Vijayawada.
            </div>
            <div className="w-1/3 text-right text-sm font-semibold border-t border-foreground pt-2">
              Authorized Signature
            </div>
          </div>
        </CardContent>
      </Card>

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
