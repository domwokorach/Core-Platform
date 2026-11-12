<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">${msg("emailForgotTitle")}
    <#elseif section = "form">
        <p class="finix-lede">${msg("emailInstruction")}</p>
        <form id="kc-reset-password-form" class="finix-form" action="${url.loginAction}" method="post" novalidate>
            <div class="finix-field">
                <label for="username">${msg("usernameOrEmail")}</label>
                <input id="username" name="username" type="text" autofocus value="${(auth.attemptedUsername!'')}" aria-invalid="${messagesPerField.existsError('username')?c}" />
                <#if messagesPerField.existsError('username')><p class="finix-error" role="alert">${kcSanitize(messagesPerField.get('username'))?no_esc}</p></#if>
            </div>
            <button type="submit" class="finix-submit"><span class="lbl">${msg("doSubmit")}</span><span class="spin" aria-hidden="true"></span></button>
        </form>
    <#elseif section = "info">
        <p class="finix-register"><a href="${url.loginUrl}">&larr; ${msg("backToLogin")}</a></p>
    </#if>
</@layout.registrationLayout>
