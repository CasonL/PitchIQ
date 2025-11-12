export enum IntakeState {
  INTRO = "INTRO",
  ASK_PRODUCT = "ASK_PRODUCT", 
  ASK_AUDIENCE = "ASK_AUDIENCE",
  CONFIRM = "CONFIRM",
  DONE = "DONE"
}

export type LeadSpec = { product: string; audience: string };

export type IntakeContext = {
  state: IntakeState;
  product?: string;
  audience?: string;
  lastUserUtterance?: string;
};

export const initialContext: IntakeContext = { state: IntakeState.INTRO };

export function nextAgentLine(ctx: IntakeContext): string {
  switch (ctx.state) {
    case IntakeState.INTRO:
      return "Hey, I'm Sam. Let's get you set up.";
    case IntakeState.ASK_PRODUCT:
      return "First, what do you sell?";
    case IntakeState.ASK_AUDIENCE:
      return "Great. And who do you sell to?";
    case IntakeState.CONFIRM:
      return `Perfect. You sell ${ctx.product} to ${ctx.audience}.`;
    default:
      return "";
  }
}

export function advance(ctx: IntakeContext): IntakeContext {
  switch (ctx.state) {
    case IntakeState.INTRO:
      return { ...ctx, state: IntakeState.ASK_PRODUCT };
    case IntakeState.ASK_PRODUCT:
      return { ...ctx, state: IntakeState.ASK_AUDIENCE };
    case IntakeState.ASK_AUDIENCE:
      return { ...ctx, state: IntakeState.CONFIRM };
    case IntakeState.CONFIRM:
      return { ...ctx, state: IntakeState.DONE };
    default:
      return ctx;
  }
}
