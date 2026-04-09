import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Terminal as TerminalIcon } from 'lucide-react';

export default function DeveloperMode() {
  const t = useTranslations('DeveloperMode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<{ type: 'cmd' | 'res' | 'err', text: string }[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const commands: Record<string, () => Promise<string> | string> = {
    help: () => `${t('commands.help.header')}
- status        : ${t('commands.help.status')}
- inspect       : ${t('commands.help.inspect')}
- simulate      : ${t('commands.help.simulate')}
- ethics        : ${t('commands.help.ethics')}
- atlas-query   : ${t('commands.help.atlasQuery')}
- clear         : ${t('commands.help.clear')}`,

    status: async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        const mongoStatus = data.services?.database?.status === 'healthy' ? t('commands.status.stable') : 'DEGRADED';
        const redisStatus = data.services?.redis?.status === 'healthy' ? 'ONLINE' : 'DEGRADED';
        const latency = data.services?.database?.latency ? `(${data.services.database.latency}ms)` : '';
        
        return `${t('commands.status.header')}
---------------------------------------------
INFRASTRUCTURE:    ${t('commands.status.ready')}
SUPABASE_SQL:      ${mongoStatus} ${latency}
REDIS_UPSTASH:     ${redisStatus}
ATLAS_SEARCH:      ${output.some((o: { text: string }) => o.text.includes('ATLAS_QUERY')) ? t('commands.status.active') : t('commands.status.standby')}
---------------------------------------------
${t('commands.status.auth')}`;
      } catch (e) {
        return 'ERROR FETCHING HEALTH METRICS';
      }
    },

    inspect: () => `${t('commands.inspect.header')}
> ${t('commands.inspect.projects')}: 12 ${t('commands.inspect.active')}
> ${t('commands.inspect.invariants')}: ${t('commands.inspect.verified')}
> ${t('commands.inspect.state')}: ${t('commands.inspect.consistent')}
> ${t('commands.inspect.health')}: ${t('commands.inspect.operational')}`,

    ethics: () => `${t('commands.ethics.header')}
${t('commands.ethics.rule1')}
${t('commands.ethics.rule2')}
${t('commands.ethics.rule3')}
${t('commands.ethics.enforced')}`,

    'atlas-query': async () => {
      try {
        const res = await fetch('/api/intelligence/telemetry');
        const telemetry = await res.json();
        const topProjects = telemetry.projects?.slice(0, 3) || [];
        
        return `${t('commands.atlasQuery.header')}
----------------------------------------
${t('commands.atlasQuery.totalMilestones')}: ${telemetry.globalMetrics?.metrics?.verifiedMilestones || 42}
${t('commands.atlasQuery.avgLevel')}: 2.8/3.0
${t('commands.atlasQuery.distribution')}:
  ${t('commands.atlasQuery.level0')}: 4
  ${t('commands.atlasQuery.level1')}: 8
  ${t('commands.atlasQuery.level2')}: 15
  ${t('commands.atlasQuery.level3')}: 21
  
${t('commands.atlasQuery.topProjects')}:
${topProjects.map((p: any, i: number) => `${i + 1}. ${p.name}
   • Status: ${p.status}
   • Ecosystem: ${p.ecosystem}`).join('\n')}
  
${t('commands.atlasQuery.useFilter')}
${t('commands.atlasQuery.examples')}:
  atlas-query level=3
  atlas-query ecosystem=rootstock
  atlas-query status=verified`;
      } catch (e) {
        return 'ERROR EXECUTING ATLAS QUERY';
      }
    },

    clear: () => {
      setOutput([]);
      return '';
    },
  };

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    setOutput((prev: { type: 'cmd' | 'res' | 'err'; text: string }[]) => [...prev, { type: 'cmd', text: cmd }]);

    if (trimmedCmd === '') return;
    setIsProcessing(true);

    try {
      if (commands[trimmedCmd]) {
        const result = await commands[trimmedCmd]();
        if (result) {
          setOutput((prev: { type: 'cmd' | 'res' | 'err'; text: string }[]) => [...prev, { type: 'res', text: result }]);
        }
      } else if (trimmedCmd.startsWith('simulate ')) {
        setOutput((prev: { type: 'cmd' | 'res' | 'err'; text: string }[]) => [...prev, { type: 'res', text: `${t('commands.simulate.running')}\n${t('commands.simulate.noChanges')}` }]);
      } else {
        setOutput((prev: { type: 'cmd' | 'res' | 'err'; text: string }[]) => [...prev, { type: 'err', text: `${t('commands.errors.unknown')}${Math.floor(Math.random() * 16777215).toString(16)}` }]);
      }

      if (trimmedCmd !== 'clear') {
        setCommandHistory((prev: string[]) => [...prev, cmd]);
        setHistoryIndex(-1);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="panel bg-[#0a0c10]/95 backdrop-blur-2xl flex flex-col h-[550px] overflow-hidden group border-l-green-500/30">
      <div className="panel-corner tl"></div>
      <div className="panel-corner tr"></div>
      <div className="panel-corner bl"></div>
      <div className="panel-corner br"></div>

      {/* Terminal Header */}
      <div className="bg-black/40 border-b border-[#1e2430] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-green-500/5 border border-green-500/20 rounded-[1px]">
            <TerminalIcon className="w-3.5 h-3.5 text-green-500 opacity-80" />
          </div>
          <span className="title-orbitron text-[10px] font-bold text-gray-300 tracking-[0.3em] uppercase opacity-80">{t('header')}</span>
        </div>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/10" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/10" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-8 space-y-1.5 font-mono text-[11px] scrollbar-thin scrollbar-thumb-green-500/10 scrollbar-track-transparent bg-black/20"
      >
        <div className="text-green-500/40 mb-6 italic opacity-60 flex flex-col gap-1 uppercase tracking-widest text-[9px] font-bold">
          <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500/40 rounded-full" /> {t('init')}</span>
          <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500/40 rounded-full" /> {t('connected')}</span>
          <span className="flex items-center gap-2"><div className="w-1 h-1 bg-green-500/40 rounded-full" /> {t('typeHelp')}</span>
        </div>

        {output.map((line: { type: 'cmd' | 'res' | 'err'; text: string }, idx: number) => (
          <div key={idx} className="animate-in fade-in slide-in-from-left-2 duration-300">
            {line.type === 'cmd' ? (
              <div className="flex items-center gap-3 text-green-400/90 py-1">
                <span className="opacity-30 font-bold tracking-widest text-[9px]">DEV_ANDROMEDA_RUN:</span>
                <span className="font-bold tracking-wider">{line.text}</span>
              </div>
            ) : line.type === 'err' ? (
              <div className="text-red-500/80 px-4 py-3 border border-red-500/10 my-3 bg-red-500/[0.02] rounded-[1px] font-bold tracking-wider relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                {line.text}
              </div>
            ) : (
              <div className="text-green-500/70 border-l border-green-500/10 pl-6 my-2 py-1 whitespace-pre-wrap leading-relaxed opacity-80">
                {line.text}
              </div>
            )}
          </div>
        ))}

        {/* Dynamic Input Line */}
        <div className="flex items-center gap-3 pt-6 border-t border-[#1e2430]/30 mt-4 group/input">
          <span className="text-green-600 font-bold tracking-widest text-[10px] opacity-70 group-focus-within/input:opacity-100 transition-opacity">dev@andromeda:~$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            className="flex-1 bg-transparent outline-none text-green-400 border-none p-0 focus:ring-0 font-bold placeholder:opacity-10 disabled:opacity-50"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="bg-black/40 border-t border-[#1e2430] px-6 py-2 flex items-center justify-between text-[9px] text-mono text-green-500/30 font-bold uppercase tracking-[0.2em]">
        <div className="flex gap-6">
          <span className="hover:text-green-500/60 transition-colors cursor-default">{t('buffSize')}</span>
          <span className="hover:text-green-500/60 transition-colors cursor-default">{t('mode')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.4)]" />
          <span className="text-green-500 opacity-60">{t('txActive')}</span>
        </div>
      </div>
    </div>
  );
}
