const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const HAS_BACKEND = !!(import.meta.env.VITE_API_BASE_URL);

/** Convert a caught error to a user-visible string, enriching the message
 *  when running in demo mode without a backend configured. */
export function toUserError(err: unknown, fallback = 'An error occurred'): string {
  if (IS_DEMO && !HAS_BACKEND) {
    return 'No backend connected. Deploy the backend and add VITE_API_BASE_URL to the repository secrets to enable this feature.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
