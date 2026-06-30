package com.appcollege

import com.facebook.react.modules.network.CookieJarContainer
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

class NoPersistCookieJarContainer : CookieJarContainer {

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {}
    override fun loadForRequest(url: HttpUrl): List<Cookie> = emptyList()
    override fun setCookieJar(cookieJar: CookieJar) {}
    override fun removeCookieJar() {}
}
