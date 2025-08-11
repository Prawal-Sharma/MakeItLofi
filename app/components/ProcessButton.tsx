'use client'

interface ProcessButtonProps {
  onClick: () => void
  disabled?: boolean
}

export default function ProcessButton({ onClick, disabled }: ProcessButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 px-6 rounded-lg font-medium text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
        disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'lofi-gradient hover:shadow-lg'
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Make it Lo-Fi
      </span>
    </button>
  )
}