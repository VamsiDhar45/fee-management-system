import React from 'react';

interface ReceiptProps {
  receipt: any;
  studentDetails?: any;
}

export const ReceiptClassic: React.FC<ReceiptProps> = ({ receipt, studentDetails }) => {
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
    <div className="bg-white text-black p-8 border-4 border-double border-gray-800 max-w-2xl mx-auto font-serif shadow-lg relative">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <span className="text-8xl font-bold uppercase rotate-45 text-gray-900">{entity?.name || 'GURUKUL'}</span>
      </div>

      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6 relative z-10">
        <h1 className="text-3xl font-bold uppercase tracking-widest">{entity?.name || 'Gurukul Finance'}</h1>
        <p className="text-sm font-semibold mt-1">{entity?.description || 'Main Branch, Vijayawada'}</p>
        {isGst && (
          <p className="text-xs font-semibold mt-1">GSTIN: 37AANFG9692B1ZY | SAC Code: 999293</p>
        )}
        <div className="inline-block border border-gray-800 px-4 py-1 mt-4 font-bold tracking-widest uppercase bg-gray-100">
          {isGst ? 'TAX INVOICE' : 'OFFICIAL RECEIPT'}
        </div>
      </div>

      <div className="flex justify-between mb-6 text-sm font-semibold relative z-10">
        <div>
          <p>Receipt No: <span className="font-bold">{receipt?.receipt_number || 'VCH-0001'}</span></p>
          <p>Student ID: <span className="font-bold">{student?.admission_number || 'N/A'}</span></p>
        </div>
        <div className="text-right">
          <p>Date: <span className="font-bold">{receipt?.created_at ? new Date(receipt.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span></p>
          <p>Payment Mode: <span className="font-bold">{receipt?.payment_mode || 'CASH'}</span></p>
        </div>
      </div>

      <div className="mb-6 text-sm relative z-10">
        <p className="mb-2">Received with thanks from Mr./Ms. <span className="font-bold italic text-lg border-b border-dashed border-gray-800 pb-1">{student?.name || 'Student Name'}</span></p>
        <p>For the Batch <span className="font-bold">{student?.batches?.name || 'Standard Batch'}</span></p>
      </div>

      <table className="w-full border-collapse border-2 border-gray-800 mb-8 relative z-10 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border-2 border-gray-800 p-2 text-left">S.No</th>
            <th className="border-2 border-gray-800 p-2 text-left">Particulars</th>
            <th className="border-2 border-gray-800 p-2 text-right">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {isGst ? (
            <>
              <tr>
                <td className="border-r-2 border-l-2 border-gray-800 p-2 text-center">1</td>
                <td className="border-r-2 border-gray-800 p-2">Coaching Fee (Basic Value)</td>
                <td className="border-r-2 border-gray-800 p-2 text-right">{baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-l-2 border-gray-800 p-2 text-center"></td>
                <td className="border-r-2 border-gray-800 p-2 pl-6">Add: CGST @ 9%</td>
                <td className="border-r-2 border-gray-800 p-2 text-right">{cgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td className="border-r-2 border-l-2 border-b-2 border-gray-800 p-2 text-center"></td>
                <td className="border-r-2 border-b-2 border-gray-800 p-2 pl-6">Add: SGST @ 9%</td>
                <td className="border-r-2 border-b-2 border-gray-800 p-2 text-right">{sgst.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </>
          ) : (
             <tr>
                <td className="border-2 border-gray-800 p-2 text-center">1</td>
                <td className="border-2 border-gray-800 p-2">Fee Payment</td>
                <td className="border-2 border-gray-800 p-2 text-right">{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
          )}
          <tr className="font-bold bg-gray-100">
            <td colSpan={2} className="border-2 border-gray-800 p-2 text-right">TOTAL AMOUNT</td>
            <td className="border-2 border-gray-800 p-2 text-right text-lg">₹{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-end mt-16 pt-8 relative z-10">
        <div className="text-xs italic w-2/3">
          * Subject to Realization of Cheque/Demand Draft.<br/>
          * Fees once paid is not refundable.
        </div>
        <div className="w-1/3 text-center border-t border-gray-800 pt-2 font-semibold text-sm">
          Authorized Signatory
        </div>
      </div>
    </div>
  );
};
