'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section role="alert"><h1>We couldn’t load this page</h1><p>Please try again. For local assistance, call 211.</p><button onClick={reset}>Try again</button></section>; }
