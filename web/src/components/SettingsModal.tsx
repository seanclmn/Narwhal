'use client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: string;
  setFilter: (filter: string) => void;
  clientId: string | null;
}

export const SettingsModal = ({ isOpen, onClose, filter, setFilter, clientId }: SettingsModalProps) => {
  if (!isOpen) return null;

  const filters = [
    { name: 'Normal', value: 'none' },
    { name: 'B&W', value: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia(100%)' },
    { name: 'Invert', value: 'invert(100%)' },
    { name: 'Blur', value: 'blur(4px)' },
    { name: 'Glass', value: 'blur(10px) brightness(1.2) saturate(150%)' },
    { name: 'Warm', value: 'sepia(30%) saturate(150%) hue-rotate(-30deg)' },
    { name: 'Cool', value: 'saturate(120%) hue-rotate(180deg) brightness(1.1)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-white">Room Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">Video Filter</label>
            <div className="grid grid-cols-2 gap-2">
              {filters.map((fx) => (
                <button
                  key={fx.name}
                  onClick={() => setFilter(fx.value)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all border ${filter === fx.value
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                >
                  {fx.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Your Peer ID:</span>
              <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300">{clientId}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
