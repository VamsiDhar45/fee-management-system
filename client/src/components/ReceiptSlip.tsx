import React from 'react';

interface ReceiptProps {
  receipt: any;
  studentDetails?: any;
}

export const ReceiptSlip: React.FC<ReceiptProps> = ({ receipt, studentDetails }) => {
  const student = receipt?.students || studentDetails;
  const entity = receipt?.entities || student?.entities;
  const isGst = entity?.has_gst || false;
  
  const totalAmount = Number(receipt?.amount || 0);
  let baseAmount = totalAmount;
  let cgst = 0;
  let sgst = 0;
  
  if (isGst) {
    baseAmount = totalAmount / 1.18;
    cgst = baseAmount * 0.09;
    sgst = baseAmount * 0.09;
  }

  return (
    <div className="bg-white text-black p-6 mx-auto font-mono text-sm max-w-[320px] shadow-sm border border-gray-200">
      <div className="text-center mb-6">
        <h1 className="font-bold text-lg leading-tight uppercase">{entity?.name || 'Gurukul'}</h1>
        <p className="text-xs mt-1 leading-tight">{entity?.description || 'Vijayawada'}</p>
        {isGst && (
          <p className="text-xs mt-1">GSTIN: 37AANFG9692B1ZY<br/>SAC: 999293</p>
        )}
        <div className="border-t border-b border-dashed border-gray-400 py-1 my-3 text-xs font-bold uppercase tracking-wider">
          {isGst ? 'TAX INVOICE' : 'RECEIPT'}
        </div>
      </div>

      <div className="space-y-1 mb-4 text-xs">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{receipt?.created_at ? new Date(receipt.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Rcpt No:</span>
          <span>{receipt?.receipt_number || 'VCH-0001'}</span>
        </div>
        <div className="flex justify-between">
          <span>Mode:</span>
          <span>{receipt?.payment_mode || 'CASH'}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-400 py-3 mb-4 space-y-1 text-xs">
        <p><strong>Name:</strong> {student?.name || 'Student Name'}</p>
        <p><strong>ID:</strong> {student?.admission_number || 'N/A'}</p>
        <p><strong>Batch:</strong> {student?.batches?.name || 'Standard Batch'}</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 mb-4">
        <div className="flex justify-between font-bold mb-2 text-xs">
          <span>Item</span>
          <span>Amount</span>
        </div>
        {isGst ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Fee (Base)</span>
              <span>{baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST @ 9%</span>
              <span>{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST @ 9%</span>
              <span>{sgst.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between text-xs">
            <span>Fee Payment</span>
            <span>{totalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between font-bold text-base mb-8">
        <span>TOTAL:</span>
        <span>Rs.{totalAmount.toLocaleString()}</span>
      </div>

      <div className="text-center text-[10px] text-gray-500">
        <p>*** THANK YOU ***</p>
        <p className="mt-1">Computer Generated Receipt</p>
      </div>
    </div>
  );
};
