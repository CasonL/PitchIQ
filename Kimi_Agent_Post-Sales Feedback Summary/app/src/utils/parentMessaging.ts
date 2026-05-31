export type ParentAction = 'exit' | 'try-again' | 'signup';

const PATHS: Record<ParentAction, string> = {
  'exit': '/demo',
  'try-again': '/demo',
  'signup': '/signup',
};

export function notifyParent(action: ParentAction) {
  try {
    window.top.location.href = PATHS[action];
  } catch {
    console.log('Could not navigate parent, action:', action);
  }
}
