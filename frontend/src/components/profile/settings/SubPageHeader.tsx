interface Props {
  title: string;
  subtitle?: string | null;
  onBack: () => void;
  onClose: () => void;
}

export function SubPageHeader({ title, subtitle = null, onBack, onClose }: Props) {
  return (
    <div className="bg-white border-b relative">
      {/* Bottom-sheet handle (mobile only) */}
      <div className="flex justify-center pt-3 pb-1 sm:hidden">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>
      <button onClick={onClose} className="absolute top-3 right-4 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-900 text-xl cursor-pointer leading-none">✕</button>
      <button onClick={onBack} className="absolute top-3 left-4 sm:top-4 sm:left-4 text-gray-600 hover:text-gray-900 cursor-pointer text-sm flex items-center gap-1">← Back</button>
      <div className="px-4 py-3 sm:py-6 text-center">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mt-5 sm:mt-0">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1 text-sm sm:text-base">{subtitle}</p>}
      </div>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div
      className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${checked ? "bg-green-700" : "bg-gray-300"} relative shrink-0`}
      onClick={onChange}
    >
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${checked ? "translate-x-6" : "translate-x-0.5"}`} />
    </div>
  );
}
