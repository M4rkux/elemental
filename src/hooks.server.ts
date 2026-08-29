import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

/**
 * Anonymous player identity. Every visitor gets a random id in an httpOnly
 * cookie on first request; campaign progress is stored server-side against it
 * (see src/lib/server/progress.ts). There's no login — clearing cookies or
 * switching browser starts a fresh campaign, same as the old localStorage.
 */
const COOKIE = 'eid';
const FIVE_YEARS = 60 * 60 * 24 * 365 * 5;

export const handle: Handle = async ({ event, resolve }) => {
	let id = event.cookies.get(COOKIE);
	if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
		id = crypto.randomUUID();
		event.cookies.set(COOKIE, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: FIVE_YEARS
		});
	}
	event.locals.playerId = id;
	return resolve(event);
};
