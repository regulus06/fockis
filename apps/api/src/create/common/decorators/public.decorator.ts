import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication.
 * Used for public template browsing endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
