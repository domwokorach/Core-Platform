<#-- Shown only when ALL hold: this dev theme is active (devCredentialsPreview=true) and the page is served from localhost or 127.0.0.1. -->
<#if (properties.devCredentialsPreview!'false') == 'true' && (url.loginAction?starts_with('http://localhost:') || url.loginAction?starts_with('http://127.0.0.1:'))>
<section class="finix-dev" aria-labelledby="finix-dev-title">
    <div class="finix-dev-head">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v7.3a2 2 0 0 1-.3 1L4 19.5A1.5 1.5 0 0 0 5.3 22h13.4a1.5 1.5 0 0 0 1.3-2.5l-5.7-9.2a2 2 0 0 1-.3-1V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
        <h2 id="finix-dev-title">Development Account</h2>
        <span class="finix-dev-tag">Local only</span>
    </div>
    <p class="finix-dev-text">Use these credentials to explore the FINIX development banking dashboard.</p>
    <dl class="finix-dev-list">
        <div class="finix-dev-row">
            <dt>Username</dt>
            <dd><code>${kcSanitize(properties.devUsername)?no_esc}</code></dd>
            <button type="button" class="finix-copy" data-copy="${kcSanitize(properties.devUsername)?no_esc}" data-what="Username" aria-label="Copy username">
                <svg class="i-copy" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>
                <svg class="i-done" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>
            </button>
        </div>
        <div class="finix-dev-row">
            <dt>Password</dt>
            <dd><code>${kcSanitize(properties.devPassword)?no_esc}</code></dd>
            <button type="button" class="finix-copy" data-copy="${kcSanitize(properties.devPassword)?no_esc}" data-what="Password" aria-label="Copy password">
                <svg class="i-copy" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>
                <svg class="i-done" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>
            </button>
        </div>
    </dl>
    <button type="button" class="finix-dev-fill" data-fill-user="${kcSanitize(properties.devUsername)?no_esc}" data-fill-pass="${kcSanitize(properties.devPassword)?no_esc}">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        Use demo credentials
    </button>
    <p class="finix-dev-status" role="status" aria-live="polite"></p>
    <p class="finix-dev-foot">Fictional development account. It fills the form only: you still sign in through Keycloak.</p>
</section>
</#if>
