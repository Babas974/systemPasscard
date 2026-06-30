package com.appcollege

import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Proxy
import java.net.URI
import java.util.concurrent.TimeUnit

class NoProxyOkHttpClientFactory : OkHttpClientFactory {
    override fun createNewNetworkModuleClient(): OkHttpClient {
        val baseBuilder = OkHttpClientProvider.createClientBuilder()
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .connectTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .protocols(listOf(Protocol.HTTP_1_1, Protocol.HTTP_2))
            .proxy(Proxy.NO_PROXY)

        baseBuilder.proxySelector(object : java.net.ProxySelector() {
            override fun select(uri: URI): List<Proxy> {
                val host = uri.host ?: return listOf(Proxy.NO_PROXY)
                if (isLocalAddress(host)) {
                    return listOf(Proxy.NO_PROXY)
                }
                val sysProxy = java.net.ProxySelector.getDefault()?.select(uri)
                if (!sysProxy.isNullOrEmpty()) {
                    return sysProxy
                }
                return listOf(Proxy.NO_PROXY)
            }

            override fun connectFailed(uri: URI?, sa: java.net.SocketAddress?, ioe: java.io.IOException?) {
            }

            private fun isLocalAddress(host: String): Boolean {
                if (host == "localhost" || host == "127.0.0.1" || host == "::1") return true
                if (host.startsWith("192.168.")) return true
                if (host.startsWith("10.")) return true
                if (host.startsWith("172.")) {
                    val second = host.split(".").getOrNull(1)?.toIntOrNull() ?: 0
                    if (second in 16..31) return true
                }
                return false
            }
        })

        val client = baseBuilder.build()
        val container = NoPersistCookieJarContainer()
        container.setCookieJar(okhttp3.CookieJar.NO_COOKIES)

        return client.newBuilder()
            .cookieJar(container)
            .build()
    }
}
