<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=true displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <p class="finix-lede">Enter your details to securely access your FINIX dashboard.</p>
        <#if realm.password>
            <form id="kc-form-login" class="finix-form" action="${url.loginAction}" method="post" novalidate>
                <#assign hasError = messagesPerField.existsError('username','password')>
                <#if !usernameHidden??>
                    <div class="finix-field">
                        <label for="username">${msg("usernameOrEmail")}</label>
                        <input id="username" name="username" type="text" value="${(login.username!'')}" <#if !(hasError && (login.username!'')?has_content)>autofocus</#if> autocomplete="username" dir="ltr"
                               placeholder="name@example.com" required aria-invalid="${hasError?c}" <#if hasError>aria-describedby="login-error"</#if> />
                    </div>
                </#if>
                <div class="finix-field">
                    <label for="password">${msg("password")}</label>
                    <div class="finix-pw" dir="ltr">
                        <input id="password" name="password" type="password" autocomplete="current-password" <#if hasError && (login.username!'')?has_content>autofocus</#if> placeholder="Enter your password" required aria-invalid="${hasError?c}" <#if hasError>aria-describedby="login-error"</#if> />
                        <button type="button" class="finix-toggle" aria-label="${msg("showPassword")}" aria-controls="password" aria-pressed="false"
                                data-label-show="${msg("showPassword")}" data-label-hide="${msg("hidePassword")}">
                            <svg class="eye" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg class="eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5.6 19 2 12 2 12a18 18 0 0 1 5.1-5.9M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="finix-row">
                    <#if realm.rememberMe && !usernameHidden??>
                        <label class="finix-check"><input id="rememberMe" name="rememberMe" type="checkbox" <#if login.rememberMe??>checked</#if>/> ${msg("rememberMe")}</label>
                    <#else><span></span></#if>
                    <#if realm.resetPasswordAllowed><a href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a></#if>
                </div>
                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                <button id="kc-login" name="login" type="submit" class="finix-submit"><span class="lbl">${msg("doLogIn")}</span><span class="spin" aria-hidden="true"></span></button>
            </form>
            <#-- Development-only helper card. Empty in this shipped theme; the separate finix-dev theme overrides it. -->
            <#include "dev-credentials.ftl">
        </#if>
    <#elseif section = "info">
        <p class="finix-register">${msg("noAccount")} <a href="${url.registrationUrl}">${msg("doRegister")}</a></p>
    </#if>
</@layout.registrationLayout>
