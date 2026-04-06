import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/locales';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always'
});

// WAF Threat Patterns
const THREAT_PATTERNS = {
    SQL_INJECTION: /('|"|--|;|\/\*|\*\/|@@|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b|\btruncate\b|\bexec\b|\bcast\b|\bdeclare\b)/i,
    XSS: /(<script.*?>|javascript:|on\w+\s*=)/i,
    DIR_TRAVERSAL: /(\.\.\/|\.\.\\)/
};

function isThreat(str: string): boolean {
    return Object.values(THREAT_PATTERNS).some(pattern => pattern.test(decodeURIComponent(str)));
}

export default function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Skip WAF for the blocked page itself to avoid loops
    if (pathname.includes('/blocked')) {
        return intlMiddleware(request);
    }

    // Scan Query Parameters and Pathname
    const hasThreat = isThreat(pathname) || isThreat(search);

    if (hasThreat) {
        console.warn(`[WAF] Threat detected in request: ${pathname}${search}`);
        // Redirect to /blocked with the current locale
        const locale = pathname.split('/')[1] || defaultLocale;
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/blocked`;
        url.search = ''; // Clear malicious search params
        return NextResponse.redirect(url);
    }

    // Add a WAF-Status header to request for internal audit
    request.headers.set('x-andromeda-waf', 'shielded');

    // If clean, proceed to i18n middleware
    const response = intlMiddleware(request);
    
    // Add the same header to response for browser awareness
    response.headers.set('x-andromeda-waf', 'shielded');
    
    return response;
}

export const config = {
    // Match all paths except Static, Assets, and Next internals
    matcher: ['/((?!_next/static|_next/image|assets|favicon.ico|sw.js).*)']
};

