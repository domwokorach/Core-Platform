<#import "template.ftl" as layout>
<#macro pwfield id label autocomplete errorKey>
    <div class="finix-field">
        <label for="${id}">${label}</label>
        <div class="finix-pw" dir="ltr">
            <input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required <#if messagesPerField.existsError(errorKey)>aria-invalid="true" aria-describedby="${id}-error"</#if> />
            <button type="button" class="finix-toggle" aria-label="${msg("showPassword")}" aria-controls="${id}" aria-pressed="false"
                    data-label-show="${msg("showPassword")}" data-label-hide="${msg("hidePassword")}">
                <svg class="eye" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg class="eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5.6 19 2 12 2 12a18 18 0 0 1 5.1-5.9M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
            </button>
        </div>
        <#if messagesPerField.existsError(errorKey)><p id="${id}-error" class="finix-error" role="alert">${kcSanitize(messagesPerField.get(errorKey))?no_esc}</p></#if>
    </div>
</#macro>
<#macro attr a>
    <#assign t = (a.name == "email")?then("email", "text")>
    <div class="finix-field">
        <label for="${a.name}">${advancedMsg(a.displayName!'')?no_esc}</label>
        <input id="${a.name}" name="${a.name}" type="${t}" value="${(a.value!'')}" autocomplete="${a.autocomplete!''}" required <#if a.name == "email">inputmode="email" autocapitalize="none" spellcheck="false"</#if>
               <#if messagesPerField.existsError(a.name)>aria-invalid="true" aria-describedby="${a.name}-error"</#if> />
        <#if messagesPerField.existsError(a.name)><p id="${a.name}-error" class="finix-error" role="alert">${kcSanitize(messagesPerField.get(a.name))?no_esc}</p></#if>
    </div>
</#macro>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayInfo=true; section>
    <#if section = "header">${msg("registerHeading")}
    <#elseif section = "form">
        <p class="finix-lede">Join FINIX and start managing your financial world with confidence.</p>
        <form id="kc-register-form" class="finix-form finix-register-form" action="${url.registrationAction}" method="post" novalidate>
            <#-- any attribute we do not lay out explicitly (e.g. username when it is not the email) -->
            <#list profile.attributes as a><#if !["firstName","lastName","email","termsAccepted"]?seq_contains(a.name) && !(a.name == "username" && realm.registrationEmailAsUsername)><@attr a/></#if></#list>
            <div class="finix-name-row">
                <#list profile.attributes as a><#if a.name == "firstName"><@attr a/></#if></#list>
                <#list profile.attributes as a><#if a.name == "lastName"><@attr a/></#if></#list>
            </div>
            <#list profile.attributes as a><#if a.name == "email"><@attr a/></#if></#list>
            <@pwfield "password" msg("password") "new-password" "password"/>
            <p class="finix-hint" id="pw-hint" data-min="${properties.passwordMinLength!'10'}">Use at least ${properties.passwordMinLength!'10'} characters. A longer phrase is stronger.</p>
            <div class="finix-meter" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <@pwfield "password-confirm" msg("passwordConfirm") "new-password" "password-confirm"/>
            <div class="finix-field finix-terms">
                <label class="finix-check"><input type="checkbox" id="termsAccepted" name="termsAccepted" value="true" required <#if messagesPerField.existsError('termsAccepted')>aria-invalid="true" aria-describedby="termsAccepted-error"</#if>/>
                    <span>I agree to the <a href="${properties.appUrl!''}/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="${properties.appUrl!''}/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
                <#if messagesPerField.existsError('termsAccepted')><p id="termsAccepted-error" class="finix-error" role="alert">Please agree to the Terms of Service and Privacy Policy to continue.</p></#if>
            </div>
            <button id="kc-register" type="submit" class="finix-submit" data-busy-label="Creating your account..."><span class="lbl">Create Account</span><span class="spin" aria-hidden="true"></span><span class="busy-text" aria-live="polite"></span></button>
        </form>
    <#elseif section = "info">
        <p class="finix-register">Already have an account? <a href="${url.loginUrl}">Sign in</a></p>
    </#if>
</@layout.registrationLayout>
