'use client';
import { useState } from 'react';
import DashboardUnified from '@/components/layout/DashboardUnified';
import { Shield, Zap, Code, Terminal, ChevronRight, Copy, Check, Lock, Globe, Database, Activity } from 'lucide-react';

const FREE_KEY = 'ac_93261294471ff237e02ff9d135c9a0593b319b9a941faab5a175e7cdb046baaa';
const PRO_KEY = 'ac_a393f74185eb71154b293185f43f310b0a5727be9870c459d379171769051b49';
const ENTERPRISE_KEY = 'ac_06defb36fb7c5e8950a44ac02969966c48d0ebef2a90ba8743407b579430c791';

const DEMO_DID = 'did:andromeda:optimism:did:pkh:eip155:10:0x47c88bb92b409ff25f6587ea611fac4e55f76007';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 text-gray-600 hover:text-reactor-cyan transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative bg-black/60 border border-[#1e2430] rounded-[2px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2430] bg-black/40">
        <span className="text-[9px] text-mono text-gray-600 uppercase tracking-widest">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-[11px] font-mono text-gray-300 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

function EndpointBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'text-green-400 border-green-500/30 bg-green-500/5',
    POST: 'text-reactor-cyan border-reactor-cyan/30 bg-reactor-cyan/5',
    DELETE: 'text-red-400 border-red-500/30 bg-red-500/5',
  };
  return (
    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold border rounded-[1px] uppercase ${colors[method] || colors.GET}`}>
      {method}
    </span>
  );
}

const endpoints = [
  {
    id: 'verify',
    method: 'GET',
    path: '/api/reputation/verify/{did}',
    title: 'Verify Builder Reputation',
    description: 'Returns AVIP score, trust level and verification summary for any DID. Ideal for quick reputation checks before onboarding a contractor or displaying a trust badge.',
    plan: 'free',
    useCases: ['LinkedIn: Show verified badge on profile', 'Upwork: Pre-screen contractors', 'Fiverr: Display trust score on gig'],
    params: [
      { name: 'did', in: 'path', required: true, description: 'Builder DID (did:andromeda:{chain}:{address})' },
      { name: 'x-api-key', in: 'header', required: true, description: 'Your Andromeda API key' },
    ],
    response: `{
  "success": true,
  "did": "did:andromeda:optimism:...",
  "reputation": {
    "avipScore": 78,
    "trustLevel": "GOLD",
    "verificationRate": 100,
    "totalMilestones": 6,
    "verifiedMilestones": 6,
    "ecosystems": ["optimism"],
    "lastVerified": "2026-04-01T17:06:07.000Z"
  },
  "meta": {
    "poweredBy": "Andromeda Core AVIP v2.0"
  }
}`,
    example: `curl -X GET \\
  "https://andromeda-core.vercel.app/api/reputation/verify/${DEMO_DID}" \\
  -H "x-api-key: ${FREE_KEY}"`,
  },
  {
    id: 'score',
    method: 'GET',
    path: '/api/reputation/score/{did}',
    title: 'Full AVIP Score Breakdown',
    description: 'Complete reputation analysis with component breakdown, activity timeline, ecosystem performance and trust scores per milestone. Enterprise-grade data for deep builder vetting.',
    plan: 'pro',
    useCases: ['Background check platforms', 'DAO contributor vetting', 'DeFi protocol access control', 'Web3 HR platforms'],
    params: [
      { name: 'did', in: 'path', required: true, description: 'Builder DID' },
      { name: 'x-api-key', in: 'header', required: true, description: 'Pro or Enterprise API key' },
    ],
    response: `{
  "reputation": {
    "avipScore": 78,
    "trustLevel": "GOLD",
    "components": {
      "verificationScore": { "value": 70, "max": 70 },
      "ecosystemDiversity": { "value": 5, "max": 20 },
      "volumeScore": { "value": 3, "max": 10 }
    },
    "ecosystems": {
      "optimism": { "total": 6, "verified": 6, "rate": 100 }
    },
    "timeline": [...],
    "standard": "AVIP v2.0"
  }
}`,
    example: `curl -X GET \\
  "https://andromeda-core.vercel.app/api/reputation/score/${DEMO_DID}" \\
  -H "x-api-key: ${ENTERPRISE_KEY}"`,
  },
  {
    id: 'telemetry',
    method: 'GET',
    path: '/api/intelligence/telemetry',
    title: 'Ecosystem Telemetry',
    description: 'Real-time ecosystem health data across all integrated chains. Builder counts, proposal volumes, verification rates and API status.',
    plan: 'free',
    useCases: ['Ecosystem dashboards', 'DAO analytics', 'Chain comparison tools'],
    params: [],
    response: `{
  "telemetry": {
    "ecosystems": {
      "rootstock": { "builders": 100, "proposals": 11 },
      "arbitrum": { "builders": 0, "proposals": 21 },
      "optimism": { "builders": 0, "proposals": 21 }
    },
    "dataSources": {
      "totalMilestones": 55,
      "uniqueBuilders": 18,
      "verifiedCount": 54
    }
  }
}`,
    example: `curl -X GET \\
  "https://andromeda-core.vercel.app/api/intelligence/telemetry"`,
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    requests: '1,000 req/month',
    color: 'border-gray-700',
    accent: 'text-gray-400',
    endpoints: ['/api/reputation/verify', '/api/intelligence/telemetry'],
    features: ['Basic reputation verification', 'Ecosystem telemetry', 'Community support'],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    requests: '10,000 req/month',
    color: 'border-reactor-cyan/40',
    accent: 'text-reactor-cyan',
    highlight: true,
    endpoints: ['/api/reputation/verify', '/api/reputation/score', '/api/intelligence/*'],
    features: ['Full AVIP score breakdown', 'Activity timeline', 'Webhook notifications', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    requests: 'Unlimited',
    color: 'border-yellow-500/40',
    accent: 'text-yellow-400',
    endpoints: ['All endpoints'],
    features: ['Unlimited requests', 'Dedicated API key', 'SLA guarantee', 'Custom integrations', 'White-label option'],
  },
];

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState('verify');
  const active = endpoints.find(e => e.id === activeEndpoint) || endpoints[0];

  return (
    <DashboardUnified>
      <div className="max-w-[1400px] mx-auto space-y-12 pb-20">

        {/* Header */}
        <header className="border-b border-[#1e2430] pb-10">
          <div className="flex items-center gap-3 text-reactor-cyan/50 text-[10px] font-mono tracking-[0.4em] mb-4 uppercase">
            <span className="px-2 py-0.5 bg-reactor-cyan/10 border border-reactor-cyan/20 rounded-[1px]">API REFERENCE v1.0</span>
            <span className="w-1 h-1 bg-reactor-cyan/30 rounded-full" />
            <span>AVIP v2.0 STANDARD</span>
          </div>
          <h1 className="title-orbitron text-4xl font-bold mb-4">
            Andromeda Core <span className="text-reactor-cyan">API</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
            Portable, verifiable reputation for the decentralized web. Integrate AVIP scores into any platform — LinkedIn, Upwork, Fiverr, or your own DAO tooling.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { icon: Shield, label: '54/55 milestones verified' },
              { icon: Globe, label: '4 ecosystems integrated' },
              { icon: Zap, label: '<200ms response time' },
              { icon: Database, label: 'MongoDB + Supabase' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-[#1e2430] rounded-[1px]">
                <Icon className="w-3 h-3 text-reactor-cyan" />
                <span className="text-[10px] font-mono text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Authentication */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-4 h-4 text-reactor-cyan" />
            <h2 className="title-orbitron text-lg font-bold text-gray-200">Authentication</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <p className="text-gray-500 text-sm leading-relaxed">
                Include your API key in the <code className="text-reactor-cyan bg-reactor-cyan/10 px-1 rounded">x-api-key</code> header or as an <code className="text-reactor-cyan bg-reactor-cyan/10 px-1 rounded">api_key</code> query parameter.
              </p>
              <div className="space-y-2">
                {[
                  { plan: 'Free', key: FREE_KEY.slice(0, 20) + '...' },
                  { plan: 'Pro', key: PRO_KEY.slice(0, 20) + '...' },
                  { plan: 'Enterprise', key: ENTERPRISE_KEY.slice(0, 20) + '...' },
                ].map(({ plan, key }) => (
                  <div key={plan} className="flex items-center justify-between p-3 bg-black/40 border border-[#1e2430] rounded-[1px]">
                    <span className="text-[10px] font-mono text-gray-600 uppercase">{plan}</span>
                    <code className="text-[10px] font-mono text-reactor-cyan/70">{key}</code>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock lang="bash" code={`# Header (recommended)
curl -H "x-api-key: ac_your_key_here" \\
  https://andromeda-core.vercel.app/api/reputation/verify/{did}

# Query parameter
curl "https://andromeda-core.vercel.app/api/reputation/verify/{did}?api_key=ac_your_key_here"`} />
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-4 h-4 text-reactor-cyan" />
            <h2 className="title-orbitron text-lg font-bold text-gray-200">Endpoints</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="space-y-2">
              {endpoints.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setActiveEndpoint(ep.id)}
                  className={`w-full text-left p-3 rounded-[2px] border transition-all ${
                    activeEndpoint === ep.id
                      ? 'border-reactor-cyan/40 bg-reactor-cyan/5'
                      : 'border-[#1e2430] hover:border-gray-700 bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <EndpointBadge method={ep.method} />
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-[1px] border ${
                      ep.plan === 'free' ? 'text-gray-500 border-gray-700' :
                      ep.plan === 'pro' ? 'text-reactor-cyan border-reactor-cyan/30' :
                      'text-yellow-400 border-yellow-500/30'
                    }`}>{ep.plan}</span>
                  </div>
                  <p className="text-[10px] font-mono text-gray-400 truncate">{ep.path}</p>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div className="lg:col-span-3 space-y-4">
              <div className="p-4 bg-black/40 border border-[#1e2430] rounded-[2px]">
                <div className="flex items-center gap-3 mb-2">
                  <EndpointBadge method={active.method} />
                  <code className="text-sm font-mono text-reactor-cyan">{active.path}</code>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{active.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {active.useCases.map(uc => (
                    <span key={uc} className="px-2 py-1 bg-reactor-cyan/5 border border-reactor-cyan/10 text-[9px] font-mono text-reactor-cyan/60 rounded-[1px]">
                      {uc}
                    </span>
                  ))}
                </div>
              </div>

              {active.params.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Parameters</h4>
                  <div className="space-y-2">
                    {active.params.map(p => (
                      <div key={p.name} className="flex items-start gap-4 p-3 bg-black/20 border border-[#1e2430] rounded-[1px]">
                        <code className="text-[10px] font-mono text-reactor-cyan min-w-[120px]">{p.name}</code>
                        <span className="text-[9px] font-mono text-gray-600 uppercase">{p.in}</span>
                        {p.required && <span className="text-[9px] font-mono text-red-400">required</span>}
                        <span className="text-[10px] text-gray-500 flex-1">{p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Example Request</h4>
                <CodeBlock lang="bash" code={active.example} />
              </div>

              <div>
                <h4 className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Response</h4>
                <CodeBlock lang="json" code={active.response} />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-4 h-4 text-reactor-cyan" />
            <h2 className="title-orbitron text-lg font-bold text-gray-200">Pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.name} className={`relative p-6 bg-black/40 border rounded-[2px] ${plan.color} ${plan.highlight ? 'shadow-[0_0_30px_rgba(0,212,255,0.05)]' : ''}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-reactor-cyan text-black text-[9px] font-mono font-bold uppercase rounded-[1px]">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`title-orbitron text-sm font-bold mb-2 ${plan.accent}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono text-white">{plan.price}</span>
                    <span className="text-gray-600 text-sm font-mono">{plan.period}</span>
                  </div>
                  <p className={`text-[10px] font-mono mt-1 ${plan.accent}`}>{plan.requests}</p>
                </div>
                <div className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <ChevronRight className={`w-3 h-3 ${plan.accent}`} />
                      <span className="text-[11px] text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-[#1e2430]">
                  <p className="text-[9px] font-mono text-gray-700 uppercase tracking-widest mb-2">Endpoints</p>
                  {plan.endpoints.map(e => (
                    <code key={e} className="block text-[9px] font-mono text-gray-600 mb-1">{e}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integration examples */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Code className="w-4 h-4 text-reactor-cyan" />
            <h2 className="title-orbitron text-lg font-bold text-gray-200">Integration Examples</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-3">JavaScript / Node.js</h3>
              <CodeBlock lang="javascript" code={`const response = await fetch(
  'https://andromeda-core.vercel.app/api/reputation/verify/' +
  encodeURIComponent(builderDid),
  { headers: { 'x-api-key': process.env.ANDROMEDA_API_KEY } }
);

const { reputation } = await response.json();

if (reputation.trustLevel === 'GOLD' || 
    reputation.trustLevel === 'PLATINUM') {
  // Show verified badge
  displayTrustBadge(reputation.avipScore);
}`} />
            </div>
            <div>
              <h3 className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-3">Python</h3>
              <CodeBlock lang="python" code={`import requests

def verify_builder(did: str, api_key: str):
    url = f"https://andromeda-core.vercel.app/api/reputation/verify/{did}"
    headers = {"x-api-key": api_key}
    
    r = requests.get(url, headers=headers)
    data = r.json()
    
    return {
        "score": data["reputation"]["avipScore"],
        "level": data["reputation"]["trustLevel"],
        "verified": data["reputation"]["verificationRate"]
    }`} />
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="p-8 border border-reactor-cyan/20 bg-reactor-cyan/5 rounded-[2px] text-center">
          <h3 className="title-orbitron text-xl font-bold mb-2">Ready to integrate?</h3>
          <p className="text-gray-500 text-sm mb-6">Contact us for enterprise pricing or to get your API key.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:api@andromeda.computer" className="px-6 py-2 bg-reactor-cyan text-black text-[10px] font-mono font-bold uppercase tracking-widest rounded-[1px] hover:bg-cyan-400 transition-colors">
              Get API Key
            </a>
            <a href="/es/coordination" className="px-6 py-2 border border-reactor-cyan/30 text-reactor-cyan text-[10px] font-mono font-bold uppercase tracking-widest rounded-[1px] hover:bg-reactor-cyan/10 transition-colors">
              Try Live Demo
            </a>
          </div>
        </section>

      </div>
    </DashboardUnified>
  );
}
