type Listener = () => void;

class AuthEvents {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('[AuthEvents] Listener callback error:', e);
      }
    });
  }
}

export const authEvents = new AuthEvents();
