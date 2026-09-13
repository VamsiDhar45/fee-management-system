import { useState } from 'react';
import { Receipt } from '../components/Receipt';
import { ReceiptClassic } from '../components/ReceiptClassic';
import { ReceiptMinimal } from '../components/ReceiptMinimal';
import { ReceiptSlip } from '../components/ReceiptSlip';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const ReceiptTemplates = () => {
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal' | 'slip'>('classic');
  const [isGst, setIsGst] = useState(true);

  const dummyData = {
    receipt_number: isGst ? 'GKL-C-2026-0089' : 'CBA-C-2026-0102',
    amount: 15000,
    payment_mode: 'UPI',
    created_at: new Date().toISOString(),
    students: {
      name: 'Rahul Sharma',
      admission_number: 'ADM-2026-140',
      batches: { name: 'CA Foundation - Morning' },
      entities: {
        name: isGst ? 'Gurukul for CA & CMA' : 'Chanakya Bhavan',
        address: 'MG Road, Vijayawada, Andhra Pradesh',
        has_gst: isGst
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <header className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipt Formats Preview</h1>
          <p className="text-muted-foreground mt-1">Preview how receipts will look for GST and Non-GST entities.</p>
        </div>
        <Button onClick={() => window.print()} className="shadow-sm">
          Print Preview
        </Button>
      </header>

      <Card className="no-print bg-muted/30 border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-8 items-center justify-center">
            <div className="space-y-2 text-center">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider block">Select Format</label>
              <div className="flex bg-background rounded-lg p-1 border shadow-sm">
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${template === 'modern' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTemplate('modern')}
                >
                  Modern (Standard)
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${template === 'classic' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTemplate('classic')}
                >
                  Classic (Accounting)
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${template === 'minimal' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTemplate('minimal')}
                >
                  Minimalist
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${template === 'slip' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setTemplate('slip')}
                >
                  POS Slip
                </button>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider block">Select Entity Type</label>
              <div className="flex bg-background rounded-lg p-1 border shadow-sm">
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isGst ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setIsGst(true)}
                >
                  Gurukul (With GST)
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!isGst ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setIsGst(false)}
                >
                  Standard (Non-GST)
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-100 p-8 rounded-xl border print:p-0 print:border-none print:bg-white min-h-[600px] flex items-center justify-center">
        <div className={`w-full ${template === 'slip' ? '' : 'max-w-3xl bg-white shadow-xl'} print:shadow-none`}>
          {template === 'modern' && <Receipt receipt={dummyData} onClose={() => {}} />}
          {template === 'classic' && <div className="p-8"><ReceiptClassic receipt={dummyData} /></div>}
          {template === 'minimal' && <div className="p-8"><ReceiptMinimal receipt={dummyData} /></div>}
          {template === 'slip' && <div className="p-8"><ReceiptSlip receipt={dummyData} /></div>}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .bg-gray-100, .bg-gray-100 * { visibility: visible; }
          .bg-gray-100 { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: 100%;
          }
        }
      `}} />
    </div>
  );
};
