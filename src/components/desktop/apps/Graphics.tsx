import type { Win } from '../os';
export default function Graphics({ win }: { win: Win }) { return <div className="grid h-full place-items-center bg-white text-[#666]">{win.title}</div>; }
