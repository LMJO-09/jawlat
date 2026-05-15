import React from 'react';

interface Props {
  generation?: string;
  className?: string;
}

export default function GenerationBadge({ generation, className = "" }: Props) {
  if (!generation) return null;
  const shortGen = generation.slice(-2);
  const colors: Record<string, string> = {
    '2008': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    '2009': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    '2010': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black pointer-events-none select-none inline-flex items-center justify-center ${colors[generation] || 'bg-slate-100 text-slate-600'} ${className}`}>
      {shortGen}
    </span>
  );
}
