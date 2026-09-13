import React from 'react';

interface ReceiptProps {
  receipt: any;
  studentDetails?: any;
}

export const ReceiptMinimal: React.FC<ReceiptProps> = ({ receipt, studentDetails }) => {
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
    <div className="bg-white text-gray-900 p-12 max-w-2xl mx-auto font-sans tracking-wide">
      <div className="flex justify-between items-end border-b border-gray-200 pb-8 mb-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter text-black">{entity?.name || 'Gurukul Finance'}</h1>
          <p className="text-sm text-gray-500 mt-1">{isGst ? 'TAX INVOICE' : 'RECEIPT'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase tracking-widest text-[10px] mb-1">Receipt Number</p>
          <p className="font-medium">{receipt?.receipt_number || 'VCH-0001'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Billed To</p>
          <p className="font-medium text-lg">{student?.name || 'Student Name'}</p>
          <p className="text-sm text-gray-500 mt-1">{student?.batches?.name || 'Standard Batch'}</p>
          <p className="text-sm text-gray-500">ID: {student?.admission_number || 'N/A'}</p>
        </div>
        <div className="text-right space-y-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Date of Issue</p>
            <p className="text-sm font-medium">{receipt?.created_at ? new Date(receipt.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
            <p className="text-sm font-medium">{receipt?.payment_mode || 'CASH'}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-100 py-4 mb-6">
        <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-widest px-2">
          <span>Description</span>
          <span>Amount</span>
        </div>
      </div>

      <div className="space-y-4 px-2 mb-12">
        {isGst ? (
          <>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Educational Services (Basic Value)</span>
              <span>₹{baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>CGST (9%)</span>
              <span>₹{cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>SGST (9%)</span>
              <span>₹{sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Fee Payment</span>
            <span>₹{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-900 pt-6">
        <div className="w-1/2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-gray-500">Total Due</span>
            <span className="text-3xl font-semibold tracking-tighter">₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {isGst && (
        <div className="mt-16 text-[10px] text-gray-400">
          <p>GSTIN: 37AANFG9692B1ZY</p>
          <p>SAC Code: 999293</p>
        </div>
      )}
    </div>
  );
};
