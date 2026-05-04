/**
 * Rootstock Builders Registry
 * 
 * Fuente: https://app.rootstockcollective.xyz/builders
 * Datos verificados on-chain via Tally/Rootstock Collective DAO.
 * 
 * Este archivo enriquece los datos del subgraph (que solo devuelve addresses)
 * con metadatos públicos de las propuestas de aprobación de builders.
 * 
 * NO reemplaza datos en vivo — actúa como capa de identidad sobre las addresses.
 * Los scores y allocations siempre vienen del subgraph en tiempo real.
 */

export interface RootstockBuilderMeta {
  address: string;          // lowercase, fuente de verdad
  name: string;             // nombre público del builder
  category: string;         // categoría del proyecto
  approvedAt: string;       // fecha de aprobación en gobernanza
  votesFor: number;         // votos a favor en la propuesta
  votesAgainst: number;     // votos en contra
  quorum: number;           // quorum requerido
  proposalId?: string;      // ID de la propuesta on-chain
  description?: string;     // descripción corta del proyecto
  discourseUrl?: string;    // link al foro de gobernanza
}

export const ROOTSTOCK_BUILDERS_REGISTRY: RootstockBuilderMeta[] = [
  {
    address: '0x1da45683bd3ccd6f8308050d0d99c1ee7f761e5f',
    name: 'Wesatoshis Labs',
    category: 'Infrastructure',
    approvedAt: '2025-02-06',
    votesFor: 768772,
    votesAgainst: 0,
    quorum: 335743,
    proposalId: '2346822967666279313258658351324490042989647343776490366187124933070210525784',
  },
  {
    address: '0x1d1114666d0f21e479c122c138a527dfbc0f2d00',
    name: 'OpenOcean',
    category: 'DeFi',
    approvedAt: '2024-11-01',
    votesFor: 323377,
    votesAgainst: 0,
    quorum: 265353,
    discourseUrl: 'https://gov.rootstockcollective.xyz',
  },
  {
    address: '0x9763146dd94e0e6fd96ca88839e88ebda34a7f94',
    name: 'Tropykus',
    category: 'DeFi',
    approvedAt: '2024-12-12',
    votesFor: 1766955,
    votesAgainst: 14477,
    quorum: 279363,
  },
  {
    address: '0x9dfa9dfd15d2b2fa9717b4fc545c2bb35a29215c',
    name: 'WakeUp Labs',
    category: 'Infrastructure',
    approvedAt: '2024-11-21',
    votesFor: 626647,
    votesAgainst: 1174,
    quorum: 269220,
  },
  {
    address: '0x6731b962e7fd2b1ec731bb17be3b8b3544e18896',
    name: 'Boltz',
    category: 'Bridge',
    approvedAt: '2024-11-01',
    votesFor: 287072,
    votesAgainst: 0,
    quorum: 265353,
  },
  {
    address: '0x97054841be83be01871484d485ba85fbe39980db',
    name: 'SimpleFi',
    category: 'DeFi',
    approvedAt: '2025-02-17',
    votesFor: 856441,
    votesAgainst: 450,
    quorum: 426692,
    proposalId: '51225244232108987298399961212743745933812504286690360778036393411270277343484',
  },
  {
    address: '0xd9db26176dd2a905aaf9213581366a5bb3913573',
    name: 'Steer Protocol',
    category: 'DeFi',
    approvedAt: '2025-06-30',
    votesFor: 1127822,
    votesAgainst: 0,
    quorum: 783884,
  },
  {
    address: '0x9684fe1ec8829f72c9b6f4cf2ca81a1a81e8bff0',
    name: 'Vottun',
    category: 'Infrastructure',
    approvedAt: '2025-06-10',
    votesFor: 0,
    votesAgainst: 0,
    quorum: 0,
    proposalId: '1378256853286212607164752901967425247008656012142168021449477937577358387247',
  },
  {
    address: '0x99e4694991830b757ead5562c2abf23f5448daa5',
    name: 'DZap.io',
    category: 'DeFi',
    approvedAt: '2025-03-24',
    votesFor: 837711,
    votesAgainst: 0,
    quorum: 574812,
    proposalId: '6037411281445291420396205914793160689997156363681052608215757299560251451013',
  },
  {
    address: '0x797e2cd952df539ccfea5554911afeb2a77fb760',
    name: 'Sailing Protocol',
    category: 'DeFi',
    approvedAt: '2025-03-07',
    votesFor: 883073,
    votesAgainst: 0,
    quorum: 490610,
    proposalId: '26889163011606081797603027707006153112788617655800999430291811398770672335887',
  },
  {
    address: '0xa42279209e7cc8da94dd3653fd7d8ac1ac744ada',
    name: 'Beexo Wallet',
    category: 'Wallet',
    approvedAt: '2025-11-11',
    votesFor: 2511428,
    votesAgainst: 0,
    quorum: 1073599,
    proposalId: '113141716346378883461766133137938667138370126945514816841855152270562976317556',
    description: 'Mobile wallet bringing Rootstock to everyday life with DeFi and CeFi features.',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/beexo-wallet-the-mobile-standard-for-rootstock-adoption/575',
  },
  {
    address: '0x920a531871f524f49c4346b2528260ff152d3c4e',
    name: 'Tally',
    category: 'Governance',
    approvedAt: '2025-08-15',
    votesFor: 1248208,
    votesAgainst: 0,
    quorum: 1004142,
    proposalId: '20334724607873707248076103578917452376811310518488125687276809244443587444635',
    description: 'Onchain governance platform — operates the Rootstock Collective.',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2503-collective-rewards-tally/269',
  },
  {
    address: '0x7c5d5222f60853159bbdcc058088587618d61b24',
    name: 'Symbiosis',
    category: 'Bridge',
    approvedAt: '2025-06-16',
    votesFor: 1450230,
    votesAgainst: 101,
    quorum: 766297,
    proposalId: '72518420458809035698080136606384420085978657953135434932432275448795118766285',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/symbiosis-collective-rewards/406',
  },
  {
    address: '0x9a9db4f6fd7525a5bb0422ec46264361371786c9',
    name: 'LayerBank',
    category: 'DeFi',
    approvedAt: '2025-06-13',
    votesFor: 1466759,
    votesAgainst: 0,
    quorum: 785209,
    proposalId: '65098186889616686802422726215337955603275714763197223785747127796021569041283',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2506-collective-rewards-layerbank/449',
  },
  {
    address: '0x9de55cc674ad3bcad89e4be68d9933fd382f2595',
    name: 'Router Protocol',
    category: 'Bridge',
    approvedAt: '2025-03-19',
    votesFor: 730647,
    votesAgainst: 0,
    quorum: 527375,
    proposalId: '33501039038870858422661527233580223332140595309619884830308249043467692371494',
    description: 'Cross-chain infrastructure enabling trustless transfers across 35+ blockchains.',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2503-collective-rewards-router-pay-by-router-protocol/284',
  },
  {
    address: '0xd9fcae4315920387f00725c78285d6d41c30b967',
    name: 'Asami Club',
    category: 'Social',
    approvedAt: '2025-02-21',
    votesFor: 961998,
    votesAgainst: 0,
    quorum: 471093,
    proposalId: '115726215485073491923251601420766987728342440694531113732171007869913820173502',
    description: 'Marketing and growth platform distributing ASAMI tokens to backers.',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2502-builder-activation-asami-club-marketing-and-growth/244',
  },
  {
    address: '0x665078db7ee465b49d4f56f2acacc903f62623f2',
    name: 'MoneyOnChain',
    category: 'DeFi',
    approvedAt: '2024-11-06',
    votesFor: 644108,
    votesAgainst: 0,
    quorum: 265811,
    proposalId: '79064871042700820567687871074046998335498929156208091040263469230747016849801',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2410-builder-activation-moneyonchain-stablecoin-protocol/102/1',
  },
  {
    address: '0x2953336c73ba33f9c1791031cf95a412e217a295',
    name: 'WoodSwap',
    category: 'DeFi',
    approvedAt: '2024-11-02',
    votesFor: 157255,
    votesAgainst: 1174,
    quorum: 265437,
    proposalId: '47914720788969863842595776779283109393845469108744830341240178642093333540096',
    discourseUrl: 'https://gov.rootstockcollective.xyz/t/2410-builder-activation-woodswap/95',
  },
];

/**
 * Lookup por address — O(1)
 */
const _index = new Map<string, RootstockBuilderMeta>(
  ROOTSTOCK_BUILDERS_REGISTRY.map(b => [b.address.toLowerCase(), b])
);

export function getRootstockBuilderMeta(address: string): RootstockBuilderMeta | null {
  return _index.get(address.toLowerCase()) || null;
}
