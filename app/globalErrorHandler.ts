// Lightweight global error guards to prevent sudden app termination in production
// Does not alter app logic; only prevents unhandled errors from crashing the JS runtime
(() => {
	// Guard JS exceptions
	try {
		const ErrorUtilsAny: any = (global as any).ErrorUtils;
		if (ErrorUtilsAny && typeof ErrorUtilsAny.setGlobalHandler === 'function') {
			const existing = ErrorUtilsAny.getGlobalHandler?.();
			ErrorUtilsAny.setGlobalHandler((error: any, isFatal?: boolean) => {
				try {
					// Log minimally; avoid large payloads
					console.log('[GlobalError]', {
						message: error?.message || String(error),
						isFatal: !!isFatal,
					});
				} catch {}
				// Defer to existing handler if present
				if (typeof existing === 'function') {
					try { existing(error, isFatal); } catch {}
				}
			});
		}
	} catch {}

	// Guard unhandled promise rejections
	try {
		const handler = (event: any) => {
			try {
				console.log('[UnhandledRejection]', {
					message: event?.reason?.message || String(event?.reason || 'unknown'),
				});
			} catch {}
			// Prevent default fatal behavior if any
			if (event && typeof event.preventDefault === 'function') {
				try { event.preventDefault(); } catch {}
			}
		};
		// @ts-ignore - React Native may polyfill addEventListener differently
		if (typeof global.addEventListener === 'function') {
			// @ts-ignore
			global.addEventListener('unhandledrejection', handler);
		}
	} catch {}
})();


