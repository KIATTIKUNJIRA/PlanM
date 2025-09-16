import React, { createContext, useCallback, useContext, useState } from 'react';

interface PendingConfirm {
  message: string;
  resolve: (v: boolean) => void;
  options?: { confirmText?: string; cancelText?: string; danger?: boolean };
}

const ConfirmContext = createContext<null | ((msg: string, options?: PendingConfirm['options']) => Promise<boolean>)>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmFn = useCallback((message: string, options?: PendingConfirm['options']) => {
    return new Promise<boolean>(resolve => {
      setPending({ message, resolve, options });
    });
  }, []);

  const close = (result: boolean) => {
    if (pending) {
      pending.resolve(result);
      setPending(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {pending && (
        <div className="fixed inset-0 flex items-center justify-center z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => close(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-auto p-6 animate-fade-in text-sm">
            <div className="mb-5 whitespace-pre-line text-gray-800 leading-relaxed">{pending.message}</div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>close(false)} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">{pending.options?.cancelText || 'ยกเลิก'}</button>
              <button onClick={()=>close(true)} className={`px-4 py-2 rounded-lg text-white hover:opacity-90 ${pending.options?.danger ? 'bg-red-600' : 'bg-indigo-600'}`}>{pending.options?.confirmText || 'ตกลง'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export default ConfirmProvider;
