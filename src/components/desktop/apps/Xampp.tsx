import { useEffect, useRef, useState } from 'react';
import { X, Wrench, Network, Terminal, FolderOpen, Cog, HelpCircle, Power } from 'lucide-react';
import { useOS, type Win } from '../os';
import { useServer } from '../../../lib/mysqlServer';

type Mod = 'Apache' | 'MySQL' | 'FileZilla' | 'Mercury' | 'Tomcat';
const MODS: Mod[] = ['Apache', 'MySQL', 'FileZilla', 'Mercury', 'Tomcat'];
const pidOf = (m: string) => 1000 + ((m.charCodeAt(0) * 97 + m.length * 131) % 9000);

/** XAMPP Control Panel v3.3.0 – start/stop Apache i MySQL, dziennik zdarzen. */
export default function Xampp({ win }: { win: Win }) {
  const os = useOS(); const srv = useServer(os.server);
  const [busy, setBusy] = useState<Mod | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    os.setTitle(win.id, 'XAMPP Control Panel v3.3.0   [ Compiled: Apr 6th 2021 ]');
    if (!srv.log.length) {
      for (const l of ['Initializing Control Panel', 'Windows Version:  Windows 11 Home 64-bit', 'XAMPP Version: 8.2.12', 'Control Panel Version: 3.3.0  [ Compiled: Apr 6th 2021 ]', 'Running with Administrator rights - good!', 'XAMPP Installation Directory: "c:\\xampp\\"', 'Checking for prerequisites', 'All prerequisites found', 'Initializing Modules', 'Starting Check-Timer', 'Control Panel Ready']) srv.addLog('main', l);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { logRef.current?.scrollTo(0, 1e6); }, [srv.log.length]);
  const running = (m: Mod) => (m === 'Apache' ? srv.apache : m === 'MySQL' ? srv.mysql : false);
  const toggle = (m: Mod) => {
    if (m !== 'Apache' && m !== 'MySQL') { srv.addLog(m.toLowerCase().slice(0, 6), `Attempting to start ${m} app...`); setTimeout(() => srv.addLog(m.toLowerCase().slice(0, 6), 'Status change detected: stopped'), 900); return; }
    const on = running(m); const tag = m === 'Apache' ? 'Apache' : 'mysql';
    setBusy(m);
    srv.addLog(tag, on ? `Attempting to stop ${m} (PID: ${pidOf(m)})` : `Attempting to start ${m} app...`);
    setTimeout(() => {
      if (m === 'Apache') srv.apache = !on; else srv.mysql = !on;
      srv.addLog(tag, `Status change detected: ${on ? 'stopped' : 'running'}`);
      setBusy(null);
    }, on ? 500 : 1100);
  };
  const btn = 'h-[23px] min-w-[52px] border border-[#adadad] bg-[#e1e1e1] px-2 text-[12px] hover:border-[#0078d7] hover:bg-[#e5f1fb] disabled:text-[#999] disabled:hover:border-[#adadad] disabled:hover:bg-[#e1e1e1]';
  const side = 'flex h-[27px] w-[96px] items-center gap-1.5 border border-[#adadad] bg-[#e1e1e1] px-2 text-[12px] hover:border-[#0078d7] hover:bg-[#e5f1fb]';

  return (
    <div className="flex h-full flex-col bg-[#f0f0f0] p-2 font-['Segoe_UI',Tahoma,sans-serif] text-[12px] text-black">
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-[4px] bg-[#fb7a24] text-[22px] font-black text-white">ꭗ</span>
            <span className="text-[20px] font-semibold">XAMPP Control Panel v3.3.0</span>
          </div>
          <div className="mb-1 flex items-center gap-2 text-[11px]"><span className="w-[60px]">Modules</span></div>
          <table className="w-full border-collapse">
            <thead><tr className="text-left"><th className="w-[52px] font-normal">Service</th><th className="w-[74px] font-normal">Module</th><th className="w-[70px] font-normal">PID(s)</th><th className="w-[84px] font-normal">Port(s)</th><th className="font-normal">Actions</th></tr></thead>
            <tbody>{MODS.map((m) => {
              const on = running(m); const ports = m === 'Apache' ? '80, 443' : m === 'MySQL' ? '3306' : m === 'Tomcat' ? '8005, 8080' : m === 'Mercury' ? '25, 79, 105' : '21, 14147';
              return (
                <tr key={m} className="h-[30px]">
                  <td><span className="grid h-[18px] w-[18px] place-items-center border border-[#bbb] bg-white text-[#c42b1c]"><X size={13} strokeWidth={3} /></span></td>
                  <td><span className={`inline-block w-[68px] px-1.5 py-0.5 ${on ? 'bg-[#c8ffc8]' : ''}`}>{m}</span></td>
                  <td className={on ? 'bg-[#c8ffc8]' : ''}>{on ? pidOf(m) + (m === 'Apache' ? `\n${pidOf(m) + 412}` : '') : ''}</td>
                  <td className={on ? 'bg-[#c8ffc8]' : ''}>{on ? ports : ''}</td>
                  <td className="space-x-1 whitespace-nowrap pl-2">
                    <button data-coach={`xampp-${on ? 'stop' : 'start'}-${m}`} disabled={busy === m} onClick={() => toggle(m)} className={btn}>{on ? 'Stop' : 'Start'}</button>
                    <button data-coach={`xampp-admin-${m}`} disabled={!on} onClick={() => os.open('browser', { url: m === 'MySQL' ? 'localhost/phpmyadmin/' : 'localhost/' })} className={btn}>Admin</button>
                    <button className={btn}>Config</button><button className={btn}>Logs</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <button className={side}><Wrench size={13} />Config</button><button className={side}><Network size={13} />Netstat</button><button className={side}><Terminal size={13} />Shell</button>
          <button className={side} onClick={() => os.open('explorer', { path: 'C:/xampp' })}><FolderOpen size={13} className="text-[#d9a521]" />Explorer</button><button className={side}><Cog size={13} />Services</button>
          <button className={side}><HelpCircle size={13} />Help</button><button className={side} onClick={() => os.close(win.id)}><Power size={13} />Quit</button>
        </div>
      </div>
      <div ref={logRef} className="mt-2 min-h-0 flex-1 overflow-auto border border-[#828790] bg-white p-1 font-['Arial',sans-serif] text-[13px] leading-[1.4]">
        {srv.log.map((l, i) => { const m = /^(\S+)\s+\[(.+?)\]\s+(.*)$/.exec(l); const tag = m?.[2].trim() ?? ''; return (
          <div key={i} className="whitespace-pre"><span className="text-[#555]">{m?.[1]}</span>  <span>[</span><span className="text-[#0000ff]">{m?.[2]}</span><span>]</span>  <span className={/error|shutdown unexpectedly|Problem|blocked/i.test(l) ? 'text-[#ff0000]' : ''}>{m?.[3] ?? l}</span></div>); })}
      </div>
    </div>
  );
}
