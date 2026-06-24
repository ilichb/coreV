export interface MessageContext {
  wallet: string;
  balance: number;
  daysInactive: number;
  lastStakeActivity: string;
  projectedYield?: number;
  recommendedBuilders?: Array<{ name: string; category: string; address: string }>;
}

export type MessageVariant = 'control' | 'treatment' | 'vip';

export interface RenderedMessage {
  subject: string;
  body: string;
  variant: MessageVariant;
  platform: 'email';
}

function shortWallet(w: string): string {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

// ── CONTROL (A) — Minimal, informational, no CTA ────────────────────────────

const controlEnSubject = () => 'RIF Staking Activity Report';

const controlEnBody = (ctx: MessageContext) =>
  `Your RIF staking position (${ctx.balance.toLocaleString()} RIF) has been inactive since ${ctx.lastStakeActivity} (${ctx.daysInactive} days). This is an automated notification from the Rootstock Collective staking monitoring system.

No action is required. This message is sent for informational purposes only.

— Rootstock Collective`;

const controlEsSubject = () => 'Reporte de Actividad de Staking RIF';

const controlEsBody = (ctx: MessageContext) =>
  `Tu posición de staking de RIF (${ctx.balance.toLocaleString()} RIF) ha estado inactiva desde ${ctx.lastStakeActivity} (${ctx.daysInactive} días). Esta es una notificación automática del sistema de monitoreo de staking de Rootstock Collective.

No se requiere acción. Este mensaje se envía solo con fines informativos.

— Rootstock Collective`;

// ── TREATMENT (B) — Re-engagement with CTA + yield projection + builders ────

const treatmentEnSubject = (ctx: MessageContext) =>
  ctx.projectedYield
    ? `Your ${ctx.balance.toLocaleString()} RIF could have earned ~${Math.round(ctx.projectedYield).toLocaleString()} RIF in rewards`
    : `Your ${ctx.balance.toLocaleString()} RIF could be earning rewards`;

const treatmentEnBody = (ctx: MessageContext) => {
  const lines: string[] = [
    `Your RIF staking position (${ctx.balance.toLocaleString()} RIF) has been inactive for ${ctx.daysInactive} days (last activity: ${ctx.lastStakeActivity}).`,
    '',
  ];

  if (ctx.projectedYield && ctx.projectedYield > 0) {
    lines.push(
      `During your ${ctx.daysInactive} days of inactivity, your position could have earned approximately ${Math.round(ctx.projectedYield).toLocaleString()} RIF in staking rewards.`,
      '',
    );
  }

  lines.push(
    'The Rootstock ecosystem has grown significantly — new opportunities for stakers with competitive rewards are available.',
    '',
  );

  if (ctx.recommendedBuilders && ctx.recommendedBuilders.length > 0) {
    const builderList = ctx.recommendedBuilders
      .map(b => `  • ${b.name} (${b.category})`)
      .join('\n');
    lines.push(
      `Active builders you could support by staking your RIF:\n${builderList}`,
      '',
    );
  }

  lines.push(
    'Returning is simple:',
    '1. Visit https://collective.rootstock.io',
    `2. Connect your wallet (${shortWallet(ctx.wallet)})`,
    '3. Stake your RIF',
    '',
    'Most stakers return to active within 7 days of being notified. Don\'t miss out on rewards.',
    '',
    '— Rootstock Collective',
  );

  return lines.join('\n');
};

const treatmentEsSubject = (ctx: MessageContext) =>
  ctx.projectedYield
    ? `Tus ${ctx.balance.toLocaleString()} RIF podrían haber generado ~${Math.round(ctx.projectedYield).toLocaleString()} RIF en recompensas`
    : `Tus ${ctx.balance.toLocaleString()} RIF podrían estar generando recompensas`;

const treatmentEsBody = (ctx: MessageContext) => {
  const lines: string[] = [
    `Tu posición de staking de RIF (${ctx.balance.toLocaleString()} RIF) ha estado inactiva por ${ctx.daysInactive} días (última actividad: ${ctx.lastStakeActivity}).`,
    '',
  ];

  if (ctx.projectedYield && ctx.projectedYield > 0) {
    lines.push(
      `Durante tus ${ctx.daysInactive} días de inactividad, tu posición podría haber generado aproximadamente ${Math.round(ctx.projectedYield).toLocaleString()} RIF en recompensas de staking.`,
      '',
    );
  }

  lines.push(
    'El ecosistema Rootstock ha crecido significativamente — nuevas oportunidades para stakers con recompensas competitivas están disponibles.',
    '',
  );

  if (ctx.recommendedBuilders && ctx.recommendedBuilders.length > 0) {
    const builderList = ctx.recommendedBuilders
      .map(b => `  • ${b.name} (${b.category})`)
      .join('\n');
    lines.push(
      `Builders activos que podrías respaldar al hacer stake de tus RIF:\n${builderList}`,
      '',
    );
  }

  lines.push(
    'Volver es simple:',
    '1. Visitá https://collective.rootstock.io',
    `2. Conectá tu wallet (${shortWallet(ctx.wallet)})`,
    '3. Stakeá tus RIF',
    '',
    'La mayoría de los stakers vuelven a estar activos dentro de los 7 días de ser notificados. No te pierdas las recompensas.',
    '',
    '— Rootstock Collective',
  );

  return lines.join('\n');
};

// ── VIP — Personalized for significant holders ──────────────────────────────

const vipEnSubject = (ctx: MessageContext) =>
  `Important: Your ${ctx.balance.toLocaleString()} RIF position requires attention`;

const vipEnBody = (ctx: MessageContext) => {
  const lines: string[] = [
    `As a significant RIF holder (${ctx.balance.toLocaleString()} RIF), your participation is valuable to the Rootstock ecosystem. Your position has been inactive for ${ctx.daysInactive} days (last activity: ${ctx.lastStakeActivity}).`,
    '',
  ];

  if (ctx.projectedYield && ctx.projectedYield > 0) {
    lines.push(
      `During this period, your position could have earned approximately ${Math.round(ctx.projectedYield).toLocaleString()} RIF in staking rewards.`,
      '',
    );
  }

  if (ctx.recommendedBuilders && ctx.recommendedBuilders.length > 0) {
    const builderList = ctx.recommendedBuilders
      .map(b => `  • ${b.name} (${b.category})`)
      .join('\n');
    lines.push(
      `We have identified high-performing builders that could benefit from your stake:\n${builderList}`,
      '',
    );
  }

  lines.push(
    "We'd like to ensure you have the information needed to make the best decision for your stake. The team at Rootstock Collective is available to assist you directly.",
    '',
    'Please reply to this message or visit https://collective.rootstock.io to reconnect with the ecosystem.',
    '',
    '— Rootstock Collective Team',
  );

  return lines.join('\n');
};

const vipEsSubject = (ctx: MessageContext) =>
  `Importante: Tu posición de ${ctx.balance.toLocaleString()} RIF requiere atención`;

const vipEsBody = (ctx: MessageContext) => {
  const lines: string[] = [
    `Como tenedor significativo de RIF (${ctx.balance.toLocaleString()} RIF), tu participación es valiosa para el ecosistema Rootstock. Tu posición ha estado inactiva por ${ctx.daysInactive} días (última actividad: ${ctx.lastStakeActivity}).`,
    '',
  ];

  if (ctx.projectedYield && ctx.projectedYield > 0) {
    lines.push(
      `Durante este período, tu posición podría haber generado aproximadamente ${Math.round(ctx.projectedYield).toLocaleString()} RIF en recompensas de staking.`,
      '',
    );
  }

  if (ctx.recommendedBuilders && ctx.recommendedBuilders.length > 0) {
    const builderList = ctx.recommendedBuilders
      .map(b => `  • ${b.name} (${b.category})`)
      .join('\n');
    lines.push(
      `Hemos identificado builders de alto rendimiento que podrían beneficiarse de tu stake:\n${builderList}`,
      '',
    );
  }

  lines.push(
    'Queremos asegurarnos de que tengas la información necesaria para tomar la mejor decisión para tu stake. El equipo de Rootstock Collective está disponible para asistirte directamente.',
    '',
    'Por favor respondé a este mensaje o visitá https://collective.rootstock.io para reconectarte con el ecosistema.',
    '',
    '— Equipo de Rootstock Collective',
  );

  return lines.join('\n');
};

// ── Builder ─────────────────────────────────────────────────────────────────

export function buildMessage(ctx: MessageContext, variant: MessageVariant, lang: 'en' | 'es' = 'en'): RenderedMessage {
  switch (variant) {
    case 'control':
      return {
        subject: lang === 'es' ? controlEsSubject() : controlEnSubject(),
        body: lang === 'es' ? controlEsBody(ctx) : controlEnBody(ctx),
        variant: 'control',
        platform: 'email',
      };
    case 'treatment':
      return {
        subject: lang === 'es' ? treatmentEsSubject(ctx) : treatmentEnSubject(ctx),
        body: lang === 'es' ? treatmentEsBody(ctx) : treatmentEnBody(ctx),
        variant: 'treatment',
        platform: 'email',
      };
    case 'vip':
      return {
        subject: lang === 'es' ? vipEsSubject(ctx) : vipEnSubject(ctx),
        body: lang === 'es' ? vipEsBody(ctx) : vipEnBody(ctx),
        variant: 'vip',
        platform: 'email',
      };
  }
}
