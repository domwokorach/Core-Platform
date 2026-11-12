
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}"<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}" dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/favicon.svg" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <script src="${url.resourcesPath}/js/menu-button-links.js" type="module"></script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling(
          "${url.ssoLoginInOtherTabsUrl?no_esc}"
        );
    </script>
</head>

<body class="${properties.kcBodyClass!}">
<#-- Expired authentication session: Keycloak would silently re-use the old authorization request. Hand the visitor back to FINIX instead,
     which shows the expired state and starts a brand-new request (fresh state, nonce and PKCE) only when they choose to. No auto-retry. -->
<#if message?has_content && message.summary?has_content && message.summary == msg("loginTimeout")>
  <script>window.location.replace("${(properties.appUrl!'')?js_string}/login?error=timeout");</script>
  <noscript><p style="padding:24px;font-family:sans-serif">Your sign-in session has expired. <a href="${(properties.appUrl!'')}/login?error=timeout">Try signing in again</a></p></noscript>
<#else>
<div class="finix-page">
  <aside class="finix-hero" aria-label="About FINIX">
    <div class="hero-grid" aria-hidden="true"></div><div class="hero-glow" aria-hidden="true"></div>
    <a class="finix-brand" href="${properties.appUrl!'/'}" aria-label="FINIX home"><img src="${url.resourcesPath}/img/logo.svg" alt="" width="40" height="40"/><span>FINIX</span></a>
    <div class="hero-copy">
      <h2 class="hero-title">Banking made beautifully simple.</h2>
      <p class="hero-text">Your finances, beautifully organised. Experience effortless control, real-time insights and a smarter way to manage your money.</p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="art-card art-light">
        <svg class="art-geo" viewBox="0 0 200 120" fill="none" stroke="#a3a3a3" stroke-width="1"><circle cx="150" cy="30" r="64"/><circle cx="150" cy="30" r="44"/><circle cx="150" cy="30" r="24"/><path d="M0 100 L200 40 M0 118 L200 58" stroke="#d4d4d4"/></svg>
        <div class="art-top"><span class="art-word">FINIX</span><span class="art-label">GBP</span></div>
        <div class="art-bottom"><span class="art-label">Savings account</span><span class="art-num">•••• 2093</span></div>
      </div>
      <div class="art-card art-dark">
        <svg class="art-geo" viewBox="0 0 200 120" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"><path d="M0 20H200M0 40H200M0 60H200M0 80H200M0 100H200M20 0V120M60 0V120M100 0V120M140 0V120M180 0V120"/></svg>
        <div class="art-top"><span class="art-word">FINIX</span><span class="art-label">GBP</span></div>
        <svg class="art-spark" viewBox="0 0 160 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 32 L24 26 L44 30 L68 16 L92 20 L116 8 L158 12"/></svg>
        <div class="art-bottom"><span class="art-label">Everyday account</span><span class="art-num">•••• 4821</span></div>
      </div>
      <div class="art-pill art-pill-1">Fictional demo card</div>
    </div>
    <p class="hero-foot"><span>Secure</span><i></i><span>Simple</span><i></i><span>Modern</span><em>Modern banking. Thoughtfully designed.</em></p>
  </aside>
  <main class="finix-panel">
    <div class="finix-panel-inner">
      <div class="finix-card">
        <header>
          <#if realm.internationalizationEnabled && locale.supported?size gt 1>
            <div class="finix-locale"><#list locale.supported as l><a href="${l.url}">${l.label}</a><#sep> · </#list></div>
          </#if>
          <p class="finix-eyebrow">Welcome back</p>
          <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <h1 id="kc-page-title"><#nested "header"></h1>
          <#else>
            <#nested "show-username">
            <div id="kc-username" class="finix-attempted"><span id="kc-attempted-username">${auth.attemptedUsername}</span><a id="reset-login" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a></div>
          </#if>
        </header>
        <div id="kc-content"><div id="kc-content-wrapper">
          <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <#-- Sign-in failures (incorrect credentials, expired attempt, lock-out, unverified email) share one calm red alert; everything else (e.g. "reset email sent") stays neutral.
                 The copy comes from the real Keycloak message key, so each variant only appears for the matching authentication state. -->
            <#-- the verification notice is guidance, not a sign-in failure -->
            <#if (message.type == 'error' || message.type == 'warning') && message.summary != msg("verifyEmailMessage")>
              <div id="login-error" class="finix-alert finix-alert-error" role="alert" aria-live="assertive">
                <svg class="finix-alert-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <div class="finix-alert-body"><p class="finix-alert-title">${msg("signInErrorTitle")}</p><p class="finix-alert-text">${kcSanitize(message.summary)?no_esc}</p></div>
              </div>
            <#else>
              <div class="finix-alert finix-alert-${message.type}" role="status" aria-live="polite">${kcSanitize(message.summary)?no_esc}</div>
            </#if>
          </#if>
          <#nested "form">
          <#if auth?has_content && auth.showTryAnotherWayLink()>
            <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
              <input type="hidden" name="tryAnotherWay" value="on"/>
              <a href="#" id="try-another-way" onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">${msg("doTryAnotherWay")}</a>
            </form>
          </#if>
          <#nested "socialProviders">
          <#if displayInfo><div id="kc-info"><div id="kc-info-wrapper"><#nested "info"></div></div></#if>
        </div></div>
      </div>
      <p class="finix-assure"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Your password is only ever entered on this secure FINIX page.</p>
      <nav class="finix-links" aria-label="Legal"><span>© FINIX</span><a href="${properties.appUrl!''}/privacy">Privacy Policy</a><a href="${properties.appUrl!''}/terms">Terms of Service</a></nav>
    </div>
  </main>
</div>
</#if>
</body>
</html>
</#macro>
